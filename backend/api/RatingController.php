<?php

/**
 * Doctor ratings: patients rate after a completed consultation.
 *
 * One rating per appointment. The doctor sees aggregate statistics;
 * the admin sees individual reviews.
 */
class RatingController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // POST /api/ratings/submit
    //   { appointmentId, rating (1-5), review? }
    // =========================================================================
    public function submit(array $data): array
    {
        $patientId = $this->currentUserId(['ROLE_PATIENT']);
        if (is_array($patientId)) {
            return $patientId;
        }

        $appointmentId = $data['appointmentId'] ?? null;
        if (!is_int($appointmentId) && !(is_string($appointmentId) && ctype_digit($appointmentId))) {
            return ['success' => false, 'error' => 'A valid appointment id is required.'];
        }
        $appointmentId = (int) $appointmentId;

        $rating = $data['rating'] ?? null;
        if (!is_int($rating) && !(is_string($rating) && ctype_digit($rating))) {
            return ['success' => false, 'error' => 'Rating is required.'];
        }
        $rating = (int) $rating;
        if ($rating < 1 || $rating > 5) {
            return ['success' => false, 'error' => 'Rating must be between 1 and 5.'];
        }

        $review = null;
        if (isset($data['review']) && is_string($data['review'])) {
            $review = trim($data['review']);
            if (mb_strlen($review) > 1000) {
                return ['success' => false, 'error' => 'Review must be 1000 characters or fewer.'];
            }
            $review = $review === '' ? null : $review;
        }

        // The appointment must belong to this patient and be completed
        $stmt = $this->db->prepare(
            "SELECT id, doctor_user_id, patient_user_id, status
               FROM appointment
              WHERE id = ? AND patient_user_id = ?"
        );
        $stmt->execute([$appointmentId, $patientId]);
        $appt = $stmt->fetch();

        if ($appt === false) {
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }
        if ($appt['status'] !== 'completed') {
            return ['success' => false, 'error' => 'You can only rate completed appointments.'];
        }

        // Prevent duplicate ratings
        $stmt = $this->db->prepare(
            'SELECT id FROM doctor_rating WHERE appointment_id = ?'
        );
        $stmt->execute([$appointmentId]);
        if ($stmt->fetchColumn() !== false) {
            return ['success' => false, 'error' => 'You have already rated this appointment.'];
        }

        $stmt = $this->db->prepare(
            'INSERT INTO doctor_rating (appointment_id, doctor_user_id, patient_user_id, rating, review)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $appointmentId,
            (int) $appt['doctor_user_id'],
            $patientId,
            $rating,
            $review,
        ]);

        return [
            'success' => true,
            'message' => 'Thank you for your feedback!',
            'ratingId' => (int) $this->db->lastInsertId(),
        ];
    }

    // =========================================================================
    // GET /api/ratings/doctor?id=5
    //
    // Doctor's own rating statistics. Any signed-in user can read.
    // =========================================================================
    public function doctorStats(array $query): array
    {
        $userId = $this->requireAuth();
        if (is_array($userId)) {
            return $userId;
        }

        $doctorId = $query['id'] ?? null;
        if (!is_string($doctorId) && !is_int($doctorId)) {
            // Default to the current user if they're a doctor
            $doctorId = $userId;
        }
        if (is_string($doctorId) && ctype_digit($doctorId)) {
            $doctorId = (int) $doctorId;
        }
        if (!is_int($doctorId)) {
            return ['success' => false, 'error' => 'A valid doctor id is required.'];
        }

        return ['success' => true, 'stats' => $this->computeStats($doctorId)];
    }

    // =========================================================================
    // GET /api/ratings/doctor/reviews?id=5[&limit=20]
    //
    // Individual reviews for a doctor.
    // =========================================================================
    public function doctorReviews(array $query): array
    {
        $userId = $this->requireAuth();
        if (is_array($userId)) {
            return $userId;
        }

        $doctorId = $query['id'] ?? null;
        if (is_string($doctorId) && ctype_digit($doctorId)) {
            $doctorId = (int) $doctorId;
        }
        if (!is_int($doctorId)) {
            return ['success' => false, 'error' => 'A valid doctor id is required.'];
        }

        $limit = isset($query['limit']) ? min(100, max(1, (int) $query['limit'])) : 50;

        $stmt = $this->db->prepare(
            "SELECT r.id, r.rating, r.review, r.created_at,
                    u.name AS patient_name, p.avatar_url AS patient_avatar,
                    a.appointment_date, a.reason AS appointment_reason
               FROM doctor_rating r
               JOIN `user` u ON u.id = r.patient_user_id
               LEFT JOIN user_profile p ON p.user_id = u.id
               JOIN appointment a ON a.id = r.appointment_id
              WHERE r.doctor_user_id = ?
              ORDER BY r.created_at DESC
              LIMIT ?"
        );
        $stmt->execute([$doctorId, $limit]);

        $reviews = array_map(static function (array $r): array {
            return [
                'id'              => (int) $r['id'],
                'rating'          => (int) $r['rating'],
                'review'          => $r['review'],
                'patientName'     => $r['patient_name'],
                'patientAvatar'   => $r['patient_avatar'],
                'appointmentDate' => $r['appointment_date'],
                'appointmentReason' => $r['appointment_reason'],
                'createdAt'       => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        return ['success' => true, 'reviews' => $reviews, 'total' => count($reviews)];
    }

    // =========================================================================
    // GET /api/ratings/all (admin: paginated list of all ratings)
    // =========================================================================
    public function allRatings(array $query): array
    {
        $userId = $this->currentUserId(['ROLE_ADMIN']);
        if (is_array($userId)) {
            return $userId;
        }

        $limit  = isset($query['limit'])  ? min(100, max(1, (int) $query['limit']))  : 50;
        $offset = isset($query['offset']) ? max(0, (int) $query['offset'])             : 0;

        $total = (int) $this->db->query('SELECT COUNT(*) FROM doctor_rating')->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT r.id, r.rating, r.review, r.created_at,
                    pu.name AS patient_name, du.name AS doctor_name,
                    a.appointment_date
               FROM doctor_rating r
               JOIN `user` pu ON pu.id = r.patient_user_id
               JOIN `user` du ON du.id = r.doctor_user_id
               JOIN appointment a ON a.id = r.appointment_id
              ORDER BY r.created_at DESC
              LIMIT ? OFFSET ?"
        );
        $stmt->execute([$limit, $offset]);

        $ratings = array_map(static function (array $r): array {
            return [
                'id'              => (int) $r['id'],
                'rating'          => (int) $r['rating'],
                'review'          => $r['review'],
                'patientName'     => $r['patient_name'],
                'doctorName'      => $r['doctor_name'],
                'appointmentDate' => $r['appointment_date'],
                'createdAt'       => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        return ['success' => true, 'ratings' => $ratings, 'total' => $total];
    }

    // =========================================================================
    // GET /api/ratings/doctors/summary[?q=&minRating=&sort=]
    //
    // Every doctor on the platform with their rating aggregates, for the admin
    // ratings screen. Admin only.
    //
    // Doctors who have never been rated are included (LEFT JOIN) — "nobody has
    // reviewed this doctor" is exactly the kind of thing an administrator needs
    // to see, and dropping them would quietly hide most of the directory.
    //
    // The per-doctor figures are the same ones computeStats() produces for a
    // single doctor; they are aggregated in one query here rather than looping,
    // so the screen costs one round trip instead of one per doctor.
    // =========================================================================
    public function doctorsSummary(array $query): array
    {
        $userId = $this->currentUserId(['ROLE_ADMIN']);
        if (is_array($userId)) {
            return $userId;
        }

        $sql = "SELECT u.id, u.name, u.status,
                       p.avatar_url, s.name AS specialty,
                       COUNT(r.id) AS total,
                       ROUND(AVG(r.rating), 2) AS average,
                       SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) AS star_1,
                       SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) AS star_2,
                       SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) AS star_3,
                       SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) AS star_4,
                       SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) AS star_5,
                       MAX(r.created_at) AS last_rated_at
                  FROM `user` u
                  LEFT JOIN user_profile  p ON p.user_id = u.id
                  LEFT JOIN specialty     s ON s.id = p.specialty_id
                  LEFT JOIN doctor_rating r ON r.doctor_user_id = u.id
                 WHERE JSON_CONTAINS(u.roles, '\"ROLE_DOCTOR\"')
                   AND u.deleted_at IS NULL";
        $params = [];

        // --- Search doctor ---------------------------------------------------
        $rawQ = $query['q'] ?? null;
        if (is_string($rawQ) && trim($rawQ) !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], trim($rawQ)) . '%';
            $sql .= ' AND (u.name LIKE ? OR s.name LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }

        $sql .= ' GROUP BY u.id, u.name, u.status, p.avatar_url, s.name';

        // --- Filter by rating (minimum average) ------------------------------
        $minRating = $query['minRating'] ?? null;
        if ($minRating !== null && $minRating !== '' && $minRating !== 'all') {
            if (!is_numeric($minRating) || (float) $minRating < 1 || (float) $minRating > 5) {
                return ['success' => false, 'error' => 'minRating must be a number between 1 and 5.'];
            }
            // HAVING, not WHERE: the average only exists after grouping. This
            // also drops unrated doctors, which is the right behaviour when the
            // admin is explicitly filtering on a score.
            $sql .= ' HAVING AVG(r.rating) >= ?';
            $params[] = (float) $minRating;
        }

        // --- Sorting ----------------------------------------------------------
        // Whitelisted: these land in the SQL string, so they can never come
        // from user input directly.
        $sort = is_string($query['sort'] ?? null) ? $query['sort'] : 'name';
        // The aggregate expressions are repeated rather than referenced by their
        // SELECT alias: MariaDB rejects an alias that wraps a group function
        // once it appears inside an ORDER BY expression such as "x IS NULL".
        $orderBy = [
            'name'    => 'u.name ASC',
            // An unrated doctor has a NULL average. "IS NULL" sorts those last
            // in both directions — they are neither the best nor the worst.
            'highest' => 'AVG(r.rating) IS NULL, AVG(r.rating) DESC, COUNT(r.id) DESC',
            'lowest'  => 'AVG(r.rating) IS NULL, AVG(r.rating) ASC,  COUNT(r.id) DESC',
            'reviews' => 'COUNT(r.id) DESC, u.name ASC',
        ];
        if (!isset($orderBy[$sort])) {
            return ['success' => false, 'error' => 'sort must be one of: name, highest, lowest, reviews.'];
        }
        $sql .= ' ORDER BY ' . $orderBy[$sort];

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $doctors = array_map(static function (array $r): array {
            return [
                'id'            => (int) $r['id'],
                'name'          => $r['name'],
                'status'        => $r['status'],
                'avatarUrl'     => $r['avatar_url'],
                'specialty'     => $r['specialty'] ?? 'General Practice',
                'totalReviews'  => (int) $r['total'],
                'averageRating' => $r['average'] !== null ? round((float) $r['average'], 1) : null,
                'distribution'  => [
                    1 => (int) $r['star_1'],
                    2 => (int) $r['star_2'],
                    3 => (int) $r['star_3'],
                    4 => (int) $r['star_4'],
                    5 => (int) $r['star_5'],
                ],
                'lastRatedAt'   => $r['last_rated_at'],
            ];
        }, $stmt->fetchAll());

        // Platform-wide figures, so the admin has a baseline to read the table
        // against. Computed from the same rows the table is built from.
        $rated = array_values(array_filter(
            $doctors,
            static fn(array $d): bool => $d['totalReviews'] > 0
        ));
        $totalReviews = array_sum(array_map(static fn(array $d): int => $d['totalReviews'], $doctors));

        return [
            'success' => true,
            'doctors' => $doctors,
            'summary' => [
                'doctorCount'       => count($doctors),
                'ratedDoctorCount'  => count($rated),
                'totalReviews'      => $totalReviews,
                'platformAverage'   => $rated === [] ? null : round(
                    array_sum(array_map(
                        static fn(array $d): float => (float) $d['averageRating'] * $d['totalReviews'],
                        $rated
                    )) / max(1, $totalReviews),
                    1
                ),
            ],
        ];
    }

    // =========================================================================
    // GET /api/ratings/check?appointmentId=10
    //
    // Has the patient already rated this appointment?
    // =========================================================================
    public function check(array $query): array
    {
        $patientId = $this->currentUserId(['ROLE_PATIENT']);
        if (is_array($patientId)) {
            return $patientId;
        }

        $appointmentId = $query['appointmentId'] ?? null;
        if (is_string($appointmentId) && ctype_digit($appointmentId)) {
            $appointmentId = (int) $appointmentId;
        }
        if (!is_int($appointmentId)) {
            return ['success' => false, 'error' => 'A valid appointment id is required.'];
        }

        $stmt = $this->db->prepare(
            'SELECT id, rating, review FROM doctor_rating WHERE appointment_id = ? AND patient_user_id = ?'
        );
        $stmt->execute([$appointmentId, $patientId]);
        $row = $stmt->fetch();

        if ($row === false) {
            return ['success' => true, 'rated' => false];
        }

        return [
            'success' => true,
            'rated'   => true,
            'rating'  => (int) $row['rating'],
            'review'  => $row['review'],
        ];
    }

    // =========================================================================
    // GET /api/ratings/pending
    //
    // Patient's completed appointments that haven't been rated yet.
    // =========================================================================
    public function pending(array $query): array
    {
        $patientId = $this->currentUserId(['ROLE_PATIENT']);
        if (is_array($patientId)) {
            return $patientId;
        }

        $stmt = $this->db->prepare(
            "SELECT a.id, a.appointment_date, a.start_time, a.reason,
                    du.name AS doctor_name, p.avatar_url AS doctor_avatar
               FROM appointment a
               JOIN `user` du ON du.id = a.doctor_user_id
               LEFT JOIN user_profile p ON p.user_id = du.id
              WHERE a.patient_user_id = ?
                AND a.status = 'completed'
                AND NOT EXISTS (
                    SELECT 1 FROM doctor_rating r WHERE r.appointment_id = a.id
                )
              ORDER BY a.appointment_date DESC, a.start_time DESC
              LIMIT 20"
        );
        $stmt->execute([$patientId]);

        $appointments = array_map(static function (array $r): array {
            return [
                'appointmentId' => (int) $r['id'],
                'date'          => $r['appointment_date'],
                'time'          => substr((string) $r['start_time'], 0, 5),
                'reason'        => $r['reason'],
                'doctorName'    => $r['doctor_name'],
                'doctorAvatar'  => $r['doctor_avatar'],
            ];
        }, $stmt->fetchAll());

        return ['success' => true, 'appointments' => $appointments];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function computeStats(int $doctorId): array
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) AS total,
                    ROUND(AVG(rating), 2) AS average,
                    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS star_1,
                    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS star_2,
                    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS star_3,
                    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS star_4,
                    SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS star_5
               FROM doctor_rating
              WHERE doctor_user_id = ?"
        );
        $stmt->execute([$doctorId]);
        $row = $stmt->fetch();

        return [
            'totalReviews'  => (int) ($row['total'] ?? 0),
            'averageRating' => $row['average'] !== null ? round((float) $row['average'], 1) : null,
            'distribution'  => [
                1 => (int) ($row['star_1'] ?? 0),
                2 => (int) ($row['star_2'] ?? 0),
                3 => (int) ($row['star_3'] ?? 0),
                4 => (int) ($row['star_4'] ?? 0),
                5 => (int) ($row['star_5'] ?? 0),
            ],
        ];
    }

    private function requireAuth()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        $userId = (int) $m[1];
        $stmt = $this->db->prepare('SELECT id FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        if ($stmt->fetchColumn() === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        return $userId;
    }

    /** @return int|array */
    private function currentUserId(array $requiredRoles)
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $userId = (int) $m[1];
        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $decoded = json_decode((string) $roles, true);
        if (!is_array($decoded) || empty(array_intersect($decoded, $requiredRoles))) {
            return [
                'success' => false,
                'error'   => 'You do not have permission for this action.',
                'status'  => 403,
            ];
        }

        return $userId;
    }
}
