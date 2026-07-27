<?php

/**
 * Admin-managed catalogue of medical specialties.
 *
 * Read is open to any signed-in user (the doctor profile form needs the list).
 * Every write requires the caller's role to be ROLE_ADMIN, checked against the
 * database rather than trusted from the request.
 */
class SpecialtyController
{
    private const MAX_NAME_LENGTH        = 120;
    private const MAX_DESCRIPTION_LENGTH = 255;

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // -------------------------------------------------------------------------
    // GET /api/specialties
    //
    // Doctors (and everyone else) get only ACTIVE entries — that is what the
    // profile dropdown must offer. Admins get everything plus the usage count,
    // which the admin table needs to explain why a delete is blocked.
    // -------------------------------------------------------------------------
    public function index(): array
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        if ($this->isAdmin($userId)) {
            $stmt = $this->db->query(
                "SELECT s.id, s.name, s.description, s.is_active, s.sort_order,
                        s.created_at, s.updated_at,
                        (SELECT COUNT(*) FROM user_profile p WHERE p.specialty_id = s.id) AS doctor_count
                   FROM specialty s
                  ORDER BY s.sort_order ASC, s.name ASC"
            );

            return ['success' => true, 'specialties' => array_map([$this, 'present'], $stmt->fetchAll())];
        }

        $stmt = $this->db->query(
            "SELECT id, name, description, is_active, sort_order, created_at, updated_at
               FROM specialty
              WHERE is_active = 1
              ORDER BY sort_order ASC, name ASC"
        );

        return ['success' => true, 'specialties' => array_map([$this, 'present'], $stmt->fetchAll())];
    }

    // -------------------------------------------------------------------------
    // POST /api/specialties/create   { name, description?, sortOrder? }
    // -------------------------------------------------------------------------
    public function create(array $data): array
    {
        if ($guard = $this->requireAdmin()) {
            return $guard;
        }

        $name = $this->cleanName($data['name'] ?? '');
        if (is_array($name)) {
            return $name; // validation error
        }

        $description = $this->cleanDescription($data['description'] ?? null);
        if (is_array($description)) {
            return $description;
        }

        if ($this->nameExists($name, null)) {
            return ['success' => false, 'error' => "A specialty named \"{$name}\" already exists."];
        }

        $sortOrder = $this->cleanSortOrder($data['sortOrder'] ?? null);

        $stmt = $this->db->prepare(
            "INSERT INTO specialty (name, description, is_active, sort_order, created_at)
             VALUES (?, ?, 1, ?, NOW())"
        );
        $stmt->execute([$name, $description, $sortOrder]);

        return [
            'success'   => true,
            'message'   => "\"{$name}\" added.",
            'specialty' => $this->findById((int) $this->db->lastInsertId()),
        ];
    }

    // -------------------------------------------------------------------------
    // POST /api/specialties/update   { id, name?, description?, sortOrder? }
    // -------------------------------------------------------------------------
    public function update(array $data): array
    {
        if ($guard = $this->requireAdmin()) {
            return $guard;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if (is_array($id)) {
            return $id;
        }

        $existing = $this->findById($id);
        if ($existing === null) {
            return ['success' => false, 'error' => 'Specialty not found.', 'status' => 404];
        }

        $sets   = [];
        $values = [];

        if (array_key_exists('name', $data)) {
            $name = $this->cleanName($data['name']);
            if (is_array($name)) {
                return $name;
            }
            if ($this->nameExists($name, $id)) {
                return ['success' => false, 'error' => "A specialty named \"{$name}\" already exists."];
            }
            $sets[]   = 'name = ?';
            $values[] = $name;
        }

        if (array_key_exists('description', $data)) {
            $description = $this->cleanDescription($data['description']);
            if (is_array($description)) {
                return $description;
            }
            $sets[]   = 'description = ?';
            $values[] = $description;
        }

        if (array_key_exists('sortOrder', $data)) {
            $sets[]   = 'sort_order = ?';
            $values[] = $this->cleanSortOrder($data['sortOrder']);
        }

        if (!$sets) {
            return ['success' => false, 'error' => 'Nothing to update.'];
        }

        $sets[]   = 'updated_at = NOW()';
        $values[] = $id;

        $stmt = $this->db->prepare('UPDATE specialty SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($values);

        return [
            'success'   => true,
            'message'   => 'Specialty updated.',
            'specialty' => $this->findById($id),
        ];
    }

    // -------------------------------------------------------------------------
    // POST /api/specialties/delete   { id }
    //
    // Refused while any doctor still uses it. The FK is ON DELETE RESTRICT, so
    // the database enforces this too — the check here exists to return a helpful
    // message instead of a raw constraint violation.
    // -------------------------------------------------------------------------
    public function delete(array $data): array
    {
        if ($guard = $this->requireAdmin()) {
            return $guard;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if (is_array($id)) {
            return $id;
        }

        $existing = $this->findById($id);
        if ($existing === null) {
            return ['success' => false, 'error' => 'Specialty not found.', 'status' => 404];
        }

        $inUse = $this->doctorCount($id);
        if ($inUse > 0) {
            return [
                'success'     => false,
                'error'       => sprintf(
                    'Cannot delete "%s" — %d doctor%s currently use%s it. Deactivate it instead to hide it from new selections.',
                    $existing['name'],
                    $inUse,
                    $inUse === 1 ? '' : 's',
                    $inUse === 1 ? 's' : ''
                ),
                'code'        => 'SPECIALTY_IN_USE',
                'doctorCount' => $inUse,
                'status'      => 409,
            ];
        }

        $stmt = $this->db->prepare('DELETE FROM specialty WHERE id = ?');
        $stmt->execute([$id]);

        return ['success' => true, 'message' => "\"{$existing['name']}\" deleted."];
    }

    // -------------------------------------------------------------------------
    // POST /api/specialties/toggle   { id, isActive }
    //
    // Deactivating hides it from the doctor dropdown but leaves every doctor who
    // already selected it untouched.
    // -------------------------------------------------------------------------
    public function toggle(array $data): array
    {
        if ($guard = $this->requireAdmin()) {
            return $guard;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if (is_array($id)) {
            return $id;
        }

        $existing = $this->findById($id);
        if ($existing === null) {
            return ['success' => false, 'error' => 'Specialty not found.', 'status' => 404];
        }

        $isActive = !empty($data['isActive']) ? 1 : 0;

        $stmt = $this->db->prepare('UPDATE specialty SET is_active = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$isActive, $id]);

        return [
            'success'   => true,
            'message'   => $isActive
                ? "\"{$existing['name']}\" is active again."
                : "\"{$existing['name']}\" deactivated — it no longer appears in the doctor form.",
            'specialty' => $this->findById($id),
        ];
    }

    // -------------------------------------------------------------------------
    // Validation helpers. Each returns the cleaned value, or an error array.
    // -------------------------------------------------------------------------

    /** @return string|array */
    private function cleanName($raw)
    {
        if (!is_string($raw)) {
            return ['success' => false, 'error' => 'Name is required.'];
        }

        // Collapse internal whitespace so " Cardio  logy " cannot slip past the
        // unique index as a distinct value from "Cardio logy".
        $name = trim(preg_replace('/\s+/u', ' ', $raw));

        if ($name === '') {
            return ['success' => false, 'error' => 'Name is required.'];
        }
        if (mb_strlen($name) > self::MAX_NAME_LENGTH) {
            return ['success' => false, 'error' => 'Name must be ' . self::MAX_NAME_LENGTH . ' characters or fewer.'];
        }

        return $name;
    }

    /** @return string|null|array */
    private function cleanDescription($raw)
    {
        if ($raw === null) {
            return null;
        }
        if (!is_string($raw)) {
            return ['success' => false, 'error' => 'Description must be text.'];
        }

        $description = trim($raw);
        if ($description === '') {
            return null;
        }
        if (mb_strlen($description) > self::MAX_DESCRIPTION_LENGTH) {
            return ['success' => false, 'error' => 'Description must be ' . self::MAX_DESCRIPTION_LENGTH . ' characters or fewer.'];
        }

        return $description;
    }

    /** @return int|array */
    private function cleanId($raw)
    {
        if (!is_int($raw) && !(is_string($raw) && ctype_digit($raw))) {
            return ['success' => false, 'error' => 'A valid specialty id is required.'];
        }

        $id = (int) $raw;
        if ($id < 1) {
            return ['success' => false, 'error' => 'A valid specialty id is required.'];
        }

        return $id;
    }

    private function cleanSortOrder($raw): int
    {
        if (is_int($raw) || (is_string($raw) && ctype_digit($raw))) {
            return max(0, min(9999, (int) $raw));
        }

        return 0;
    }

    // -------------------------------------------------------------------------
    // Data helpers
    // -------------------------------------------------------------------------

    private function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT s.id, s.name, s.description, s.is_active, s.sort_order,
                    s.created_at, s.updated_at,
                    (SELECT COUNT(*) FROM user_profile p WHERE p.specialty_id = s.id) AS doctor_count
               FROM specialty s
              WHERE s.id = ?"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? $this->present($row) : null;
    }

    private function nameExists(string $name, ?int $exceptId): bool
    {
        if ($exceptId === null) {
            $stmt = $this->db->prepare('SELECT 1 FROM specialty WHERE name = ? LIMIT 1');
            $stmt->execute([$name]);
        } else {
            $stmt = $this->db->prepare('SELECT 1 FROM specialty WHERE name = ? AND id <> ? LIMIT 1');
            $stmt->execute([$name, $exceptId]);
        }

        return (bool) $stmt->fetchColumn();
    }

    private function doctorCount(int $id): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM user_profile WHERE specialty_id = ?');
        $stmt->execute([$id]);

        return (int) $stmt->fetchColumn();
    }

    private function present(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'name'        => $row['name'],
            'description' => $row['description'],
            'isActive'    => (bool) $row['is_active'],
            'sortOrder'   => (int) $row['sort_order'],
            'doctorCount' => isset($row['doctor_count']) ? (int) $row['doctor_count'] : null,
            'createdAt'   => $row['created_at'],
            'updatedAt'   => $row['updated_at'],
        ];
    }

    // -------------------------------------------------------------------------
    // Auth
    // -------------------------------------------------------------------------

    /**
     * ⚠️ Same placeholder as ProfileController: `Bearer token_<id>` is minted on
     * the client and is forgeable. Kept in one place so swapping in a signed JWT
     * is a single change.
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

    /**
     * The role is read from the database, never from the request — so a client
     * cannot claim to be an admin. (It is still only as strong as the token
     * above, which is the known outstanding defect.)
     */
    private function isAdmin(int $userId): bool
    {
        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return false;
        }

        $decoded = json_decode((string) $roles, true);

        return is_array($decoded) && in_array('ROLE_ADMIN', $decoded, true);
    }

    /** Returns an error array to hand straight back, or null when allowed. */
    private function requireAdmin(): ?array
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        if (!$this->isAdmin($userId)) {
            return ['success' => false, 'error' => 'Administrator access required.', 'status' => 403];
        }

        return null;
    }
}
