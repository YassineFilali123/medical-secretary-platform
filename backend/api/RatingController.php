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
