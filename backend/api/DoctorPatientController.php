<?php

/**
 * The doctor's patient list and patient record.
 *
 * There is no "doctor's patients" table and there should not be one: a patient
 * belongs to a doctor exactly when an appointment links them. Deriving the list
 * from `appointment` means it can never drift out of step with reality, and it
 * makes the privacy boundary structural rather than a filter someone might
 * forget —
 *
 *   - a doctor sees only patients who have booked with them;
 *   - within a patient's record, only the appointments with THIS doctor;
 *   - consultation notes written by other doctors are never returned.
 *
 * Cancelled and rejected appointments still create the relationship: the doctor
 * needs to see that someone tried to book and what happened.
 */
class DoctorPatientController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // GET /api/doctor/patients[?q=ali]
    // =========================================================================
    public function index(array $query): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        // PHP's clock, not the database's: CURDATE()/CURTIME() would use
        // MariaDB's timezone, which is not necessarily the clinic's.
        $today = date('Y-m-d');
        $now   = date('H:i:s');

        $sql = "SELECT u.id, u.name, u.email,
                       p.phone, p.date_of_birth, p.gender, p.blood_type,
                       p.allergies, p.emergency_contact, p.avatar_url,
                       COUNT(a.id) AS total_appointments,
                       SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
                       SUM(CASE WHEN a.status IN ('pending','confirmed') THEN 1 ELSE 0 END) AS open_count,
                       MAX(CASE WHEN a.status = 'completed' THEN a.appointment_date END) AS last_visit
                  FROM appointment a
                  JOIN `user` u ON u.id = a.patient_user_id
                  LEFT JOIN user_profile p ON p.user_id = u.id
                 WHERE a.doctor_user_id = ?";
        $params = [$doctorId];

        $rawQ = $query['q'] ?? null;
        if (is_string($rawQ) && trim($rawQ) !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], trim($rawQ)) . '%';
            $sql .= ' AND (u.name LIKE ? OR u.email LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }

        $sql .= ' GROUP BY u.id, u.name, u.email, p.phone, p.date_of_birth, p.gender,
                           p.blood_type, p.allergies, p.emergency_contact, p.avatar_url
                  ORDER BY u.name ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $next = $this->nextAppointmentsFor($doctorId, $today, $now);

        $patients = array_map(function (array $r) use ($next): array {
            $id = (int) $r['id'];

            return [
                'id'                => $id,
                'name'              => $r['name'],
                'email'             => $r['email'],
                'phone'             => $r['phone'],
                'avatarUrl'         => $r['avatar_url'],
                'dateOfBirth'       => $r['date_of_birth'],
                'age'               => $this->ageFrom($r['date_of_birth']),
                'gender'            => $r['gender'],
                'bloodType'         => $r['blood_type'],
                'allergies'         => $r['allergies'],
                'emergencyContact'  => $r['emergency_contact'],
                'totalAppointments' => (int) $r['total_appointments'],
                'completedVisits'   => (int) $r['completed_count'],
                'openAppointments'  => (int) $r['open_count'],
                // Null until the doctor has actually completed a visit — a
                // booking that has not happened is not a "last visit".
                'lastVisit'         => $r['last_visit'],
                'nextAppointment'   => $next[$id] ?? null,
            ];
        }, $rows);

        return ['success' => true, 'patients' => $patients, 'total' => count($patients)];
    }

    // =========================================================================
    // GET /api/doctor/patients/get?id=13
    //
    // One patient's record, scoped to this doctor's dealings with them.
    // =========================================================================
    public function show(array $query): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        $patientId = $query['id'] ?? null;
        if (!is_string($patientId) || !ctype_digit($patientId)) {
            return ['success' => false, 'error' => 'A valid patient id is required.'];
        }
        $patientId = (int) $patientId;

        // The relationship IS the authorisation: no shared appointment, no access.
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM appointment WHERE doctor_user_id = ? AND patient_user_id = ?'
        );
        $stmt->execute([$doctorId, $patientId]);
        if ((int) $stmt->fetchColumn() === 0) {
            return [
                'success' => false,
                'error'   => 'This patient is not under your care.',
                'status'  => 404,
            ];
        }

        $stmt = $this->db->prepare(
            "SELECT u.id, u.name, u.email, u.created_at,
                    p.phone, p.date_of_birth, p.gender, p.blood_type,
                    p.allergies, p.emergency_contact, p.avatar_url
               FROM `user` u
               LEFT JOIN user_profile p ON p.user_id = u.id
              WHERE u.id = ?"
        );
        $stmt->execute([$patientId]);
        $row = $stmt->fetch();

        if ($row === false) {
            return ['success' => false, 'error' => 'Patient not found.', 'status' => 404];
        }

        $appointments = $this->appointmentsWith($doctorId, $patientId);

        $completed = array_values(array_filter(
            $appointments,
            static fn(array $a): bool => $a['status'] === 'completed'
        ));

        return [
            'success' => true,
            'patient' => [
                'id'               => (int) $row['id'],
                'name'             => $row['name'],
                'email'            => $row['email'],
                'phone'            => $row['phone'],
                'avatarUrl'        => $row['avatar_url'],
                'dateOfBirth'      => $row['date_of_birth'],
                'age'              => $this->ageFrom($row['date_of_birth']),
                'gender'           => $row['gender'],
                'bloodType'        => $row['blood_type'],
                'allergies'        => $row['allergies'],
                'emergencyContact' => $row['emergency_contact'],
                'registeredAt'     => substr((string) $row['created_at'], 0, 10),
                'lastVisit'        => $completed === [] ? null : $completed[0]['date'],
                'completedVisits'  => count($completed),
            ],
            'appointments' => $appointments,
            // The consultation history: completed visits the doctor wrote notes
            // on. These ARE the medical record — there is no separate store, so
            // nothing here can be stale or invented.
            'consultations' => array_values(array_filter(
                $completed,
                static fn(array $a): bool => $a['notes'] !== null && $a['notes'] !== ''
            )),
        ];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    /**
     * Soonest upcoming appointment per patient, for this doctor.
     *
     * @return array<int, array{date:string,time:string,status:string}>
     */
    private function nextAppointmentsFor(int $doctorId, string $today, string $now): array
    {
        $stmt = $this->db->prepare(
            "SELECT patient_user_id, appointment_date, start_time, status
               FROM appointment
              WHERE doctor_user_id = ?
                AND status IN ('pending', 'confirmed')
                AND (appointment_date > ? OR (appointment_date = ? AND start_time >= ?))
              ORDER BY appointment_date ASC, start_time ASC"
        );
        $stmt->execute([$doctorId, $today, $today, $now]);

        $next = [];
        foreach ($stmt->fetchAll() as $row) {
            $patientId = (int) $row['patient_user_id'];
            // Ordered ascending, so the first row seen for a patient is soonest.
            if (isset($next[$patientId])) {
                continue;
            }
            $next[$patientId] = [
                'date'   => $row['appointment_date'],
                'time'   => substr((string) $row['start_time'], 0, 5),
                'status' => $row['status'],
            ];
        }

        return $next;
    }

    /** This doctor's appointments with one patient, newest first. */
    private function appointmentsWith(int $doctorId, int $patientId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, appointment_date, start_time, end_time, duration_minutes,
                    status, type, reason, notes, decision_reason, created_at
               FROM appointment
              WHERE doctor_user_id = ? AND patient_user_id = ?
              ORDER BY appointment_date DESC, start_time DESC"
        );
        $stmt->execute([$doctorId, $patientId]);

        return array_map(static function (array $r): array {
            return [
                'id'             => (int) $r['id'],
                'date'           => $r['appointment_date'],
                'time'           => substr((string) $r['start_time'], 0, 5),
                'endTime'        => substr((string) $r['end_time'], 0, 5),
                'duration'       => (int) $r['duration_minutes'],
                'status'         => $r['status'],
                'type'           => $r['type'],
                'reason'         => $r['reason'],
                'notes'          => $r['notes'],
                'decisionReason' => $r['decision_reason'],
                'createdAt'      => substr((string) $r['created_at'], 0, 10),
            ];
        }, $stmt->fetchAll());
    }

    /** Whole years between a date of birth and today, or null. */
    private function ageFrom(?string $dateOfBirth): ?int
    {
        if ($dateOfBirth === null || $dateOfBirth === '' || $dateOfBirth === '0000-00-00') {
            return null;
        }

        try {
            $born = new DateTimeImmutable($dateOfBirth);
        } catch (Exception $e) {
            return null;
        }

        $now = new DateTimeImmutable('today');
        if ($born > $now) {
            return null;
        }

        return $born->diff($now)->y;
    }

    // =========================================================================
    // Auth — same placeholder as the other controllers.
    // =========================================================================

    /** @return int|array The doctor's id, or an error array to return as-is. */
    private function currentDoctorId()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

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
        if (!is_array($decoded) || !in_array('ROLE_DOCTOR', $decoded, true)) {
            return [
                'success' => false,
                'error'   => 'Only doctors have a patient list.',
                'status'  => 403,
            ];
        }

        return $userId;
    }
}
