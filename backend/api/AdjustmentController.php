<?php

/**
 * Schedule adjustment requests: the front desk's queue, and the audit trail.
 *
 * Secretaries decide; doctors and admins can read. A secretary may approve for
 * fewer minutes than were asked for, which is the whole point of "modify" —
 * granting 5 of a requested 15 often keeps the day on track.
 */
class AdjustmentController
{
    private const MAX_NOTE = 500;

    private PDO $db;
    private Notifier $notifier;
    private ScheduleAdjuster $adjuster;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->notifier = new Notifier($this->db);
        $this->adjuster = new ScheduleAdjuster($this->db, $this->notifier);
    }

    // =========================================================================
    // GET /api/adjustments[?status=pending&limit=100]
    // =========================================================================
    public function index(array $query): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $where  = [];
        $params = [];

        // A doctor sees their own requests; the front desk and admins see all.
        if (!$this->isStaff($me)) {
            if (!in_array('ROLE_DOCTOR', $me['roles'], true)) {
                return ['success' => false, 'error' => 'Staff access required.', 'status' => 403];
            }
            $where[]  = 'r.doctor_user_id = ?';
            $params[] = $me['id'];
        }

        $rawStatus = $query['status'] ?? null;
        if (is_string($rawStatus) && $rawStatus !== '' && $rawStatus !== 'all') {
            $allowed = ['auto_approved', 'pending', 'approved', 'rejected', 'cancelled'];
            if (!in_array($rawStatus, $allowed, true)) {
                return ['success' => false, 'error' => 'Unknown status filter.'];
            }
            $where[]  = 'r.status = ?';
            $params[] = $rawStatus;
        }

        $limit = 100;
        if (isset($query['limit']) && is_string($query['limit']) && ctype_digit($query['limit'])) {
            $limit = max(1, min((int) $query['limit'], 500));
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT r.*, du.name AS doctor_name, pu.name AS patient_name,
                    a.appointment_date, a.start_time, a.end_time, a.status AS appointment_status,
                    decider.name AS decided_by_name
               FROM schedule_adjustment_request r
               JOIN `user` du ON du.id = r.doctor_user_id
               JOIN `user` pu ON pu.id = r.patient_user_id
               JOIN appointment a ON a.id = r.appointment_id
               LEFT JOIN `user` decider ON decider.id = r.decided_by_user_id
               {$clause}
              ORDER BY
                   -- Pending first regardless of age: they are the only ones
                   -- anybody has to act on.
                   CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
                   r.is_emergency DESC,
                   r.id DESC
              LIMIT {$limit}"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $pendingCount = 0;
        $requests = [];
        foreach ($rows as $row) {
            if ($row['status'] === 'pending') {
                $pendingCount++;
            }
            $requests[] = $this->shape($row);
        }

        return ['success' => true, 'requests' => $requests, 'pendingCount' => $pendingCount];
    }

    // =========================================================================
    // POST /api/adjustments/decide
    //   { id, decision: "approve"|"reject", minutes?, note? }
    //
    // `minutes` lets the secretary grant less (or more) than was asked for.
    // =========================================================================
    public function decide(array $data): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        if (!in_array('ROLE_SECRETARY', $me['roles'], true)) {
            return [
                'success' => false,
                'error'   => 'Only a secretary can decide schedule adjustment requests.',
                'status'  => 403,
            ];
        }

        $id = $data['id'] ?? null;
        if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
            return ['success' => false, 'error' => 'A valid request id is required.'];
        }
        $id = (int) $id;

        $decision = $data['decision'] ?? null;
        if (!is_string($decision) || !in_array($decision, ['approve', 'reject'], true)) {
            return ['success' => false, 'error' => 'Decision must be approve or reject.'];
        }

        $note = null;
        if (isset($data['note']) && is_string($data['note'])) {
            $note = trim($data['note']);
            if ($note === '') {
                $note = null;
            } elseif (mb_strlen($note) > self::MAX_NOTE) {
                return ['success' => false, 'error' => 'The note must be ' . self::MAX_NOTE . ' characters or fewer.'];
            }
        }

        $stmt = $this->db->prepare(
            'SELECT r.*, du.name AS doctor_name, pu.name AS patient_name
               FROM schedule_adjustment_request r
               JOIN `user` du ON du.id = r.doctor_user_id
               JOIN `user` pu ON pu.id = r.patient_user_id
              WHERE r.id = ?'
        );
        $stmt->execute([$id]);
        $request = $stmt->fetch();

        if ($request === false) {
            return ['success' => false, 'error' => 'Request not found.', 'status' => 404];
        }
        if ($request['status'] !== 'pending') {
            return [
                'success' => false,
                'error'   => sprintf('This request has already been %s.', $request['status']),
            ];
        }

        if ($decision === 'reject') {
            $this->close($id, 'rejected', $me['id'], $note, null);

            $this->notifier->send((int) $request['doctor_user_id'], [
                'type'        => Notifier::EXTENSION_REJECTED,
                'title'       => sprintf('Extra time declined (%d min)', (int) $request['requested_minutes']),
                'body'        => $note ?? 'The front desk could not fit the extension into the schedule.',
                'relatedType' => 'adjustment_request',
                'relatedId'   => $id,
            ]);

            return ['success' => true, 'message' => 'Request rejected. The doctor has been notified.'];
        }

        // Approving: the secretary may grant a different amount.
        $minutes = (int) $request['requested_minutes'];
        if (isset($data['minutes']) && $data['minutes'] !== null && $data['minutes'] !== '') {
            if (!is_int($data['minutes']) && !(is_string($data['minutes']) && ctype_digit($data['minutes']))) {
                return ['success' => false, 'error' => 'Minutes must be a number.'];
            }
            $minutes = (int) $data['minutes'];
            if ($minutes < 1 || $minutes > 240) {
                return ['success' => false, 'error' => 'Granted time must be between 1 and 240 minutes.'];
            }
        }

        $appointment = $this->loadAppointment((int) $request['appointment_id']);
        if ($appointment === null) {
            return ['success' => false, 'error' => 'The appointment no longer exists.', 'status' => 404];
        }
        if ($appointment['status'] !== 'in_progress') {
            // It ended, or was cancelled, while the request sat in the queue.
            $this->close($id, 'cancelled', $me['id'], 'The consultation was no longer running.', null);

            return [
                'success' => false,
                'error'   => sprintf('That consultation is no longer running (it is %s). The request has been closed.', $appointment['status']),
            ];
        }

        // Re-planned against the schedule as it is NOW, not as it was when the
        // doctor asked. Minutes may have been granted elsewhere in between, and
        // approving a stale plan would move the wrong appointments.
        $plan = $this->adjuster->plan($appointment, $minutes);
        if (!$plan['ok']) {
            return ['success' => false, 'error' => $plan['error']];
        }

        $result = $this->adjuster->apply(
            $appointment,
            $minutes,
            $plan,
            $me['id'],
            $id,
            (bool) $request['is_emergency']
        );

        if (!$result['ok']) {
            return ['success' => false, 'error' => $result['error']];
        }

        $this->close($id, 'approved', $me['id'], $note, $minutes);

        $this->notifier->send((int) $request['doctor_user_id'], [
            'type'  => Notifier::EXTENSION_APPROVED,
            'title' => $minutes === (int) $request['requested_minutes']
                ? sprintf('Extra time approved (%d min)', $minutes)
                : sprintf('Extra time approved — %d min of the %d you asked for', $minutes, (int) $request['requested_minutes']),
            'body'        => $note ?? sprintf('%d later appointment(s) were moved back.', $result['shifted']),
            'relatedType' => 'appointment',
            'relatedId'   => (int) $request['appointment_id'],
        ]);

        return [
            'success'  => true,
            'message'  => sprintf(
                'Approved %d minutes. %d appointment(s) moved.',
                $minutes,
                $result['shifted']
            ),
            'granted'  => $minutes,
            'shifted'  => $result['shifted'],
            'affected' => $plan['affected'],
        ];
    }

    // =========================================================================
    // GET /api/adjustments/history?appointmentId=12
    //
    // The audit trail for one appointment: every time it moved, why, and who.
    // =========================================================================
    public function history(array $query): array
    {
        $me = $this->me();
        if ($me === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $rawId = $query['appointmentId'] ?? null;
        if (!is_string($rawId) || !ctype_digit($rawId)) {
            return ['success' => false, 'error' => 'A valid appointmentId is required.'];
        }
        $appointmentId = (int) $rawId;

        $stmt = $this->db->prepare('SELECT doctor_user_id, patient_user_id FROM appointment WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch();

        if ($appointment === false) {
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }

        $mayRead = $this->isStaff($me)
            || (int) $appointment['doctor_user_id'] === $me['id']
            || (int) $appointment['patient_user_id'] === $me['id'];

        if (!$mayRead) {
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }

        $stmt = $this->db->prepare(
            'SELECT h.*, u.name AS changed_by_name, r.reason, r.reason_category, r.is_emergency
               FROM appointment_delay_history h
               JOIN `user` u ON u.id = h.changed_by_user_id
               LEFT JOIN schedule_adjustment_request r ON r.id = h.adjustment_request_id
              WHERE h.appointment_id = ?
              ORDER BY h.id ASC'
        );
        $stmt->execute([$appointmentId]);

        return [
            'success' => true,
            'history' => array_map(static function (array $r): array {
                return [
                    'id'             => (int) $r['id'],
                    'requestId'      => $r['adjustment_request_id'] === null ? null : (int) $r['adjustment_request_id'],
                    'changeType'     => $r['change_type'],
                    'from'           => [
                        'date'  => $r['previous_date'],
                        'start' => substr((string) $r['previous_start_time'], 0, 5),
                        'end'   => substr((string) $r['previous_end_time'], 0, 5),
                    ],
                    'to'             => [
                        'date'  => $r['new_date'],
                        'start' => substr((string) $r['new_start_time'], 0, 5),
                        'end'   => substr((string) $r['new_end_time'], 0, 5),
                    ],
                    'delayMinutes'   => (int) $r['delay_minutes'],
                    'changedBy'      => $r['changed_by_name'],
                    'reason'         => $r['reason'],
                    'reasonCategory' => $r['reason_category'],
                    'isEmergency'    => (bool) $r['is_emergency'],
                    'createdAt'      => $r['created_at'],
                ];
            }, $stmt->fetchAll()),
        ];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function close(int $id, string $status, int $actorId, ?string $note, ?int $granted): void
    {
        $stmt = $this->db->prepare(
            'UPDATE schedule_adjustment_request
                SET status = ?, granted_minutes = ?, decided_by_user_id = ?,
                    decided_at = NOW(), decision_note = ?
              WHERE id = ? AND status = \'pending\''
        );
        $stmt->execute([$status, $granted, $actorId, $note, $id]);
    }

    private function loadAppointment(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT a.*, pu.name AS patient_name, du.name AS doctor_name
               FROM appointment a
               JOIN `user` pu ON pu.id = a.patient_user_id
               JOIN `user` du ON du.id = a.doctor_user_id
              WHERE a.id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    private function shape(array $r): array
    {
        return [
            'id'              => (int) $r['id'],
            'appointmentId'   => (int) $r['appointment_id'],
            'doctorId'        => (int) $r['doctor_user_id'],
            'doctorName'      => $r['doctor_name'],
            'patientId'       => (int) $r['patient_user_id'],
            'patientName'     => $r['patient_name'],
            'requestedMinutes' => (int) $r['requested_minutes'],
            'grantedMinutes'  => $r['granted_minutes'] === null ? null : (int) $r['granted_minutes'],
            'reason'          => $r['reason'],
            'reasonCategory'  => $r['reason_category'],
            'isEmergency'     => (bool) $r['is_emergency'],
            'status'          => $r['status'],
            'decisionBasis'   => $r['decision_basis'],
            'affectedCount'   => (int) $r['affected_count'],
            'decidedBy'       => $r['decided_by_name'],
            'decidedAt'       => $r['decided_at'],
            'decisionNote'    => $r['decision_note'],
            'createdAt'       => $r['created_at'],
            'appointment'     => [
                'date'   => $r['appointment_date'],
                'start'  => substr((string) $r['start_time'], 0, 5),
                'end'    => substr((string) $r['end_time'], 0, 5),
                'status' => $r['appointment_status'],
            ],
        ];
    }

    /** @return array{id:int,roles:list<string>}|null */
    private function me(): ?array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return null;
        }

        $stmt = $this->db->prepare('SELECT id, roles FROM `user` WHERE id = ?');
        $stmt->execute([(int) $m[1]]);
        $row = $stmt->fetch();

        if ($row === false) {
            return null;
        }

        $roles = json_decode((string) $row['roles'], true);

        return ['id' => (int) $row['id'], 'roles' => is_array($roles) ? $roles : []];
    }

    private function isStaff(array $me): bool
    {
        return in_array('ROLE_SECRETARY', $me['roles'], true)
            || in_array('ROLE_ADMIN', $me['roles'], true);
    }
}
