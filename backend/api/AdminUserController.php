<?php

/**
 * Administrator user management.
 *
 * Reuses the existing `user` / `user_profile` tables and the existing bearer
 * token — there is no second user store and no second authentication path here.
 * Roles remain what they have always been: a JSON array on user.roles.
 *
 * SECURITY
 *   Every method starts with requireAdmin(), the same guard SpecialtyController
 *   uses. Nothing in this class is reachable by a non-admin, and index.php
 *   registers no route that bypasses it.
 *
 *   Three self-protection rules stop an administrator from locking everyone,
 *   including themselves, out of the system:
 *     - you cannot delete or deactivate your own account;
 *     - you cannot change your own role;
 *     - you cannot remove the last remaining active administrator.
 *   These are enforced here, on the server, not in the browser.
 *
 * DELETION
 *   Soft only. See 2026_08_11_admin_user_management.sql for why a hard DELETE
 *   would cascade through appointments and medical reports.
 */
class AdminUserController
{
    /** The four roles the platform recognises, UI value => stored role. */
    private const ROLE_MAP = [
        'patient'   => 'ROLE_PATIENT',
        'doctor'    => 'ROLE_DOCTOR',
        'secretary' => 'ROLE_SECRETARY',
        'admin'     => 'ROLE_ADMIN',
    ];

    private const STATUSES = ['active', 'inactive'];

    private const MIN_PASSWORD_LENGTH = 6;

    private const PAGE_SIZE = 20;

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // GET /api/admin/users[?q=&role=&status=&page=]
    // =========================================================================
    public function index(array $query): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $where  = ['u.deleted_at IS NULL'];
        $params = [];

        $rawQ = $query['q'] ?? null;
        if (is_string($rawQ) && trim($rawQ) !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], trim($rawQ)) . '%';
            $where[]  = '(u.name LIKE ? OR u.email LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }

        $role = $query['role'] ?? null;
        if (is_string($role) && $role !== '' && $role !== 'all') {
            if (!isset(self::ROLE_MAP[$role])) {
                return ['success' => false, 'error' => 'Unknown role filter.'];
            }
            // roles is a JSON array; JSON_CONTAINS avoids the false positives a
            // LIKE '%ROLE_ADMIN%' would give on any future role sharing a prefix.
            $where[]  = 'JSON_CONTAINS(u.roles, ?)';
            $params[] = json_encode(self::ROLE_MAP[$role]);
        }

        $status = $query['status'] ?? null;
        if (is_string($status) && $status !== '' && $status !== 'all') {
            if (!in_array($status, self::STATUSES, true)) {
                return ['success' => false, 'error' => 'Unknown status filter.'];
            }
            $where[]  = 'u.status = ?';
            $params[] = $status;
        }

        $whereSql = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM `user` u WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $page   = max(1, (int) ($query['page'] ?? 1));
        $offset = ($page - 1) * self::PAGE_SIZE;

        $stmt = $this->db->prepare(
            "SELECT u.id, u.name, u.email, u.roles, u.status, u.is_verified,
                    u.created_at, u.last_login_at
               FROM `user` u
              WHERE {$whereSql}
              ORDER BY u.created_at DESC, u.id DESC
              LIMIT ? OFFSET ?"
        );
        $stmt->execute([...$params, self::PAGE_SIZE, $offset]);

        return [
            'success'  => true,
            'users'    => array_map([$this, 'shapeUser'], $stmt->fetchAll()),
            'total'    => $total,
            'page'     => $page,
            'pageSize' => self::PAGE_SIZE,
        ];
    }

    // =========================================================================
    // GET /api/admin/roles
    //
    // The four roles the platform recognises, with live user counts.
    //
    // There is no role or permission table to read from and none is introduced
    // here: a role IS the value stored in user.roles, so the counts are derived
    // straight from that column. Anything else would be a second source of
    // truth that could disagree with what actually grants access.
    // =========================================================================
    public function roles(array $query): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $roles = [];
        foreach (self::ROLE_MAP as $key => $storedRole) {
            $stmt = $this->db->prepare(
                "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'active'   THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive
                   FROM `user`
                  WHERE deleted_at IS NULL
                    AND JSON_CONTAINS(roles, ?)"
            );
            $stmt->execute([json_encode($storedRole)]);
            $row = $stmt->fetch();

            $roles[] = [
                'key'        => $key,
                'label'      => strtoupper($key),
                'storedRole' => $storedRole,
                'total'      => (int) ($row['total'] ?? 0),
                'active'     => (int) ($row['active'] ?? 0),
                'inactive'   => (int) ($row['inactive'] ?? 0),
            ];
        }

        return ['success' => true, 'roles' => $roles];
    }

    // =========================================================================
    // GET /api/admin/users/get?id=12
    // =========================================================================
    public function show(array $query): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($query['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid user id is required.'];
        }

        $stmt = $this->db->prepare(
            "SELECT u.id, u.name, u.email, u.roles, u.status, u.is_verified,
                    u.created_at, u.last_login_at,
                    p.phone, p.avatar_url, p.date_of_birth, p.gender,
                    p.specialty_id, s.name AS specialty, p.license_number,
                    p.bio, p.clinic_name, p.clinic_address, p.department
               FROM `user` u
               LEFT JOIN user_profile p ON p.user_id = u.id
               LEFT JOIN specialty    s ON s.id = p.specialty_id
              WHERE u.id = ? AND u.deleted_at IS NULL"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if ($row === false) {
            return ['success' => false, 'error' => 'User not found.', 'status' => 404];
        }

        $user = $this->shapeUser($row);
        $user['profile'] = [
            'phone'         => $row['phone'],
            'avatarUrl'     => $row['avatar_url'],
            'dateOfBirth'   => $row['date_of_birth'],
            'gender'        => $row['gender'],
            'specialtyId'   => $row['specialty_id'] !== null ? (int) $row['specialty_id'] : null,
            'specialty'     => $row['specialty'],
            'licenseNumber' => $row['license_number'],
            'bio'           => $row['bio'],
            'clinicName'    => $row['clinic_name'],
            'clinicAddress' => $row['clinic_address'],
            'department'    => $row['department'],
        ];

        return ['success' => true, 'user' => $user];
    }

    // =========================================================================
    // POST /api/admin/users/create
    //   { name, email, password, role, status? }
    // =========================================================================
    public function create(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 255) {
            return ['success' => false, 'error' => 'Name is required (max 255 characters).'];
        }

        $email = trim((string) ($data['email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 180) {
            return ['success' => false, 'error' => 'A valid email address is required.'];
        }

        $password = (string) ($data['password'] ?? '');
        if (strlen($password) < self::MIN_PASSWORD_LENGTH) {
            return [
                'success' => false,
                'error'   => 'Password must be at least ' . self::MIN_PASSWORD_LENGTH . ' characters.',
            ];
        }

        $role = $this->cleanRole($data['role'] ?? null);
        if ($role === null) {
            return ['success' => false, 'error' => 'Role must be one of: patient, doctor, secretary, admin.'];
        }

        $status = $this->cleanStatus($data['status'] ?? 'active');
        if ($status === null) {
            return ['success' => false, 'error' => 'Status must be active or inactive.'];
        }

        // Distinguish a live clash from a soft-deleted one, otherwise the admin
        // is told the address is taken with no way to see by what.
        $existing = $this->db->prepare('SELECT id, deleted_at FROM `user` WHERE email = ?');
        $existing->execute([$email]);
        $clash = $existing->fetch();
        if ($clash !== false) {
            return [
                'success' => false,
                'error'   => $clash['deleted_at'] === null
                    ? 'An account with this email already exists.'
                    : 'This email belongs to a deleted account and cannot be reused.',
            ];
        }

        // Created by an administrator, so the address is taken as trusted and
        // the account skips the email-verification step.
        $stmt = $this->db->prepare(
            "INSERT INTO `user` (email, password, name, roles, is_verified, status, created_at)
             VALUES (?, ?, ?, ?, 1, ?, NOW())"
        );
        $stmt->execute([
            $email,
            password_hash($password, PASSWORD_BCRYPT),
            $name,
            json_encode([$role]),
            $status,
        ]);

        return [
            'success' => true,
            'message' => 'User created.',
            'user'    => $this->fetchShaped((int) $this->db->lastInsertId()),
        ];
    }

    // =========================================================================
    // POST /api/admin/users/update
    //   { id, name?, email?, role?, status?, password? }
    //
    // One endpoint for the edit form. Role and status changes go through the
    // same self-protection checks as the dedicated endpoints below.
    // =========================================================================
    public function update(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid user id is required.'];
        }

        $target = $this->fetchUser($id);
        if ($target === null) {
            return ['success' => false, 'error' => 'User not found.', 'status' => 404];
        }

        $columns = [];
        $values  = [];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '' || mb_strlen($name) > 255) {
                return ['success' => false, 'error' => 'Name is required (max 255 characters).'];
            }
            $columns[] = 'name = ?';
            $values[]  = $name;
        }

        if (array_key_exists('email', $data)) {
            $email = trim((string) $data['email']);
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 180) {
                return ['success' => false, 'error' => 'A valid email address is required.'];
            }
            if (strcasecmp($email, (string) $target['email']) !== 0) {
                $dup = $this->db->prepare('SELECT id FROM `user` WHERE email = ? AND id <> ?');
                $dup->execute([$email, $id]);
                if ($dup->fetchColumn() !== false) {
                    return ['success' => false, 'error' => 'Another account already uses this email.'];
                }
            }
            $columns[] = 'email = ?';
            $values[]  = $email;
        }

        if (array_key_exists('password', $data) && (string) $data['password'] !== '') {
            $password = (string) $data['password'];
            if (strlen($password) < self::MIN_PASSWORD_LENGTH) {
                return [
                    'success' => false,
                    'error'   => 'Password must be at least ' . self::MIN_PASSWORD_LENGTH . ' characters.',
                ];
            }
            $columns[] = 'password = ?';
            $values[]  = password_hash($password, PASSWORD_BCRYPT);
            $columns[] = 'password_changed_at = NOW()';
        }

        if (array_key_exists('role', $data)) {
            $role = $this->cleanRole($data['role']);
            if ($role === null) {
                return ['success' => false, 'error' => 'Role must be one of: patient, doctor, secretary, admin.'];
            }
            if ($role !== $this->primaryRole($target)) {
                if ($guard = $this->guardRoleChange($adminId, $id, $target, $role)) {
                    return $guard;
                }
                $columns[] = 'roles = ?';
                $values[]  = json_encode([$role]);
            }
        }

        if (array_key_exists('status', $data)) {
            $status = $this->cleanStatus($data['status']);
            if ($status === null) {
                return ['success' => false, 'error' => 'Status must be active or inactive.'];
            }
            if ($status !== (string) $target['status']) {
                if ($guard = $this->guardDeactivation($adminId, $id, $target, $status)) {
                    return $guard;
                }
                $columns[] = 'status = ?';
                $values[]  = $status;
            }
        }

        if ($columns === []) {
            return ['success' => true, 'message' => 'Nothing to update.', 'user' => $this->fetchShaped($id)];
        }

        $columns[] = 'updated_at = NOW()';
        $values[]  = $id;

        $stmt = $this->db->prepare('UPDATE `user` SET ' . implode(', ', $columns) . ' WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute($values);

        return ['success' => true, 'message' => 'User updated.', 'user' => $this->fetchShaped($id)];
    }

    // =========================================================================
    // POST /api/admin/users/role   { id, role }
    // =========================================================================
    public function changeRole(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid user id is required.'];
        }

        $role = $this->cleanRole($data['role'] ?? null);
        if ($role === null) {
            return ['success' => false, 'error' => 'Role must be one of: patient, doctor, secretary, admin.'];
        }

        $target = $this->fetchUser($id);
        if ($target === null) {
            return ['success' => false, 'error' => 'User not found.', 'status' => 404];
        }

        if ($guard = $this->guardRoleChange($adminId, $id, $target, $role)) {
            return $guard;
        }

        $stmt = $this->db->prepare('UPDATE `user` SET roles = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([json_encode([$role]), $id]);

        return ['success' => true, 'message' => 'Role updated.', 'user' => $this->fetchShaped($id)];
    }

    // =========================================================================
    // POST /api/admin/users/status   { id, status }
    // =========================================================================
    public function changeStatus(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid user id is required.'];
        }

        $status = $this->cleanStatus($data['status'] ?? null);
        if ($status === null) {
            return ['success' => false, 'error' => 'Status must be active or inactive.'];
        }

        $target = $this->fetchUser($id);
        if ($target === null) {
            return ['success' => false, 'error' => 'User not found.', 'status' => 404];
        }

        if ($guard = $this->guardDeactivation($adminId, $id, $target, $status)) {
            return $guard;
        }

        $stmt = $this->db->prepare('UPDATE `user` SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$status, $id]);

        return [
            'success' => true,
            'message' => $status === 'active' ? 'User activated.' : 'User deactivated.',
            'user'    => $this->fetchShaped($id),
        ];
    }

    // =========================================================================
    // POST /api/admin/users/delete   { id }
    //
    // Soft delete. The row and everything referencing it stay intact.
    // =========================================================================
    public function delete(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid user id is required.'];
        }

        if ($id === $adminId) {
            return [
                'success' => false,
                'error'   => 'You cannot delete your own account.',
                'status'  => 403,
            ];
        }

        $target = $this->fetchUser($id);
        if ($target === null) {
            return ['success' => false, 'error' => 'User not found.', 'status' => 404];
        }

        // Only an active administrator can be the last one holding the door
        // open; deleting an already-deactivated admin changes nothing.
        if ($this->isAdminRow($target)
            && (string) $target['status'] === 'active'
            && $this->activeAdminCount() <= 1
        ) {
            return [
                'success' => false,
                'error'   => 'This is the last active administrator and cannot be deleted.',
                'status'  => 403,
            ];
        }

        // Deactivated at the same time so that every existing status check in
        // the codebase treats a deleted account as out of service, even where
        // deleted_at is not consulted.
        $stmt = $this->db->prepare(
            "UPDATE `user`
                SET deleted_at = NOW(), status = 'inactive', updated_at = NOW()
              WHERE id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$id]);

        return ['success' => true, 'message' => 'User deleted.', 'id' => $id];
    }

    // =========================================================================
    // Self-protection guards
    // =========================================================================

    /** @return array|null An error array to return as-is, or null to proceed. */
    private function guardRoleChange(int $adminId, int $targetId, array $target, string $newRole): ?array
    {
        if ($targetId === $adminId) {
            return [
                'success' => false,
                'error'   => 'You cannot change your own role.',
                'status'  => 403,
            ];
        }

        // Demoting the only active admin would leave the platform with no one
        // able to administer it. Only an ACTIVE admin counts here: demoting an
        // already-deactivated administrator does not change how many working
        // administrators remain, so blocking it would be a false positive.
        if ($this->isAdminRow($target)
            && (string) $target['status'] === 'active'
            && $newRole !== 'ROLE_ADMIN'
            && $this->activeAdminCount() <= 1
        ) {
            return [
                'success' => false,
                'error'   => 'This is the last active administrator and cannot be demoted.',
                'status'  => 403,
            ];
        }

        return null;
    }

    /** @return array|null An error array to return as-is, or null to proceed. */
    private function guardDeactivation(int $adminId, int $targetId, array $target, string $newStatus): ?array
    {
        if ($newStatus === 'active') {
            return null;
        }

        if ($targetId === $adminId) {
            return [
                'success' => false,
                'error'   => 'You cannot deactivate your own account.',
                'status'  => 403,
            ];
        }

        // As above: an administrator who is already inactive is not propping up
        // the platform, so deactivating them again is harmless.
        if ($this->isAdminRow($target)
            && (string) $target['status'] === 'active'
            && $this->activeAdminCount() <= 1
        ) {
            return [
                'success' => false,
                'error'   => 'This is the last active administrator and cannot be deactivated.',
                'status'  => 403,
            ];
        }

        return null;
    }

    private function activeAdminCount(): int
    {
        return (int) $this->db->query(
            "SELECT COUNT(*) FROM `user`
              WHERE deleted_at IS NULL
                AND status = 'active'
                AND JSON_CONTAINS(roles, '\"ROLE_ADMIN\"')"
        )->fetchColumn();
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function fetchUser(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, email, roles, status FROM `user` WHERE id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    private function fetchShaped(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT id, name, email, roles, status, is_verified, created_at, last_login_at
               FROM `user` WHERE id = ?"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row !== false ? $this->shapeUser($row) : null;
    }

    /** DB row => the shape the admin UI consumes. */
    private function shapeUser(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'name'        => $row['name'],
            'email'       => $row['email'],
            'role'        => $this->uiRole($row),
            'roles'       => $this->decodeRoles($row),
            'status'      => $row['status'],
            'isVerified'  => (bool) $row['is_verified'],
            'createdAt'   => $row['created_at'],
            'lastLoginAt' => $row['last_login_at'],
        ];
    }

    /** @return list<string> */
    private function decodeRoles(array $row): array
    {
        $decoded = json_decode((string) $row['roles'], true);

        return is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
    }

    /** The stored role, e.g. ROLE_DOCTOR. Defaults to patient. */
    private function primaryRole(array $row): string
    {
        $roles = $this->decodeRoles($row);

        // Highest privilege wins, so a legacy multi-role row is never shown as
        // something less than what it actually grants.
        foreach (['ROLE_ADMIN', 'ROLE_SECRETARY', 'ROLE_DOCTOR', 'ROLE_PATIENT'] as $candidate) {
            if (in_array($candidate, $roles, true)) {
                return $candidate;
            }
        }

        return 'ROLE_PATIENT';
    }

    /** The lowercase role the UI uses, e.g. "doctor". */
    private function uiRole(array $row): string
    {
        $stored = $this->primaryRole($row);
        $flipped = array_flip(self::ROLE_MAP);

        return $flipped[$stored] ?? 'patient';
    }

    private function isAdminRow(array $row): bool
    {
        return in_array('ROLE_ADMIN', $this->decodeRoles($row), true);
    }

    /** UI role name => stored role, or null when unrecognised. */
    private function cleanRole($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        return self::ROLE_MAP[strtolower(trim($value))] ?? null;
    }

    private function cleanStatus($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $status = strtolower(trim($value));

        return in_array($status, self::STATUSES, true) ? $status : null;
    }

    private function cleanId($value): ?int
    {
        if (is_int($value) && $value > 0) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
            return (int) $value;
        }

        return null;
    }

    // =========================================================================
    // Auth — the same bearer token every other controller uses.
    // =========================================================================

    /** @return int|array The admin's id, or an error array to return as-is. */
    private function requireAdmin()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $userId = (int) $m[1];

        // A suspended or deleted administrator loses access immediately, not at
        // their next sign-in.
        $stmt = $this->db->prepare(
            "SELECT roles FROM `user`
              WHERE id = ? AND deleted_at IS NULL AND status = 'active'"
        );
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $decoded = json_decode((string) $roles, true);
        if (!is_array($decoded) || !in_array('ROLE_ADMIN', $decoded, true)) {
            return ['success' => false, 'error' => 'Administrator access required.', 'status' => 403];
        }

        return $userId;
    }
}
