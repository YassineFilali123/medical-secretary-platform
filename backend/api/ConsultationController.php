<?php

/**
 * Live consultations: starting one, running it, asking for more time, ending it.
 *
 * The interesting part is extend(), which decides on its own whether the
 * secretary has to be involved:
 *
 *   no next appointment      -> approve, nobody is affected
 *   fits in the free gap     -> approve, nobody is affected
 *   would displace a patient -> raise a request for the front desk
 *   emergency                -> approve regardless, and tell everyone why
 *
 * Every path writes a schedule_adjustment_request row, including the automatic
 * ones. "The system decided this without asking" is precisely what an audit
 * needs to be able to show.
 */
class ConsultationController
{
    public const REASON_CATEGORIES = [
        'patient_explanation',
        'emergency',
        'additional_examination',
        'other',
    ];

    /** The quick picks the UI offers; any 1-240 is accepted as a custom value. */
    public const PRESET_MINUTES = [5, 10, 15];

    private const MIN_EXTENSION = 1;
    private const MAX_EXTENSION = 240;
    private const MAX_REASON    = 500;

    /**
     * An emergency is not a request for permission.
     *
     * Set to false to make emergencies queue for the secretary like any other
     * conflict — the only behavioural difference is then the wording patients
     * see. Left true because a doctor dealing with an emergency cannot
     * reasonably be made to wait for the front desk to click Approve.
     */
    private const EMERGENCY_BYPASSES_SECRETARY = true;

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
    // POST /api/consultations/start   { appointmentId }
    // =========================================================================
    public function start(array $data): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        $appointment = $this->loadOwned($doctorId, $data['appointmentId'] ?? null);
        if (isset($appointment['error'])) {
            return $appointment;
        }
        $row = $appointment['row'];

        if ($row['status'] === 'in_progress') {
            return ['success' => true, 'message' => 'Consultation already in progress.', 'consultation' => $this->shape($row)];
        }
        if ($row['status'] !== 'confirmed') {
            return [
                'success' => false,
                'error'   => sprintf('Only a confirmed appointment can be started — this one is %s.', $row['status']),
            ];
        }
        if ($row['appointment_date'] !== date('Y-m-d')) {
            return [
                'success' => false,
                'error'   => sprintf('This appointment is scheduled for %s, not today.', $row['appointment_date']),
            ];
        }

        try {
            // Guarded by status in the WHERE clause so two tabs cannot both start it.
            $stmt = $this->db->prepare(
                "UPDATE appointment
                    SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
                  WHERE id = ? AND status = 'confirmed'"
            );
            $stmt->execute([$row['id']]);
        } catch (PDOException $e) {
            // UNIQ_APPT_ONE_LIVE: this doctor already has a consultation running.
            if (isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
                return [
                    'success' => false,
                    'error'   => 'You already have a consultation in progress. End it before starting another.',
                    'status'  => 409,
                ];
            }
            throw $e;
        }

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'error' => 'The appointment changed while you were working on it. Reload and try again.'];
        }

        return [
            'success'      => true,
            'message'      => 'Consultation started.',
            'consultation' => $this->shape($this->findRow((int) $row['id'])),
        ];
    }

    // =========================================================================
    // POST /api/consultations/end   { appointmentId, notes? }
    // =========================================================================
    public function end(array $data): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        $appointment = $this->loadOwned($doctorId, $data['appointmentId'] ?? null);
        if (isset($appointment['error'])) {
            return $appointment;
        }
        $row = $appointment['row'];

        if ($row['status'] !== 'in_progress') {
            return [
                'success' => false,
                'error'   => sprintf('This consultation is not in progress — it is %s.', $row['status']),
            ];
        }

        $notes = null;
        if (array_key_exists('notes', $data)) {
            if (!is_string($data['notes'])) {
                return ['success' => false, 'error' => 'Notes must be text.'];
            }
            $notes = trim($data['notes']);
            if (mb_strlen($notes) > 2000) {
                return ['success' => false, 'error' => 'Notes must be 2000 characters or fewer.'];
            }
            $notes = $notes === '' ? null : $notes;
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "UPDATE appointment
                    SET status = 'completed', ended_at = NOW(),
                        notes = COALESCE(?, notes), updated_at = NOW()
                  WHERE id = ? AND status = 'in_progress'"
            );
            $stmt->execute([$notes, $row['id']]);

            if ($stmt->rowCount() === 0) {
                $this->db->rollBack();

                return ['success' => false, 'error' => 'The consultation changed while you were working on it. Reload and try again.'];
            }

            // A request nobody got round to deciding is moot once the
            // consultation is over — close it rather than leaving it to be
            // approved against an appointment that has finished.
            $stale = $this->db->prepare(
                "UPDATE schedule_adjustment_request
                    SET status = 'cancelled', decided_at = NOW(),
                        decision_note = 'Consultation ended before a decision was made.'
                  WHERE appointment_id = ? AND status = 'pending'"
            );
            $stale->execute([$row['id']]);
            $cancelled = $stale->rowCount();

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'success'           => true,
            'message'           => 'Consultation completed.',
            'cancelledRequests' => $cancelled,
            'consultation'      => $this->shape($this->findRow((int) $row['id'])),
        ];
    }

    // =========================================================================
    // GET /api/consultations/active
    //
    // The doctor's live screen. Returns the running consultation plus what is
    // queued behind it, so the doctor can see who they are keeping waiting.
    // =========================================================================
    public function active(): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        $stmt = $this->db->prepare($this->baseSelect() . " WHERE a.doctor_user_id = ? AND a.status = 'in_progress' LIMIT 1");
        $stmt->execute([$doctorId]);
        $row = $stmt->fetch();

        if ($row === false) {
            return [
                'success'      => true,
                'consultation' => null,
                // Ready to start: today's confirmed appointments, earliest first.
                'upNext'       => $this->todaysQueue($doctorId, null),
                'serverTime'   => date('c'),
            ];
        }

        $pending = $this->db->prepare(
            "SELECT id, requested_minutes, reason, reason_category, is_emergency, created_at
               FROM schedule_adjustment_request
              WHERE appointment_id = ? AND status = 'pending'
              ORDER BY id DESC LIMIT 1"
        );
        $pending->execute([$row['id']]);
        $waiting = $pending->fetch();

        return [
            'success'      => true,
            'consultation' => $this->shape($row),
            'upNext'       => $this->todaysQueue($doctorId, (int) $row['id']),
            'pendingRequest' => $waiting === false ? null : [
                'id'             => (int) $waiting['id'],
                'minutes'        => (int) $waiting['requested_minutes'],
                'reason'         => $waiting['reason'],
                'reasonCategory' => $waiting['reason_category'],
                'isEmergency'    => (bool) $waiting['is_emergency'],
                'createdAt'      => $waiting['created_at'],
            ],
            // The client's clock may be wrong or in another timezone; elapsed
            // and remaining are computed against this.
            'serverTime'   => date('c'),
        ];
    }

    // =========================================================================
    // POST /api/consultations/extend
    //   { appointmentId, minutes, reasonCategory?, reason?, isEmergency? }
    // =========================================================================
    public function extend(array $data): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        $appointment = $this->loadOwned($doctorId, $data['appointmentId'] ?? null);
        if (isset($appointment['error'])) {
            return $appointment;
        }
        $row = $appointment['row'];

        if ($row['status'] !== 'in_progress') {
            return ['success' => false, 'error' => 'Extra time can only be requested during a consultation.'];
        }

        $minutes = $data['minutes'] ?? null;
        if (!is_int($minutes) && !(is_string($minutes) && ctype_digit($minutes))) {
            return ['success' => false, 'error' => 'How many extra minutes?'];
        }
        $minutes = (int) $minutes;
        if ($minutes < self::MIN_EXTENSION || $minutes > self::MAX_EXTENSION) {
            return [
                'success' => false,
                'error'   => sprintf('Extra time must be between %d and %d minutes.', self::MIN_EXTENSION, self::MAX_EXTENSION),
            ];
        }

        $category = $data['reasonCategory'] ?? 'other';
        if (!is_string($category) || !in_array($category, self::REASON_CATEGORIES, true)) {
            return ['success' => false, 'error' => 'Unknown reason category.'];
        }

        $reason = null;
        if (isset($data['reason']) && is_string($data['reason'])) {
            $reason = trim($data['reason']);
            if ($reason === '') {
                $reason = null;
            } elseif (mb_strlen($reason) > self::MAX_REASON) {
                return ['success' => false, 'error' => 'The reason must be ' . self::MAX_REASON . ' characters or fewer.'];
            }
        }

        $isEmergency = !empty($data['isEmergency']) || $category === 'emergency';

        // One open request at a time, or a doctor clicking twice queues two
        // extensions the secretary would approve independently.
        $open = $this->db->prepare(
            "SELECT id FROM schedule_adjustment_request WHERE appointment_id = ? AND status = 'pending' LIMIT 1"
        );
        $open->execute([$row['id']]);
        if ($open->fetchColumn() !== false) {
            return [
                'success' => false,
                'error'   => 'You already have a request waiting with the front desk.',
                'status'  => 409,
            ];
        }

        $plan = $this->adjuster->plan($row, $minutes);
        if (!$plan['ok']) {
            return ['success' => false, 'error' => $plan['error']];
        }

        $autoApprove = $plan['affected'] === []
            || ($isEmergency && self::EMERGENCY_BYPASSES_SECRETARY);

        $requestId = $this->createRequest(
            $row,
            $minutes,
            $category,
            $reason,
            $isEmergency,
            $plan,
            $autoApprove ? 'auto_approved' : 'pending',
            $autoApprove ? $doctorId : null
        );

        if (!$autoApprove) {
            $this->notifySecretaries($row, $minutes, $reason, $category, $isEmergency, $plan, $requestId);

            return [
                'success'     => true,
                'outcome'     => 'needs_approval',
                'requestId'   => $requestId,
                'message'     => sprintf(
                    'This would delay %d later appointment(s), so the front desk has been asked to approve it.',
                    count($plan['affected'])
                ),
                'basis'       => $plan['basis'],
                'affected'    => $plan['affected'],
            ];
        }

        $result = $this->adjuster->apply($row, $minutes, $plan, $doctorId, $requestId, $isEmergency);
        if (!$result['ok']) {
            // The plan could not be committed; the request must not claim it was.
            $this->markRequest($requestId, 'rejected', $doctorId, $result['error']);

            return ['success' => false, 'error' => $result['error']];
        }

        if ($isEmergency && $plan['affected'] !== []) {
            $this->notifySecretaries($row, $minutes, $reason, $category, true, $plan, $requestId, true);
        }

        return [
            'success'      => true,
            'outcome'      => 'approved',
            'requestId'    => $requestId,
            'message'      => $this->autoApproveMessage($plan, $minutes, $isEmergency),
            'basis'        => $plan['basis'],
            'affected'     => $plan['affected'],
            'consultation' => $this->shape($this->findRow((int) $row['id'])),
        ];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function autoApproveMessage(array $plan, int $minutes, bool $isEmergency): string
    {
        if ($plan['affected'] !== []) {
            return sprintf(
                'Emergency: %d extra minutes applied and %d later appointment(s) moved back. Patients and the front desk have been notified.',
                $minutes,
                count($plan['affected'])
            );
        }

        if ($plan['basis'] === 'no_next') {
            return sprintf('%d extra minutes added. You have nothing scheduled after this.', $minutes);
        }

        return sprintf('%d extra minutes added — it fits in the gap before your next patient.', $minutes);
    }

    private function createRequest(
        array $row,
        int $minutes,
        string $category,
        ?string $reason,
        bool $isEmergency,
        array $plan,
        string $status,
        ?int $decidedBy
    ): int {
        $stmt = $this->db->prepare(
            'INSERT INTO schedule_adjustment_request
                 (appointment_id, doctor_user_id, patient_user_id, requested_minutes, granted_minutes,
                  reason_category, reason, is_emergency, status, decision_basis, affected_count,
                  decided_by_user_id, decided_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ' .
             ($decidedBy === null ? 'NULL' : 'NOW()') . ', NOW())'
        );

        $stmt->execute([
            $row['id'],
            $row['doctor_user_id'],
            $row['patient_user_id'],
            $minutes,
            $status === 'auto_approved' ? $minutes : null,
            $category,
            $reason,
            $isEmergency ? 1 : 0,
            $status,
            $plan['basis'],
            count($plan['affected']),
            $decidedBy,
        ]);

        return (int) $this->db->lastInsertId();
    }

    private function markRequest(int $requestId, string $status, int $actorId, ?string $note): void
    {
        $stmt = $this->db->prepare(
            'UPDATE schedule_adjustment_request
                SET status = ?, decided_by_user_id = ?, decided_at = NOW(), decision_note = ?
              WHERE id = ?'
        );
        $stmt->execute([$status, $actorId, $note, $requestId]);
    }

    private function notifySecretaries(
        array $row,
        int $minutes,
        ?string $reason,
        string $category,
        bool $isEmergency,
        array $plan,
        int $requestId,
        bool $informOnly = false
    ): void {
        $names = array_map(static fn(array $a): string => $a['patientName'], $plan['affected']);

        $title = $informOnly
            ? sprintf('Emergency: %s took %d extra minutes', $row['doctor_name'], $minutes)
            : sprintf('%s needs %d extra minutes', $row['doctor_name'], $minutes);

        $body = sprintf(
            '%s with %s. %s%s %s',
            $informOnly ? 'Applied automatically' : 'Awaiting your approval',
            $row['patient_name'],
            $reason !== null ? $reason . ' ' : '',
            '(' . str_replace('_', ' ', $category) . ').',
            $names === []
                ? 'No other appointments affected.'
                : 'Affects: ' . implode(', ', array_slice($names, 0, 4)) . (count($names) > 4 ? '…' : '')
        );

        $this->notifier->sendMany($this->notifier->secretaryIds(), [
            'type'        => $isEmergency ? Notifier::EMERGENCY : Notifier::EXTENSION_REQUESTED,
            'title'       => $title,
            'body'        => $body,
            'relatedType' => 'adjustment_request',
            'relatedId'   => $requestId,
            'urgent'      => $isEmergency,
        ]);
    }

    /** Today's remaining appointments for this doctor, earliest first. */
    private function todaysQueue(int $doctorId, ?int $excludeId): array
    {
        $sql = $this->baseSelect() .
            " WHERE a.doctor_user_id = ? AND a.appointment_date = ?
                AND a.status IN ('confirmed', 'pending')";
        $params = [$doctorId, date('Y-m-d')];

        if ($excludeId !== null) {
            $sql .= ' AND a.id <> ?';
            $params[] = $excludeId;
        }

        $sql .= ' ORDER BY a.start_time ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return array_map(fn(array $r): array => $this->shape($r), $stmt->fetchAll());
    }

    private function baseSelect(): string
    {
        return "SELECT a.id, a.patient_user_id, a.doctor_user_id, a.appointment_date,
                       a.start_time, a.end_time, a.duration_minutes, a.status, a.type,
                       a.reason, a.notes, a.started_at, a.ended_at, a.original_end_time,
                       a.extended_minutes, a.delayed_minutes,
                       pu.name AS patient_name, du.name AS doctor_name
                  FROM appointment a
                  JOIN `user` pu ON pu.id = a.patient_user_id
                  JOIN `user` du ON du.id = a.doctor_user_id";
    }

    private function findRow(int $id): ?array
    {
        $stmt = $this->db->prepare($this->baseSelect() . ' WHERE a.id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    private function shape(?array $r): ?array
    {
        if ($r === null) {
            return null;
        }

        $date  = $r['appointment_date'];
        $start = substr((string) $r['start_time'], 0, 5);
        $end   = substr((string) $r['end_time'], 0, 5);

        return [
            'appointmentId'   => (int) $r['id'],
            'patientId'       => (int) $r['patient_user_id'],
            'patientName'     => $r['patient_name'],
            'doctorId'        => (int) $r['doctor_user_id'],
            'doctorName'      => $r['doctor_name'],
            'date'            => $date,
            'startTime'       => $start,
            'endTime'         => $end,
            'originalEndTime' => $r['original_end_time'] === null ? null : substr((string) $r['original_end_time'], 0, 5),
            'duration'        => (int) $r['duration_minutes'],
            'extendedMinutes' => (int) $r['extended_minutes'],
            'delayedMinutes'  => (int) $r['delayed_minutes'],
            'status'          => $r['status'],
            'type'            => $r['type'],
            'reason'          => $r['reason'],
            'notes'           => $r['notes'],
            // Absolute instants so the client can compute elapsed and remaining
            // without assuming its own clock agrees with the server's.
            'scheduledStart'  => $date . 'T' . $start . ':00',
            'scheduledEnd'    => $date . 'T' . $end . ':00',
            'startedAt'       => $r['started_at'],
            'endedAt'         => $r['ended_at'],
        ];
    }

    /**
     * @return array{row:array}|array{success:bool,error:string,status?:int}
     */
    private function loadOwned(int $doctorId, $rawId): array
    {
        if (!is_int($rawId) && !(is_string($rawId) && ctype_digit($rawId))) {
            return ['success' => false, 'error' => 'A valid appointmentId is required.'];
        }

        $row = $this->findRow((int) $rawId);
        if ($row === null || (int) $row['doctor_user_id'] !== $doctorId) {
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }

        return ['row' => $row];
    }

    /** @return int|array The doctor's id, or an error array to return as-is. */
    private function currentDoctorId()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([(int) $m[1]]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $decoded = json_decode((string) $roles, true);
        if (!is_array($decoded) || !in_array('ROLE_DOCTOR', $decoded, true)) {
            return ['success' => false, 'error' => 'Only doctors run consultations.', 'status' => 403];
        }

        return (int) $m[1];
    }
}
