<?php

/**
 * Appointments: booking, the status lifecycle, and role-scoped reads.
 *
 * Two rules shape everything here.
 *
 * 1. A slot is bookable only if AvailabilityController says so. This class never
 *    re-derives opening hours; it calls slotsFor() and looks for the requested
 *    time in the result, so the API can never refuse a slot the UI just offered
 *    (or accept one it did not).
 *
 * 2. Who may do what is decided from roles read out of the database, per action,
 *    never from the request. See canView()/assertCan* below for the full table.
 */
class AppointmentController
{
    /** Statuses that still hold a slot — mirrors `active_slot` in the schema. */
    private const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed'];

    private const TYPES = ['consultation', 'follow-up', 'checkup', 'emergency'];

    /** How far ahead a booking may be made. */
    private const HORIZON_DAYS = 180;

    private const MAX_REASON          = 500;
    private const MAX_NOTES           = 2000;
    private const MAX_DECISION_REASON = 255;

    private const DEFAULT_LIMIT = 200;
    private const MAX_LIMIT     = 500;

    private PDO $db;
    private AvailabilityController $availability;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->availability = new AvailabilityController();
    }

    // =========================================================================
    // GET /api/doctors[?specialtyId=3]
    //
    // The directory a patient browses before booking. Any signed-in user.
    // =========================================================================
    public function doctors(array $query): array
    {
        if ($this->me() === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $sql = "SELECT u.id, u.name,
                       p.specialty_id, s.name AS specialty,
                       p.avatar_url, p.bio, p.clinic_name, p.clinic_address
                  FROM `user` u
                  LEFT JOIN user_profile p ON p.user_id = u.id
                  LEFT JOIN specialty     s ON s.id = p.specialty_id
                 WHERE u.roles LIKE '%ROLE_DOCTOR%'
                   AND u.status = 'active'";
        $params = [];

        $rawSpecialty = $query['specialtyId'] ?? null;
        if ($rawSpecialty !== null && $rawSpecialty !== '' && $rawSpecialty !== 'all') {
            if (!is_string($rawSpecialty) || !ctype_digit($rawSpecialty)) {
                return ['success' => false, 'error' => 'specialtyId must be a number.'];
            }
            $sql .= ' AND p.specialty_id = ?';
            $params[] = (int) $rawSpecialty;
        }

        $sql .= ' ORDER BY u.name ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $doctors = array_map(static function (array $r): array {
            return [
                'id'            => (int) $r['id'],
                'name'          => $r['name'],
                'specialtyId'   => $r['specialty_id'] !== null ? (int) $r['specialty_id'] : null,
                // Doctors who have not picked a specialty yet still need to be
                // bookable, so this is a label rather than a required field.
                'specialty'     => $r['specialty'] ?? 'General Practice',
                'avatarUrl'     => $r['avatar_url'],
                'bio'           => $r['bio'],
                'clinicName'    => $r['clinic_name'],
                'clinicAddress' => $r['clinic_address'],
            ];
        }, $stmt->fetchAll());

        return ['success' => true, 'doctors' => $doctors];
    }

    // =========================================================================
    // GET /api/patients[?q=ali]
    //
    // Staff-only: the secretary needs it to book on someone's behalf, and it
    // exposes patient names and emails, so patients and doctors cannot read it.
    // =========================================================================
    public function patients(array $query): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        if (!$this->seesAll($me)) {
            return ['success' => false, 'error' => 'Staff access required.', 'status' => 403];
        }

        $sql = "SELECT u.id, u.name, u.email, p.phone
                  FROM `user` u
                  LEFT JOIN user_profile p ON p.user_id = u.id
                 WHERE u.roles LIKE '%ROLE_PATIENT%'
                   AND u.status = 'active'";
        $params = [];

        $rawQ = $query['q'] ?? null;
        if (is_string($rawQ) && trim($rawQ) !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], trim($rawQ)) . '%';
            $sql .= ' AND (u.name LIKE ? OR u.email LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }

        $sql .= ' ORDER BY u.name ASC LIMIT 100';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return [
            'success'  => true,
            'patients' => array_map(static function (array $r): array {
                return [
                    'id'    => (int) $r['id'],
                    'name'  => $r['name'],
                    'email' => $r['email'],
                    'phone' => $r['phone'],
                ];
            }, $stmt->fetchAll()),
        ];
    }

    // =========================================================================
    // GET /api/appointments[?status=&from=&to=&doctorId=&patientId=&q=&limit=]
    //
    // Scoped by role: a patient sees only their own, a doctor only theirs,
    // secretaries and admins see everything. The scope is applied as a WHERE
    // clause, not a filter on the way out, so there is no window in which the
    // wrong rows exist in memory.
    // =========================================================================
    public function index(array $query): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $where  = [];
        $params = [];

        if ($this->seesAll($me)) {
            // Staff may narrow to one doctor or patient.
            foreach (['doctorId' => 'a.doctor_user_id', 'patientId' => 'a.patient_user_id'] as $key => $column) {
                $raw = $query[$key] ?? null;
                if ($raw === null || $raw === '' || $raw === 'all') {
                    continue;
                }
                if (!is_string($raw) || !ctype_digit($raw)) {
                    return ['success' => false, 'error' => "{$key} must be a number."];
                }
                $where[]  = "{$column} = ?";
                $params[] = (int) $raw;
            }
        } elseif ($this->hasRole($me, 'ROLE_DOCTOR')) {
            $where[]  = 'a.doctor_user_id = ?';
            $params[] = $me['id'];
        } else {
            $where[]  = 'a.patient_user_id = ?';
            $params[] = $me['id'];
        }

        $rawStatus = $query['status'] ?? null;
        if ($rawStatus !== null && $rawStatus !== '' && $rawStatus !== 'all') {
            if (!is_string($rawStatus) || !in_array($rawStatus, $this->allStatuses(), true)) {
                return ['success' => false, 'error' => 'Unknown status filter.'];
            }
            $where[]  = 'a.status = ?';
            $params[] = $rawStatus;
        }

        foreach (['from' => '>=', 'to' => '<='] as $key => $op) {
            $raw = $query[$key] ?? null;
            if ($raw === null || $raw === '') {
                continue;
            }
            $date = $this->cleanDate($raw);
            if ($date === null) {
                return ['success' => false, 'error' => "The \"{$key}\" date must be in YYYY-MM-DD format."];
            }
            $where[]  = "a.appointment_date {$op} ?";
            $params[] = $date;
        }

        $rawQ = $query['q'] ?? null;
        if (is_string($rawQ) && trim($rawQ) !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], trim($rawQ)) . '%';
            $where[]  = '(pu.name LIKE ? OR du.name LIKE ? OR a.reason LIKE ?)';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $limit = self::DEFAULT_LIMIT;
        $rawLimit = $query['limit'] ?? null;
        if ($rawLimit !== null && $rawLimit !== '') {
            if (!is_string($rawLimit) || !ctype_digit($rawLimit) || (int) $rawLimit < 1) {
                return ['success' => false, 'error' => 'limit must be a positive number.'];
            }
            $limit = min((int) $rawLimit, self::MAX_LIMIT);
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $stmt = $this->db->prepare(
            $this->baseSelect() . $clause .
            ' ORDER BY a.appointment_date DESC, a.start_time DESC, a.id DESC LIMIT ' . $limit
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $countStmt = $this->db->prepare(
            'SELECT COUNT(*) FROM appointment a
               JOIN `user` pu ON pu.id = a.patient_user_id
               JOIN `user` du ON du.id = a.doctor_user_id' . $clause
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $staff = $this->isStaff($me);

        return [
            'success'      => true,
            'appointments' => array_map(fn(array $r): array => $this->mapRow($r, $staff), $rows),
            'total'        => $total,
            'returned'     => count($rows),
        ];
    }

    // =========================================================================
    // GET /api/appointments/get?id=5
    // =========================================================================
    public function show(array $query): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $id = $this->cleanId($query['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid id is required.'];
        }

        $appt = $this->findRow($id);
        if ($appt === null) {
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }
        if (!$this->canView($me, $appt)) {
            // Deliberately the same message as "not found": whether appointment
            // #5 exists is itself information a stranger should not get.
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }

        return ['success' => true, 'appointment' => $this->mapRow($appt, $this->isStaff($me))];
    }

    // =========================================================================
    // POST /api/appointments/create
    //   { doctorId, date, time, reason, type?, patientId? }
    //
    // Patients book for themselves and land in `pending` for the doctor to
    // accept. A secretary booking on someone's behalf is taking the request in
    // person, so that appointment is `confirmed` immediately.
    // =========================================================================
    public function create(array $data): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $isPatient   = $this->hasRole($me, 'ROLE_PATIENT');
        $isSecretary = $this->hasRole($me, 'ROLE_SECRETARY');

        if (!$isPatient && !$isSecretary) {
            return [
                'success' => false,
                'error'   => 'Only patients and secretaries can create appointments.',
                'status'  => 403,
            ];
        }

        // Whose appointment is it?
        if ($isSecretary) {
            $patientId = $this->cleanId($data['patientId'] ?? null);
            if ($patientId === null) {
                return ['success' => false, 'error' => 'Choose a patient for this appointment.'];
            }
            if (!$this->userHasRole($patientId, 'ROLE_PATIENT')) {
                return ['success' => false, 'error' => 'That user is not a patient.'];
            }
        } else {
            // A patient's own id, never taken from the request body.
            $patientId = $me['id'];
        }

        $doctorId = $this->cleanId($data['doctorId'] ?? null);
        if ($doctorId === null) {
            return ['success' => false, 'error' => 'Choose a doctor.'];
        }
        if (!$this->userHasRole($doctorId, 'ROLE_DOCTOR')) {
            return ['success' => false, 'error' => 'That user is not a doctor.'];
        }
        if ($doctorId === $patientId) {
            return ['success' => false, 'error' => 'A doctor cannot book an appointment with themselves.'];
        }

        $reason = $this->cleanReason($data['reason'] ?? null);
        if ($reason === null) {
            return ['success' => false, 'error' => 'Please describe the reason for the visit.'];
        }
        if (mb_strlen($reason) > self::MAX_REASON) {
            return ['success' => false, 'error' => 'The reason must be ' . self::MAX_REASON . ' characters or fewer.'];
        }

        $type = $data['type'] ?? 'consultation';
        if (!is_string($type) || !in_array($type, self::TYPES, true)) {
            return ['success' => false, 'error' => 'Appointment type must be one of: ' . implode(', ', self::TYPES) . '.'];
        }

        $slot = $this->resolveSlot($doctorId, $data['date'] ?? null, $data['time'] ?? null, null);
        if (isset($slot['error'])) {
            return $slot;
        }

        $clash = $this->patientClash($patientId, $slot['date'], $slot['startMin'], $slot['endMin'], null);
        if ($clash !== null) {
            return [
                'success' => false,
                'error'   => $isSecretary
                    ? sprintf('That patient already has an appointment at %s on %s.', $clash, $slot['date'])
                    : sprintf('You already have an appointment at %s on %s.', $clash, $slot['date']),
            ];
        }

        // Secretary-booked appointments are agreed on the spot; patient requests
        // wait for the doctor.
        $status = $isSecretary ? 'confirmed' : 'pending';

        try {
            $stmt = $this->db->prepare(
                "INSERT INTO appointment
                     (patient_user_id, doctor_user_id, appointment_date, start_time, end_time,
                      duration_minutes, status, type, reason, created_by_user_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
            );
            $stmt->execute([
                $patientId,
                $doctorId,
                $slot['date'],
                $slot['start'] . ':00',
                $slot['end'] . ':00',
                $slot['minutes'],
                $status,
                $type,
                $reason,
                $me['id'],
            ]);
        } catch (PDOException $e) {
            // 1062 = duplicate key. Two people passed the availability check at
            // the same time and the unique index arbitrated; this is the only
            // reliable way to lose that race, so report it plainly.
            if ($this->isDuplicateKey($e)) {
                return [
                    'success' => false,
                    'error'   => 'That slot was just taken. Please choose another time.',
                    'code'    => 'SLOT_TAKEN',
                    'status'  => 409,
                ];
            }
            throw $e;
        }

        $created = $this->findRow((int) $this->db->lastInsertId());

        return [
            'success'     => true,
            'message'     => $status === 'confirmed'
                ? 'Appointment booked and confirmed.'
                : 'Appointment requested. You will be notified once the doctor confirms.',
            'appointment' => $created === null ? null : $this->mapRow($created, $this->isStaff($me)),
        ];
    }

    // =========================================================================
    // POST /api/appointments/cancel   { id, reason? }
    //
    // Patients (their own, before it starts), the doctor who owns it, and
    // secretaries. Cancelling frees the slot for someone else.
    // =========================================================================
    public function cancel(array $data): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $appt = $this->loadFor($me, $data['id'] ?? null);
        if (isset($appt['error'])) {
            return $appt;
        }
        $row = $appt['row'];

        $isOwnPatient = (int) $row['patient_user_id'] === $me['id'];
        $isOwnDoctor  = (int) $row['doctor_user_id'] === $me['id'] && $this->hasRole($me, 'ROLE_DOCTOR');
        $isSecretary  = $this->hasRole($me, 'ROLE_SECRETARY');

        if (!$isOwnPatient && !$isOwnDoctor && !$isSecretary) {
            return ['success' => false, 'error' => 'You cannot cancel this appointment.', 'status' => 403];
        }

        if (!in_array($row['status'], ['pending', 'confirmed'], true)) {
            return [
                'success' => false,
                'error'   => sprintf('This appointment is already %s.', $row['status']),
            ];
        }

        // A patient cannot retroactively cancel a visit that has already begun;
        // staff can, because a no-show still has to be recorded somehow.
        if ($isOwnPatient && !$isOwnDoctor && !$isSecretary && $this->hasStarted($row)) {
            return [
                'success' => false,
                'error'   => 'This appointment has already started. Please contact the clinic.',
            ];
        }

        $reason = $this->cleanDecisionReason($data['reason'] ?? null);
        if ($reason === false) {
            return ['success' => false, 'error' => 'The reason must be ' . self::MAX_DECISION_REASON . ' characters or fewer.'];
        }

        $stmt = $this->db->prepare(
            "UPDATE appointment
                SET status = 'cancelled', decision_reason = ?, updated_at = NOW()
              WHERE id = ? AND status IN ('pending', 'confirmed')"
        );
        $stmt->execute([$reason, $row['id']]);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'error' => 'The appointment changed while you were working on it. Reload and try again.'];
        }

        return $this->reload((int) $row['id'], $me, 'Appointment cancelled.');
    }

    // =========================================================================
    // POST /api/appointments/reschedule   { id, date, time }
    //
    // Patients (their own) and secretaries. The doctor accepts or rejects rather
    // than moving a patient's appointment behind their back.
    // =========================================================================
    public function reschedule(array $data): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $appt = $this->loadFor($me, $data['id'] ?? null);
        if (isset($appt['error'])) {
            return $appt;
        }
        $row = $appt['row'];

        $isOwnPatient = (int) $row['patient_user_id'] === $me['id'];
        $isSecretary  = $this->hasRole($me, 'ROLE_SECRETARY');

        if (!$isOwnPatient && !$isSecretary) {
            return ['success' => false, 'error' => 'You cannot reschedule this appointment.', 'status' => 403];
        }

        if (!in_array($row['status'], ['pending', 'confirmed'], true)) {
            return [
                'success' => false,
                'error'   => sprintf('A %s appointment cannot be rescheduled.', $row['status']),
            ];
        }

        if ($isOwnPatient && !$isSecretary && $this->hasStarted($row)) {
            return [
                'success' => false,
                'error'   => 'This appointment has already started. Please contact the clinic.',
            ];
        }

        $doctorId = (int) $row['doctor_user_id'];

        // Excluding this appointment lets the patient keep — or return to — the
        // time they already hold, instead of clashing with themselves.
        $slot = $this->resolveSlot($doctorId, $data['date'] ?? null, $data['time'] ?? null, (int) $row['id']);
        if (isset($slot['error'])) {
            return $slot;
        }

        if ($slot['date'] === $row['appointment_date']
            && $slot['start'] === substr((string) $row['start_time'], 0, 5)) {
            return ['success' => false, 'error' => 'That is already the appointment time.'];
        }

        $clash = $this->patientClash(
            (int) $row['patient_user_id'],
            $slot['date'],
            $slot['startMin'],
            $slot['endMin'],
            (int) $row['id']
        );
        if ($clash !== null) {
            return [
                'success' => false,
                'error'   => $isSecretary
                    ? sprintf('That patient already has an appointment at %s on %s.', $clash, $slot['date'])
                    : sprintf('You already have an appointment at %s on %s.', $clash, $slot['date']),
            ];
        }

        // Moving a confirmed appointment makes it a request again: the doctor
        // agreed to the old time, not the new one. A secretary rearranging by
        // phone has already spoken to everyone, so theirs stays confirmed.
        $newStatus = ($row['status'] === 'confirmed' && !$isSecretary) ? 'pending' : $row['status'];

        try {
            $stmt = $this->db->prepare(
                "UPDATE appointment
                    SET appointment_date = ?, start_time = ?, end_time = ?,
                        duration_minutes = ?, status = ?, updated_at = NOW()
                  WHERE id = ? AND status IN ('pending', 'confirmed')"
            );
            $stmt->execute([
                $slot['date'],
                $slot['start'] . ':00',
                $slot['end'] . ':00',
                $slot['minutes'],
                $newStatus,
                $row['id'],
            ]);
        } catch (PDOException $e) {
            if ($this->isDuplicateKey($e)) {
                return [
                    'success' => false,
                    'error'   => 'That slot was just taken. Please choose another time.',
                    'code'    => 'SLOT_TAKEN',
                    'status'  => 409,
                ];
            }
            throw $e;
        }

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'error' => 'The appointment changed while you were working on it. Reload and try again.'];
        }

        $message = $newStatus === 'pending' && $row['status'] === 'confirmed'
            ? 'Appointment moved. It needs the doctor to confirm the new time.'
            : 'Appointment moved.';

        return $this->reload((int) $row['id'], $me, $message);
    }

    // =========================================================================
    // POST /api/appointments/status   { id, status, reason?, notes? }
    //
    // The doctor's side of the lifecycle: accept, reject, complete. A secretary
    // may also confirm, since they field the calls that settle a time.
    //
    //   pending   -> confirmed | rejected
    //   confirmed -> completed
    // =========================================================================
    public function updateStatus(array $data): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $appt = $this->loadFor($me, $data['id'] ?? null);
        if (isset($appt['error'])) {
            return $appt;
        }
        $row = $appt['row'];

        $target = $data['status'] ?? null;
        if (!is_string($target) || !in_array($target, ['confirmed', 'rejected', 'completed'], true)) {
            return ['success' => false, 'error' => 'Status must be confirmed, rejected or completed.'];
        }

        $isOwnDoctor = (int) $row['doctor_user_id'] === $me['id'] && $this->hasRole($me, 'ROLE_DOCTOR');
        $isSecretary = $this->hasRole($me, 'ROLE_SECRETARY');

        // Rejecting and completing are clinical decisions; only the doctor whose
        // appointment it is may make them.
        $allowed = $target === 'confirmed'
            ? ($isOwnDoctor || $isSecretary)
            : $isOwnDoctor;

        if (!$allowed) {
            return [
                'success' => false,
                'error'   => $target === 'confirmed'
                    ? 'Only the doctor or a secretary can confirm an appointment.'
                    : sprintf('Only the doctor can mark an appointment as %s.', $target),
                'status'  => 403,
            ];
        }

        // A visit can be closed out either straight from `confirmed` (the doctor
        // never opened the live screen) or from `in_progress` (they did).
        $required = $target === 'completed' ? ['confirmed', 'in_progress'] : ['pending'];
        if (!in_array($row['status'], $required, true)) {
            return [
                'success' => false,
                'error'   => sprintf(
                    'Only a %s appointment can be marked %s — this one is %s.',
                    implode(' or ', $required),
                    $target,
                    $row['status']
                ),
            ];
        }

        // A visit cannot be over before it starts.
        if ($target === 'completed' && !$this->hasStarted($row)) {
            return [
                'success' => false,
                'error'   => sprintf(
                    'This appointment starts on %s at %s. It can be completed once it has begun.',
                    $row['appointment_date'],
                    substr((string) $row['start_time'], 0, 5)
                ),
            ];
        }

        $decisionReason = null;
        if ($target === 'rejected') {
            $decisionReason = $this->cleanDecisionReason($data['reason'] ?? null);
            if ($decisionReason === false) {
                return ['success' => false, 'error' => 'The reason must be ' . self::MAX_DECISION_REASON . ' characters or fewer.'];
            }
        }

        $notes = null;
        $setNotes = false;
        if ($target === 'completed' && array_key_exists('notes', $data)) {
            if (!is_string($data['notes'])) {
                return ['success' => false, 'error' => 'Notes must be text.'];
            }
            $notes = trim($data['notes']);
            if (mb_strlen($notes) > self::MAX_NOTES) {
                return ['success' => false, 'error' => 'Notes must be ' . self::MAX_NOTES . ' characters or fewer.'];
            }
            $notes = $notes === '' ? null : $notes;
            $setNotes = true;
        }

        $sql    = 'UPDATE appointment SET status = ?, updated_at = NOW()';
        $params = [$target];

        if ($target === 'rejected') {
            $sql .= ', decision_reason = ?';
            $params[] = $decisionReason;
        }
        if ($setNotes) {
            $sql .= ', notes = ?';
            $params[] = $notes;
        }

        // Re-checking the status here closes the gap between the read above and
        // this write: two doctors' tabs cannot both confirm the same request.
        $sql .= ' WHERE id = ? AND status IN (' . implode(',', array_fill(0, count($required), '?')) . ')';
        $params[] = $row['id'];
        foreach ($required as $allowed) {
            $params[] = $allowed;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'error' => 'The appointment changed while you were working on it. Reload and try again.'];
        }

        $messages = [
            'confirmed' => 'Appointment confirmed.',
            'rejected'  => 'Appointment rejected.',
            'completed' => 'Appointment marked as completed.',
        ];

        return $this->reload((int) $row['id'], $me, $messages[$target]);
    }

    // =========================================================================
    // GET /api/appointments/stats
    //
    // Admin only — the admin's role in this module is oversight, not operation.
    // =========================================================================
    public function stats(): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        if (!$this->hasRole($me, 'ROLE_ADMIN')) {
            return ['success' => false, 'error' => 'Administrator access required.', 'status' => 403];
        }

        $byStatus = array_fill_keys($this->allStatuses(), 0);
        foreach ($this->db->query('SELECT status, COUNT(*) AS n FROM appointment GROUP BY status') as $r) {
            $byStatus[$r['status']] = (int) $r['n'];
        }

        $byType = array_fill_keys(self::TYPES, 0);
        foreach ($this->db->query('SELECT type, COUNT(*) AS n FROM appointment GROUP BY type') as $r) {
            $byType[$r['type']] = (int) $r['n'];
        }

        $total     = array_sum($byStatus);
        $decided   = $total - $byStatus['pending'];
        $today     = date('Y-m-d');
        $weekAhead = (new DateTimeImmutable($today))->add(new DateInterval('P7D'))->format('Y-m-d');
        $monthAgo  = (new DateTimeImmutable($today))->sub(new DateInterval('P29D'))->format('Y-m-d');

        $upcoming = $this->db->prepare(
            "SELECT COUNT(*) FROM appointment
              WHERE appointment_date BETWEEN ? AND ?
                AND status IN ('pending', 'confirmed')"
        );
        $upcoming->execute([$today, $weekAhead]);

        $todayCount = $this->db->prepare(
            "SELECT COUNT(*) FROM appointment
              WHERE appointment_date = ? AND status IN ('pending', 'confirmed', 'in_progress', 'completed')"
        );
        $todayCount->execute([$today]);

        $perDoctor = $this->db->query(
            "SELECT du.id, du.name, s.name AS specialty,
                    COUNT(*) AS total,
                    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
               FROM appointment a
               JOIN `user` du ON du.id = a.doctor_user_id
               LEFT JOIN user_profile dp ON dp.user_id = du.id
               LEFT JOIN specialty     s ON s.id = dp.specialty_id
              GROUP BY du.id, du.name, s.name
              ORDER BY total DESC, du.name ASC
              LIMIT 10"
        );

        $daily = $this->db->prepare(
            "SELECT appointment_date AS date, COUNT(*) AS n
               FROM appointment
              WHERE appointment_date BETWEEN ? AND ?
              GROUP BY appointment_date
              ORDER BY appointment_date ASC"
        );
        $daily->execute([$monthAgo, $today]);

        return [
            'success' => true,
            'stats'   => [
                'total'     => $total,
                'byStatus'  => $byStatus,
                'byType'    => $byType,
                'today'     => (int) $todayCount->fetchColumn(),
                'next7Days' => (int) $upcoming->fetchColumn(),
                // Share of *decided* appointments that were cancelled. Pending
                // ones are excluded — they have not had the chance to be either.
                'cancellationRate' => $decided > 0
                    ? round(($byStatus['cancelled'] / $decided) * 100, 1)
                    : 0.0,
                'noShowRate' => $decided > 0
                    ? round((($byStatus['cancelled'] + $byStatus['rejected']) / $decided) * 100, 1)
                    : 0.0,
                'perDoctor' => array_map(static function (array $r): array {
                    return [
                        'doctorId'  => (int) $r['id'],
                        'name'      => $r['name'],
                        'specialty' => $r['specialty'] ?? 'General Practice',
                        'total'     => (int) $r['total'],
                        'completed' => (int) $r['completed'],
                        'cancelled' => (int) $r['cancelled'],
                    ];
                }, $perDoctor->fetchAll()),
                'daily' => array_map(static function (array $r): array {
                    return ['date' => $r['date'], 'count' => (int) $r['n']];
                }, $daily->fetchAll()),
            ],
        ];
    }

    // =========================================================================
    // Slot resolution
    // =========================================================================

    /**
     * Turn a requested (date, time) into a concrete slot, or an error array.
     *
     * The slot must appear in AvailabilityController's own output. Anything else
     * — a time between slots, a day off, a taken slot — is rejected here rather
     * than being written and discovered later.
     *
     * @return array{date:string,start:string,end:string,startMin:int,endMin:int,minutes:int}|array{error:string,success:bool}
     */
    private function resolveSlot(int $doctorId, $rawDate, $rawTime, ?int $excludeId): array
    {
        $date = $this->cleanDate($rawDate);
        if ($date === null) {
            return ['success' => false, 'error' => 'A valid date (YYYY-MM-DD) is required.'];
        }

        $time = $this->cleanTime($rawTime);
        if ($time === null) {
            return ['success' => false, 'error' => 'A valid time (HH:MM) is required.'];
        }

        $today = date('Y-m-d');
        if ($date < $today) {
            return ['success' => false, 'error' => 'That date has already passed.'];
        }
        if ($this->inclusiveDays($today, $date) > self::HORIZON_DAYS) {
            return [
                'success' => false,
                'error'   => 'Appointments can only be booked up to ' . self::HORIZON_DAYS . ' days ahead.',
            ];
        }

        $days = $this->availability->slotsFor($doctorId, $date, $date, $excludeId);
        $day  = $days[0] ?? null;
        if ($day === null) {
            return ['success' => false, 'error' => 'No availability for that date.'];
        }

        if ($day['reason'] === 'not_working') {
            return [
                'success' => false,
                'error'   => sprintf('The doctor does not work on %s.', date('l', strtotime($date))),
            ];
        }
        if ($day['reason'] === 'time_off') {
            return ['success' => false, 'error' => 'The doctor is away on that date.'];
        }

        foreach ($day['slots'] as $slot) {
            if ($slot['start'] === $time) {
                $startMin = $this->toMinutes($slot['start']);
                $endMin   = $this->toMinutes($slot['end']);

                return [
                    'date'     => $date,
                    'start'    => $slot['start'],
                    'end'      => $slot['end'],
                    'startMin' => $startMin,
                    'endMin'   => $endMin,
                    'minutes'  => $endMin - $startMin,
                ];
            }
        }

        // Not on offer. Separating "taken" from "never existed" is the whole
        // difference between a useful message and a baffling one.
        if ($this->doctorBusyAt($doctorId, $date, $time, $excludeId)) {
            return [
                'success' => false,
                'error'   => 'That slot is already booked. Please choose another time.',
                'code'    => 'SLOT_TAKEN',
                'status'  => 409,
            ];
        }

        if ($date === $today && $this->toMinutes($time) <= ((int) date('H')) * 60 + (int) date('i')) {
            return ['success' => false, 'error' => 'That time has already passed today.'];
        }

        return ['success' => false, 'error' => 'That time is not one of the doctor\'s available slots.'];
    }

    /** Does a live booking cover this exact start time? */
    private function doctorBusyAt(int $doctorId, string $date, string $time, ?int $excludeId): bool
    {
        $sql = "SELECT 1 FROM appointment
                 WHERE doctor_user_id = ? AND appointment_date = ?
                   AND start_time <= ? AND end_time > ?
                   AND status IN ('pending', 'confirmed', 'in_progress', 'completed')";
        $params = [$doctorId, $date, $time . ':00', $time . ':00'];

        if ($excludeId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $excludeId;
        }

        $stmt = $this->db->prepare($sql . ' LIMIT 1');
        $stmt->execute($params);

        return $stmt->fetchColumn() !== false;
    }

    /**
     * A patient cannot be in two places at once, even with different doctors.
     *
     * The unique index only catches identical start times; this catches partial
     * overlaps too (10:00-10:30 against 10:15-10:45).
     *
     * @return string|null The clashing start time as HH:MM, or null if free.
     */
    private function patientClash(int $patientId, string $date, int $startMin, int $endMin, ?int $excludeId): ?string
    {
        $sql = "SELECT start_time, end_time FROM appointment
                 WHERE patient_user_id = ? AND appointment_date = ?
                   AND status IN ('pending', 'confirmed', 'in_progress', 'completed')";
        $params = [$patientId, $date];

        if ($excludeId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        foreach ($stmt->fetchAll() as $row) {
            $otherStart = $this->toMinutes(substr((string) $row['start_time'], 0, 5));
            $otherEnd   = $this->toMinutes(substr((string) $row['end_time'], 0, 5));

            if ($startMin < $otherEnd && $endMin > $otherStart) {
                return substr((string) $row['start_time'], 0, 5);
            }
        }

        return null;
    }

    // =========================================================================
    // Rows and shaping
    // =========================================================================

    private function baseSelect(): string
    {
        return "SELECT a.id, a.patient_user_id, a.doctor_user_id, a.appointment_date,
                       a.start_time, a.end_time, a.duration_minutes, a.status, a.type,
                       a.reason, a.notes, a.decision_reason, a.created_by_user_id,
                       a.created_at, a.updated_at,
                       pu.name AS patient_name, pu.email AS patient_email,
                       du.name AS doctor_name,
                       s.name  AS specialty
                  FROM appointment a
                  JOIN `user` pu ON pu.id = a.patient_user_id
                  JOIN `user` du ON du.id = a.doctor_user_id
                  LEFT JOIN user_profile dp ON dp.user_id = a.doctor_user_id
                  LEFT JOIN specialty     s ON s.id = dp.specialty_id";
    }

    private function findRow(int $id): ?array
    {
        $stmt = $this->db->prepare($this->baseSelect() . ' WHERE a.id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /**
     * Fetch an appointment the caller is allowed to see, or an error array.
     *
     * @return array{row:array}|array{success:bool,error:string,status?:int}
     */
    private function loadFor(array $me, $rawId): array
    {
        $id = $this->cleanId($rawId);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid id is required.'];
        }

        $row = $this->findRow($id);
        if ($row === null || !$this->canView($me, $row)) {
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }

        return ['row' => $row];
    }

    /** Re-read after a write so the client gets the true stored state. */
    private function reload(int $id, array $me, string $message): array
    {
        $row = $this->findRow($id);

        return [
            'success'     => true,
            'message'     => $message,
            'appointment' => $row === null ? null : $this->mapRow($row, $this->isStaff($me)),
        ];
    }

    /**
     * @param bool $includeNotes Clinical notes are staff-only. A patient reading
     *                           their own appointment must not receive them.
     */
    private function mapRow(array $r, bool $includeNotes): array
    {
        return [
            'id'             => (int) $r['id'],
            'patientId'      => (int) $r['patient_user_id'],
            'patientName'    => $r['patient_name'],
            'doctorId'       => (int) $r['doctor_user_id'],
            'doctorName'     => $r['doctor_name'],
            'specialty'      => $r['specialty'] ?? 'General Practice',
            'date'           => $r['appointment_date'],
            'time'           => substr((string) $r['start_time'], 0, 5),
            'endTime'        => substr((string) $r['end_time'], 0, 5),
            'duration'       => (int) $r['duration_minutes'],
            'status'         => $r['status'],
            'type'           => $r['type'],
            'reason'         => $r['reason'],
            'decisionReason' => $r['decision_reason'],
            'notes'          => $includeNotes ? $r['notes'] : null,
            'createdAt'      => substr((string) $r['created_at'], 0, 10),
        ];
    }

    private function hasStarted(array $row): bool
    {
        return $row['appointment_date'] . ' ' . $row['start_time'] <= date('Y-m-d H:i:s');
    }

    // =========================================================================
    // Validation helpers
    // =========================================================================

    /** @return list<string> */
    private function allStatuses(): array
    {
        return ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'];
    }

    private function cleanId($raw): ?int
    {
        if (is_int($raw)) {
            return $raw > 0 ? $raw : null;
        }
        if (is_string($raw) && ctype_digit($raw) && (int) $raw > 0) {
            return (int) $raw;
        }

        return null;
    }

    private function cleanDate($raw): ?string
    {
        if (!is_string($raw)) {
            return null;
        }

        $d = DateTime::createFromFormat('Y-m-d', $raw);

        // createFromFormat accepts 2026-02-31 and rolls it over, so compare back.
        return ($d && $d->format('Y-m-d') === $raw) ? $raw : null;
    }

    private function cleanTime($raw): ?string
    {
        if (!is_string($raw) || !preg_match('/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/', $raw, $m)) {
            return null;
        }

        return $m[1] . ':' . $m[2];
    }

    private function cleanReason($raw): ?string
    {
        if (!is_string($raw)) {
            return null;
        }
        $reason = trim($raw);

        return $reason === '' ? null : $reason;
    }

    /** @return string|null|false `false` means "too long". */
    private function cleanDecisionReason($raw)
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (!is_string($raw)) {
            return false;
        }
        $reason = trim($raw);
        if ($reason === '') {
            return null;
        }

        return mb_strlen($reason) > self::MAX_DECISION_REASON ? false : $reason;
    }

    private function toMinutes(string $hhmm): int
    {
        [$h, $m] = array_pad(explode(':', $hhmm), 2, '0');

        return ((int) $h) * 60 + (int) $m;
    }

    private function inclusiveDays(string $from, string $to): int
    {
        return (new DateTimeImmutable($from))->diff(new DateTimeImmutable($to))->days + 1;
    }

    private function isDuplicateKey(PDOException $e): bool
    {
        return isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062;
    }

    // =========================================================================
    // Auth — same placeholder as the other controllers. `Bearer token_<id>` is
    // client-minted and forgeable; kept in one place for the eventual JWT swap.
    // =========================================================================

    /** @var array{id:int,roles:list<string>}|null|false */
    private $cachedMe = false;

    /** @return array{id:int,roles:list<string>}|null */
    private function me(): ?array
    {
        if ($this->cachedMe !== false) {
            return $this->cachedMe;
        }

        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return $this->cachedMe = null;
        }

        $stmt = $this->db->prepare('SELECT id, roles FROM `user` WHERE id = ?');
        $stmt->execute([(int) $m[1]]);
        $row = $stmt->fetch();

        if ($row === false) {
            return $this->cachedMe = null;
        }

        $roles = json_decode((string) $row['roles'], true);

        return $this->cachedMe = [
            'id'    => (int) $row['id'],
            'roles' => is_array($roles) ? $roles : [],
        ];
    }

    private function hasRole(array $me, string $role): bool
    {
        return in_array($role, $me['roles'], true);
    }

    /** Roles from the database, for a user who is not the caller. */
    private function userHasRole(int $userId, string $role): bool
    {
        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return false;
        }

        $decoded = json_decode((string) $roles, true);

        return is_array($decoded) && in_array($role, $decoded, true);
    }

    /** Sees every appointment in the clinic. */
    private function seesAll(array $me): bool
    {
        return $this->hasRole($me, 'ROLE_ADMIN') || $this->hasRole($me, 'ROLE_SECRETARY');
    }

    /** Anyone whose job involves other people's appointments — gates notes. */
    private function isStaff(array $me): bool
    {
        return $this->seesAll($me) || $this->hasRole($me, 'ROLE_DOCTOR');
    }

    private function canView(array $me, array $row): bool
    {
        if ($this->seesAll($me)) {
            return true;
        }
        if ($this->hasRole($me, 'ROLE_DOCTOR') && (int) $row['doctor_user_id'] === $me['id']) {
            return true;
        }

        return (int) $row['patient_user_id'] === $me['id'];
    }
}
