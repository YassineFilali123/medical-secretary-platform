<?php

class ProfileController
{
    /** Minimum length enforced on any NEW password. */
    private const MIN_PASSWORD_LENGTH = 8;

    /**
     * Whitelist: incoming JSON key => user_profile column.
     * Anything not listed here is ignored, so the client cannot
     * write to arbitrary columns.
     *
     * 'avatarUrl' is client-writable by design: the product decision is that a
     * profile picture is a link the user pastes, not an uploaded file. The value
     * is rendered as an <img src>, so validateProfileFields() restricts it to
     * http/https and 255 chars — that blocks javascript:/data: sources.
     *
     * Accepted trade-offs: the image is fetched from a third party (which sees
     * the viewer's IP; the frontend sends referrerPolicy="no-referrer"), and an
     * http:// link is blocked as mixed content on an https:// deployment.
     * Writing another user's profile is possible because `Bearer token_<id>` is
     * forgeable — that is the real defect and it is not specific to avatars.
     */
    private const PROFILE_FIELDS = [
        'phone'            => 'phone',
        'avatarUrl'        => 'avatar_url',
        'dateOfBirth'      => 'date_of_birth',
        'gender'           => 'gender',
        'bloodType'        => 'blood_type',
        'allergies'        => 'allergies',
        'emergencyContact' => 'emergency_contact',
        // Doctors pick from the Admin-managed `specialty` catalogue by id; the
        // legacy free-text `specialty` column is no longer written.
        'specialtyId'      => 'specialty_id',
        'licenseNumber'    => 'license_number',
        'bio'              => 'bio',
        'clinicName'       => 'clinic_name',
        'clinicAddress'    => 'clinic_address',
        'department'       => 'department',
    ];

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // -------------------------------------------------------------------------
    // GET /api/profile
    // Identity comes from the Authorization header, never from the query string.
    // -------------------------------------------------------------------------
    public function show(): array
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $stmt = $this->db->prepare("SELECT * FROM v_user_profile WHERE user_id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if (!$row) {
            return ['success' => false, 'error' => 'Profile not found.'];
        }

        return ['success' => true, 'profile' => $this->presentProfile($row)];
    }

    // -------------------------------------------------------------------------
    // POST /api/profile/update
    // Updates `user.name` plus any whitelisted user_profile column.
    // Email is intentionally NOT updatable here — changing it must go through
    // a verify-new-address flow, otherwise it is an account-takeover vector.
    // -------------------------------------------------------------------------
    public function update(array $data): array
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        if (array_key_exists('email', $data)) {
            $stmt = $this->db->prepare("SELECT email FROM `user` WHERE id = ?");
            $stmt->execute([$userId]);
            $currentEmail = (string) $stmt->fetchColumn();

            if (trim((string) $data['email']) !== $currentEmail) {
                return [
                    'success' => false,
                    'error'   => 'Email cannot be changed here. Use the email-change flow so the new address can be verified.',
                ];
            }
        }

        // Refuse to report success when there is nothing to write. Silently
        // "succeeding" on an empty payload hides client bugs (e.g. a body that
        // failed to parse) behind a green "Saved!" message.
        $recognised = array_key_exists('name', $data)
            || count(array_intersect_key($data, self::PROFILE_FIELDS)) > 0;

        if (!$recognised) {
            return ['success' => false, 'error' => 'No recognised fields to update.'];
        }

        $this->db->beginTransaction();

        try {
            // --- user.name ---
            if (array_key_exists('name', $data)) {
                $name = trim((string) $data['name']);
                if ($name === '') {
                    $this->db->rollBack();
                    return ['success' => false, 'error' => 'Name cannot be empty.'];
                }
                $stmt = $this->db->prepare("UPDATE `user` SET name = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$name, $userId]);
            }

            // --- user_profile.* ---
            $columns = [];
            $values  = [];
            foreach (self::PROFILE_FIELDS as $key => $column) {
                if (!array_key_exists($key, $data)) {
                    continue;
                }
                $value = $data[$key];
                if (is_string($value)) {
                    $value = trim($value);
                    if ($value === '') {
                        $value = null;
                    }
                }
                $columns[] = $column;
                $values[]  = $value;
            }

            if ($columns) {
                if ($error = $this->validateProfileFields($columns, $values)) {
                    $this->db->rollBack();
                    return ['success' => false, 'error' => $error];
                }

                // Column names come from the constant above, never from user input.
                $insertCols = array_merge(['user_id'], $columns, ['created_at']);
                $placeholders = array_merge(['?'], array_fill(0, count($columns), '?'), ['NOW()']);

                $updates = array_map(static fn(string $c): string => "`{$c}` = VALUES(`{$c}`)", $columns);
                $updates[] = '`updated_at` = NOW()';

                $sql = 'INSERT INTO `user_profile` (`' . implode('`, `', $insertCols) . '`) '
                     . 'VALUES (' . implode(', ', $placeholders) . ') '
                     . 'ON DUPLICATE KEY UPDATE ' . implode(', ', $updates);

                $stmt = $this->db->prepare($sql);
                $stmt->execute(array_merge([$userId], $values));
            }

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return array_merge(
            ['message' => 'Profile updated successfully.'],
            $this->show()
        );
    }

    // -------------------------------------------------------------------------
    // POST /api/profile/password
    // Body: { email, currentPassword, newPassword, confirmPassword? }
    //
    // Identity is proved by the CURRENT PASSWORD, so this endpoint is safe even
    // before real token auth exists — knowing the old password is the credential.
    // -------------------------------------------------------------------------
    public function changePassword(array $data): array
    {
        $email   = trim($data['email'] ?? '');
        $current = $data['currentPassword'] ?? '';
        $new     = $data['newPassword'] ?? '';
        $confirm = $data['confirmPassword'] ?? null;

        if ($email === '' || $current === '' || $new === '') {
            return ['success' => false, 'error' => 'Email, current password, and new password are required.'];
        }
        if ($confirm !== null && $confirm !== '' && !hash_equals($new, $confirm)) {
            return ['success' => false, 'error' => 'New password and confirmation do not match.'];
        }
        if (strlen($new) < self::MIN_PASSWORD_LENGTH) {
            return ['success' => false, 'error' => 'New password must be at least ' . self::MIN_PASSWORD_LENGTH . ' characters.'];
        }
        if ($new === $current) {
            return ['success' => false, 'error' => 'New password must be different from the current password.'];
        }

        $stmt = $this->db->prepare("SELECT id, password, is_verified FROM `user` WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Same message for "no such user" and "wrong password" so the endpoint
        // cannot be used to discover which emails have accounts.
        if (!$user || !password_verify($current, $user['password'])) {
            return ['success' => false, 'error' => 'Current password is incorrect.'];
        }
        if (!$user['is_verified']) {
            return ['success' => false, 'error' => 'Please verify your email before changing your password.'];
        }

        $hash = password_hash($new, PASSWORD_BCRYPT);

        $stmt = $this->db->prepare(
            "UPDATE `user`
                SET password                  = ?,
                    password_changed_at       = NOW(),
                    password_reset_token      = NULL,
                    password_reset_expires_at = NULL,
                    updated_at                = NOW()
              WHERE id = ?"
        );
        $stmt->execute([$hash, $user['id']]);

        return ['success' => true, 'message' => 'Password updated successfully.'];
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * ⚠️ PLACEHOLDER AUTH — the frontend currently mints `token_<id>` on the
     * client, so this value is trivially forgeable. It reads identity from the
     * Authorization header (not the request body) purely so that swapping in a
     * signed JWT later only requires changing this one method.
     * Replace before any real deployment.
     */
    private function currentUserId(): ?int
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return null;
        }

        return (int) $m[1];
    }

    /** @param list<string> $columns @param list<mixed> $values */
    private function validateProfileFields(array $columns, array $values): ?string
    {
        foreach ($columns as $i => $column) {
            $value = $values[$i];
            if ($value === null) {
                continue;
            }

            if ($column === 'date_of_birth') {
                $d = DateTime::createFromFormat('Y-m-d', (string) $value);
                if (!$d || $d->format('Y-m-d') !== $value) {
                    return 'Date of birth must be in YYYY-MM-DD format.';
                }
                if ($d > new DateTime('today')) {
                    return 'Date of birth cannot be in the future.';
                }
            }

            if ($column === 'gender' && !in_array($value, ['male', 'female', 'other', 'prefer_not_to_say'], true)) {
                return 'Invalid gender value.';
            }

            if ($column === 'blood_type' && !in_array($value, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], true)) {
                return 'Invalid blood type.';
            }

            if ($column === 'phone' && !preg_match('/^[0-9+()\s.-]{6,30}$/', (string) $value)) {
                return 'Invalid phone number.';
            }

            if ($column === 'specialty_id') {
                if (!is_int($value) && !(is_string($value) && ctype_digit($value))) {
                    return 'Please choose a specialty from the list.';
                }

                $specialtyId = (int) $value;

                $stmt = $this->db->prepare('SELECT is_active FROM specialty WHERE id = ?');
                $stmt->execute([$specialtyId]);
                $isActive = $stmt->fetchColumn();

                if ($isActive === false) {
                    return 'That specialty no longer exists. Please pick another from the list.';
                }

                // An inactive specialty is still accepted if the doctor already
                // has it — otherwise deactivating one would lock them out of
                // saving any other field on their profile.
                if ((int) $isActive === 0) {
                    $stmt = $this->db->prepare('SELECT specialty_id FROM user_profile WHERE user_id = ?');
                    $stmt->execute([$this->currentUserId()]);
                    if ((int) $stmt->fetchColumn() !== $specialtyId) {
                        return 'That specialty is no longer available. Please pick another from the list.';
                    }
                }
            }

            if ($column === 'avatar_url') {
                $url = (string) $value;

                // The column is VARCHAR(255); reject rather than silently truncate.
                if (strlen($url) > 255) {
                    return 'Image URL is too long (max 255 characters).';
                }
                if (!filter_var($url, FILTER_VALIDATE_URL)) {
                    return 'Image URL is not a valid URL.';
                }
                // Scheme whitelist: the value ends up in an <img src>, so refuse
                // javascript:, data:, file: and anything else exotic.
                $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
                if (!in_array($scheme, ['http', 'https'], true)) {
                    return 'Image URL must start with http:// or https://.';
                }
            }
        }

        return null;
    }

    /**
     * Re-check the stored avatar link on the way out. It was validated on write,
     * but a row could have been set by other means (direct SQL, an older build),
     * and this value goes straight into an <img src> — so refuse anything that is
     * not a plain http/https URL rather than passing it through.
     */
    private function safeAvatarUrl(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        return $url;
    }

    /** Shape the DB row into the camelCase the frontend expects. */
    private function presentProfile(array $row): array
    {
        $roles = json_decode((string) $row['roles'], true) ?: [];

        return [
            'id'                => (int) $row['user_id'],
            'name'              => $row['name'],
            'email'             => $row['email'],
            'roles'             => $roles,
            'role'              => strtolower(str_replace('ROLE_', '', $roles[0] ?? 'ROLE_PATIENT')),
            'isVerified'        => (bool) $row['is_verified'],
            'status'            => $row['status'],
            'createdAt'         => $row['created_at'],
            'lastLoginAt'       => $row['last_login_at'],
            'passwordChangedAt' => $row['password_changed_at'],
            'phone'             => $row['phone'],
            // SYNTHESISED, never read back as a stored URL string. The database
            // holds only an opaque 32-hex capability key, so no row can ever
            // become an arbitrary — or `javascript:` — <img src>. That kills the
            // poisoned-row class structurally instead of guarding it in the
            // frontend.
            'avatarUrl'         => $this->safeAvatarUrl($row['avatar_url'] ?? null),
            'dateOfBirth'       => $row['date_of_birth'],
            'gender'            => $row['gender'],
            'bloodType'         => $row['blood_type'],
            'allergies'         => $row['allergies'],
            'emergencyContact'  => $row['emergency_contact'],
            // `specialty` is the display name joined from the catalogue;
            // `specialtyId` is what the doctor's <select> binds to.
            'specialtyId'       => isset($row['specialty_id']) ? (int) $row['specialty_id'] : null,
            'specialty'         => $row['specialty'],
            'specialtyIsActive' => isset($row['specialty_is_active'])
                ? (bool) $row['specialty_is_active']
                : null,
            'licenseNumber'     => $row['license_number'],
            'bio'               => $row['bio'],
            'clinicName'        => $row['clinic_name'],
            'clinicAddress'     => $row['clinic_address'],
            'department'        => $row['department'],
        ];
    }
}
