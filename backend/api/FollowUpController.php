<?php

/**
 * Follow-up appointment recommendations.
 *
 * After a doctor ends a consultation, they can recommend:
 *   - No follow-up needed (type=none)
 *   - A follow-up period like "within 2 weeks" (type=period)
 *
 * For period recommendations, the doctor can also specify availability slots
 * (specific dates + times) within the recommended period. The secretary uses
 * a color-coded calendar to book the patient.
 */
class FollowUpController
{
    public const TYPES = ['none', 'period'];
    public const PRIORITIES = ['routine', 'recommended', 'urgent'];
    public const STATUSES = ['pending', 'accepted', 'booked', 'cancelled', 'expired'];

    public const PERIOD_PRESETS = [
        3   => 'Within 3 days',
        7   => 'Within 1 week',
        14  => 'Within 2 weeks',
        30  => 'Within 1 month',
    ];

    private PDO $db;
    private Notifier $notifier;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->notifier = new Notifier($this->db);
    }

    // =========================================================================
    // POST /api/followups/create
    //   { appointmentId, type, priority?, periodDays?, periodLabel?, note? }
    // =========================================================================
    public function create(array $data): array
    {
        $doctorId = $this->currentUserId(['ROLE_DOCTOR']);
        if (is_array($doctorId)) return $doctorId;

        $appointmentId = $this->intParam($data, 'appointmentId');
        if ($appointmentId === null) {
            return ['success' => false, 'error' => 'A valid appointment ID is required.'];
        }

        // Verify appointment belongs to this doctor and is completed
        $stmt = $this->db->prepare(
            "SELECT a.id, a.patient_user_id, a.status, du.name AS doctor_name, pu.name AS patient_name
               FROM appointment a
               JOIN `user` du ON du.id = a.doctor_user_id
               JOIN `user` pu ON pu.id = a.patient_user_id
              WHERE a.id = ? AND a.doctor_user_id = ?"
        );
        $stmt->execute([$appointmentId, $doctorId]);
        $appt = $stmt->fetch();

        if ($appt === false) {
            return ['success' => false, 'error' => 'Appointment not found.', 'status' => 404];
        }

        $type = $data['type'] ?? 'none';
        if (!in_array($type, self::TYPES, true)) {
            return ['success' => false, 'error' => 'Invalid follow-up type.'];
        }

        $priority = $data['priority'] ?? 'routine';
        if (!in_array($priority, self::PRIORITIES, true)) {
            return ['success' => false, 'error' => 'Invalid priority level.'];
        }

        // Parse type-specific fields
        $periodDays = null;
        $periodLabel = null;
        $expiresAt = null;

        if ($type === 'period') {
            $periodDays = $this->intParam($data, 'periodDays');
            if ($periodDays === null || $periodDays < 1 || $periodDays > 30) {
                return ['success' => false, 'error' => 'Period must be between 1 and 30 days.'];
            }
            $periodLabel = $data['periodLabel'] ?? (self::PERIOD_PRESETS[$periodDays] ?? "Within $periodDays days");
            $expiresAt = date('Y-m-d H:i:s', strtotime("+$periodDays days"));
        }

        $note = null;
        if (isset($data['note']) && is_string($data['note'])) {
            $note = trim($data['note']);
            $note = $note === '' ? null : mb_substr($note, 0, 1000);
        }

        // Check if a follow-up already exists for this appointment
        $existing = $this->db->prepare(
            'SELECT id FROM follow_up_recommendation WHERE appointment_id = ? LIMIT 1'
        );
        $existing->execute([$appointmentId]);
        $existingId = $existing->fetchColumn();

        if ($existingId !== false) {
            // Update existing
            $this->db->prepare(
                "UPDATE follow_up_recommendation
                    SET type = ?, priority = ?, period_days = ?, period_label = ?,
                        note = ?, status = 'pending', expires_at = ?, updated_at = NOW()
                  WHERE appointment_id = ?"
            )->execute([
                $type, $priority, $periodDays, $periodLabel,
                $note, $expiresAt, $appointmentId,
            ]);
            $followUpId = (int) $existingId;
        } else {
            $this->db->prepare(
                "INSERT INTO follow_up_recommendation
                     (appointment_id, doctor_user_id, patient_user_id, type, priority,
                      period_days, period_label, note, status, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
            )->execute([
                $appointmentId, $doctorId, (int) $appt['patient_user_id'],
                $type, $priority, $periodDays, $periodLabel, $note, $expiresAt,
            ]);
            $followUpId = (int) $this->db->lastInsertId();
        }

        // Notify patient for period recommendations
        if ($type === 'period') {
            $this->notifier->send((int) $appt['patient_user_id'], [
                'type'        => Notifier::FOLLOWUP_RECOMMENDED,
                'title'       => 'Follow-up appointment recommended',
                'body'        => sprintf(
                    'Your doctor recommends scheduling a follow-up appointment %s. Please choose an available date and time.%s',
                    strtolower($periodLabel),
                    $note ? ' Note: ' . mb_substr($note, 0, 80) : ''
                ),
                'relatedType' => 'follow_up',
                'relatedId'   => $followUpId,
                'urgent'      => $priority === 'urgent',
            ]);
        }

        return ['success' => true, 'message' => 'Follow-up recommendation saved.'];
    }

    // =========================================================================
    // GET /api/followups/doctor
    // Doctor's follow-up recommendations (recent).
    // =========================================================================
    public function doctorList(array $query): array
    {
        $doctorId = $this->currentUserId(['ROLE_DOCTOR']);
        if (is_array($doctorId)) return $doctorId;

        $stmt = $this->db->prepare(
            "SELECT f.*, pu.name AS patient_name, pp.avatar_url AS patient_avatar
               FROM follow_up_recommendation f
               JOIN `user` pu ON pu.id = f.patient_user_id
               LEFT JOIN user_profile pp ON pp.user_id = f.patient_user_id
              WHERE f.doctor_user_id = ?
              ORDER BY f.created_at DESC
              LIMIT 50"
        );
        $stmt->execute([$doctorId]);

        return [
            'success'      => true,
            'followUps'    => array_map(fn($r) => $this->shape($r), $stmt->fetchAll()),
        ];
    }

    // =========================================================================
    // GET /api/followups/patient
    // Patient's follow-up recommendations.
    // =========================================================================
    public function patientList(): array
    {
        $patientId = $this->currentUserId(['ROLE_PATIENT']);
        if (is_array($patientId)) return $patientId;

        $stmt = $this->db->prepare(
            "SELECT f.*, du.name AS doctor_name, dp.avatar_url AS doctor_avatar
               FROM follow_up_recommendation f
               JOIN `user` du ON du.id = f.doctor_user_id
               LEFT JOIN user_profile dp ON dp.user_id = f.doctor_user_id
              WHERE f.patient_user_id = ?
              ORDER BY
                FIELD(f.status, 'pending', 'accepted', 'booked', 'cancelled', 'expired'),
                FIELD(f.priority, 'urgent', 'recommended', 'routine'),
                f.created_at DESC"
        );
        $stmt->execute([$patientId]);

        return [
            'success'   => true,
            'followUps' => array_map(fn($r) => $this->shape($r), $stmt->fetchAll()),
        ];
    }

    // =========================================================================
    // GET /api/followups/secretary
    // Secretary sees all pending follow-up recommendations.
    // =========================================================================
    public function secretaryList(): array
    {
        $secretaryId = $this->currentUserId(['ROLE_SECRETARY']);
        if (is_array($secretaryId)) return $secretaryId;

        $stmt = $this->db->prepare(
            "SELECT f.*, du.name AS doctor_name, dp.avatar_url AS doctor_avatar,
                    pu.name AS patient_name, pp.avatar_url AS patient_avatar
               FROM follow_up_recommendation f
               JOIN `user` du ON du.id = f.doctor_user_id
               JOIN `user` pu ON pu.id = f.patient_user_id
               LEFT JOIN user_profile dp ON dp.user_id = f.doctor_user_id
               LEFT JOIN user_profile pp ON pp.user_id = f.patient_user_id
              WHERE f.type = 'period'
              ORDER BY
                FIELD(f.status, 'pending', 'booked', 'cancelled', 'expired'),
                FIELD(f.priority, 'urgent', 'recommended', 'routine'),
                f.created_at DESC
              LIMIT 100"
        );
        $stmt->execute();

        return [
            'success'   => true,
            'followUps' => array_map(fn($r) => $this->shape($r), $stmt->fetchAll()),
        ];
    }

    // =========================================================================
    // GET /api/followups/calendar?id={followUpId}
    // Returns color-coded calendar data for a follow-up recommendation.
    // Green = within recommended follow-up period. Red = outside the period.
    // Also returns working hours, available slots, time off, existing
    // appointments per day. Range is 90 days so the secretary can browse
    // beyond the deadline and still see the doctor's schedule.
    // =========================================================================
    public function calendar(array $query): array
    {
        $userId = $this->currentUserId(['ROLE_SECRETARY', 'ROLE_DOCTOR', 'ROLE_PATIENT']);
        if (is_array($userId)) return $userId;

        $followUpId = $this->intParam($query, 'id');
        if ($followUpId === null) {
            return ['success' => false, 'error' => 'A valid follow-up ID is required.'];
        }

        $row = $this->findFollowUp($followUpId);
        if ($row === null) {
            return ['success' => false, 'error' => 'Follow-up not found.', 'status' => 404];
        }

        $expiresAt    = $row['expires_at'];
        $doctorId     = (int) $row['doctor_user_id'];
        $today        = date('Y-m-d');

        // Period deadline: used only for green/red colouring, not to cap the range.
        $deadlineDate = $expiresAt ? date('Y-m-d', strtotime($expiresAt)) : null;

        // Always fetch 90 days so the secretary can navigate past the deadline
        // and still see the doctor's schedule.
        $endDate = date('Y-m-d', strtotime('+89 days'));

        // Fetch range needed for appointments / slots
        $rangeEnd = max($endDate, $deadlineDate ?? $endDate);

        // Get doctor's weekly schedule
        $schedStmt = $this->db->prepare(
            'SELECT day_of_week, is_enabled, start_time, end_time, slot_minutes
               FROM doctor_availability
              WHERE doctor_user_id = ?'
        );
        $schedStmt->execute([$doctorId]);
        $weeklySchedule = [];
        foreach ($schedStmt->fetchAll() as $s) {
            $weeklySchedule[(int) $s['day_of_week']] = [
                'isEnabled'   => (bool) $s['is_enabled'],
                'start'       => substr((string) $s['start_time'], 0, 5),
                'end'         => substr((string) $s['end_time'], 0, 5),
                'slotMinutes' => (int) $s['slot_minutes'],
            ];
        }

        // Get doctor's time off
        $timeOffStmt = $this->db->prepare(
            'SELECT start_date, end_date FROM doctor_time_off WHERE doctor_user_id = ?'
        );
        $timeOffStmt->execute([$doctorId]);
        $timeOffRanges = $timeOffStmt->fetchAll();

        // Get existing appointments for the doctor across the full display range
        $apptStmt = $this->db->prepare(
            "SELECT appointment_date, start_time, end_time, status
               FROM appointment
              WHERE doctor_user_id = ?
                AND appointment_date BETWEEN ? AND ?
                AND status IN ('pending', 'confirmed', 'in-progress')"
        );
        $apptStmt->execute([$doctorId, $today, $rangeEnd]);
        $existingAppts = [];
        foreach ($apptStmt->fetchAll() as $a) {
            $dateKey = $a['appointment_date'];
            if (!isset($existingAppts[$dateKey])) {
                $existingAppts[$dateKey] = [];
            }
            $existingAppts[$dateKey][] = [
                'start'  => substr($a['start_time'], 0, 5),
                'end'    => substr($a['end_time'], 0, 5),
                'status' => $a['status'],
            ];
        }

        // Build calendar days
        $days    = [];
        $current = strtotime($today);
        $end     = strtotime($endDate);

        while ($current <= $end) {
            $dateStr   = date('Y-m-d', $current);
            $dayOfWeek = (int) date('w', $current);

            // Working hours from weekly schedule
            $schedule       = $weeklySchedule[$dayOfWeek] ?? null;
            $workingHours   = null;
            $availableSlots = [];
            $isFullyBooked  = false;

            if ($schedule && $schedule['isEnabled']) {
                $workingHours = ['start' => $schedule['start'], 'end' => $schedule['end']];

                // Compute all slots for this day
                $allSlots  = $this->buildDaySlots(
                    $schedule['start'],
                    $schedule['end'],
                    $schedule['slotMinutes']
                );

                // Remove already-booked slots
                $bookedRaw = $existingAppts[$dateStr] ?? [];
                $availableSlots = $this->filterAvailableSlots($allSlots, $bookedRaw);

                // Fully booked when there are appointments but no free slots left
                $totalSlots = count($allSlots);
                if ($totalSlots > 0) {
                    $isFullyBooked = count($availableSlots) === 0;
                }
            }

            // Check time off
            $isTimeOff = false;
            foreach ($timeOffRanges as $tr) {
                if ($dateStr >= $tr['start_date'] && $dateStr <= $tr['end_date']) {
                    $isTimeOff      = true;
                    $availableSlots = []; // No slots on time-off days
                    break;
                }
            }

            // Status: green = within follow-up period deadline, red = outside
            $status = ($deadlineDate === null || $dateStr <= $deadlineDate) ? 'green' : 'red';

            $apptCount = isset($existingAppts[$dateStr]) ? count($existingAppts[$dateStr]) : 0;

            $days[] = [
                'date'                 => $dateStr,
                'dayOfWeek'            => $dayOfWeek,
                'status'               => $status,
                'isTimeOff'            => $isTimeOff,
                'workingHours'         => $workingHours,
                'availableSlots'       => $availableSlots,
                'existingAppointments' => $existingAppts[$dateStr] ?? [],
                'appointmentCount'     => $apptCount,
                'isFullyBooked'        => $isFullyBooked,
            ];
            $current = strtotime('+1 day', $current);
        }

        return [
            'success'  => true,
            'followUp' => $this->shape($row),
            'days'     => $days,
        ];
    }

    /**
     * Split a working window into fixed-length slots (HH:MM strings).
     *
     * @return list<array{start:string,end:string}>
     */
    private function buildDaySlots(string $start, string $end, int $slotMinutes): array
    {
        if ($slotMinutes <= 0) return [];

        $startMin = $this->hhmm2min($start);
        $endMin   = $this->hhmm2min($end);
        $slots    = [];

        for ($cur = $startMin; $cur + $slotMinutes <= $endMin; $cur += $slotMinutes) {
            $slots[] = [
                'start' => $this->min2hhmm($cur),
                'end'   => $this->min2hhmm($cur + $slotMinutes),
            ];
        }

        return $slots;
    }

    /**
     * Return only slots that do not overlap any existing appointment.
     *
     * @param list<array{start:string,end:string}>          $slots
     * @param list<array{start:string,end:string,...}>       $booked
     * @return list<array{start:string,end:string}>
     */
    private function filterAvailableSlots(array $slots, array $booked): array
    {
        if (empty($booked)) return $slots;

        $bookedRanges = array_map(fn($b) => [
            $this->hhmm2min($b['start']),
            $this->hhmm2min($b['end']),
        ], $booked);

        $free = [];
        foreach ($slots as $slot) {
            $s = $this->hhmm2min($slot['start']);
            $e = $this->hhmm2min($slot['end']);
            $clash = false;
            foreach ($bookedRanges as [$bs, $be]) {
                if ($s < $be && $e > $bs) { $clash = true; break; }
            }
            if (!$clash) $free[] = $slot;
        }

        return $free;
    }

    /** "HH:MM" → minutes since midnight. */
    private function hhmm2min(string $hhmm): int
    {
        [$h, $m] = explode(':', substr($hhmm, 0, 5));
        return (int)$h * 60 + (int)$m;
    }

    /** minutes since midnight → "HH:MM". */
    private function min2hhmm(int $min): string
    {
        return sprintf('%02d:%02d', intdiv($min, 60), $min % 60);
    }

    // =========================================================================
    // POST /api/followups/secretary/book
    //   { followUpId, date, time, overrideWarning? }
    // Secretary books an appointment for the patient. overrideWarning allows
    // booking on red/yellow dates.
    // =========================================================================
    public function secretaryBook(array $data): array
    {
        $secretaryId = $this->currentUserId(['ROLE_SECRETARY']);
        if (is_array($secretaryId)) return $secretaryId;

        $followUpId = $this->intParam($data, 'followUpId');
        if ($followUpId === null) {
            return ['success' => false, 'error' => 'A valid follow-up ID is required.'];
        }

        $row = $this->findFollowUp($followUpId);
        if ($row === null) {
            return ['success' => false, 'error' => 'Follow-up not found.', 'status' => 404];
        }
        if ($row['status'] !== 'pending') {
            return ['success' => false, 'error' => 'This recommendation is no longer pending.'];
        }

        $date = $data['date'] ?? null;
        $time = $data['time'] ?? null;
        if (!$date || !$time) {
            return ['success' => false, 'error' => 'Please select a date and time.'];
        }

        $overrideWarning = !empty($data['overrideWarning']);

        // Check if the date is within the recommended follow-up period
        $deadline = $row['expires_at'] ? strtotime($row['expires_at']) : null;
        $chosen = strtotime($date);
        $isWithinPeriod = $deadline === null || $chosen <= $deadline;

        // If outside the recommended period, require override
        if (!$isWithinPeriod && !$overrideWarning) {
            return [
                'success'  => false,
                'error'    => 'This appointment is outside the doctor\'s recommended follow-up period. Are you sure you want to continue?',
                'code'     => 'WARNING_REQUIRED',
                'status'   => 409,
            ];
        }

        if (strtotime($date) < strtotime('today')) {
            return ['success' => false, 'error' => 'Cannot book in the past.'];
        }

        $patientId = (int) $row['patient_user_id'];

        $hasAppt = $this->db->prepare(
            "SELECT 1 FROM appointment
              WHERE patient_user_id = ? AND appointment_date = ?
                AND status IN ('pending', 'confirmed', 'in_progress', 'completed')
              LIMIT 1"
        );
        $hasAppt->execute([$patientId, $date]);
        if ($hasAppt->fetchColumn() !== false) {
            return ['success' => false, 'error' => 'You can only have one appointment per day.'];
        }

        if (preg_match('/^\d{2}:\d{2}$/', $time)) {
            $time .= ':00';
        }

        $doctorId = (int) $row['doctor_user_id'];
        $endTime = date('H:i:s', strtotime($time . ' +30 minutes'));
        $reason = 'Follow-up appointment' . ($row['note'] ? ': ' . $row['note'] : '');

        try {
            $stmt = $this->db->prepare(
                "INSERT INTO appointment
                     (patient_user_id, doctor_user_id, appointment_date, start_time, end_time,
                      duration_minutes, status, type, reason, created_by_user_id, created_at)
                 VALUES (?, ?, ?, ?, ?, 30, 'confirmed', 'follow-up', ?, ?, NOW())"
            );
            $stmt->execute([
                $patientId,
                $doctorId,
                $date,
                $time,
                $endTime,
                $reason,
                $secretaryId,
            ]);
        } catch (PDOException $e) {
            if (isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
                return ['success' => false, 'error' => 'That slot was just taken. Please choose another time.'];
            }
            throw $e;
        }

        $newApptId = (int) $this->db->lastInsertId();

        $this->db->prepare(
            "UPDATE follow_up_recommendation SET status = 'booked', booked_appointment_id = ? WHERE id = ?"
        )->execute([$newApptId, $followUpId]);

        // Notify patient
        $this->notifier->send($patientId, [
            'type'        => Notifier::FOLLOWUP_BOOKED,
            'title'       => 'Follow-up appointment booked',
            'body'        => sprintf(
                'A follow-up appointment has been booked for you on %s at %s.',
                date('M j, Y', strtotime($date)),
                substr($time, 0, 5)
            ),
            'relatedType' => 'follow_up',
            'relatedId'   => $followUpId,
            'urgent'      => false,
        ]);

        // Look up patient name for notification
        $nameStmt = $this->db->prepare('SELECT name FROM `user` WHERE id = ?');
        $nameStmt->execute([$patientId]);
        $patientName = $nameStmt->fetchColumn() ?: 'Patient';

        // Notify doctor
        $this->notifier->send($doctorId, [
            'type'        => Notifier::FOLLOWUP_BOOKED,
            'title'       => 'Follow-up appointment booked',
            'body'        => sprintf(
                'Secretary booked a follow-up for %s on %s at %s.',
                $patientName,
                date('M j, Y', strtotime($date)),
                substr($time, 0, 5)
            ),
            'relatedType' => 'follow_up',
            'relatedId'   => $followUpId,
            'urgent'      => false,
        ]);

        return ['success' => true, 'message' => 'Follow-up appointment booked.', 'appointmentId' => $newApptId];
    }

    // =========================================================================
    // POST /api/followups/book   { followUpId, date, time }
    // Patient books a slot within a period recommendation.
    // =========================================================================
    public function book(array $data): array
    {
        $patientId = $this->currentUserId(['ROLE_PATIENT']);
        if (is_array($patientId)) return $patientId;

        $followUpId = $this->intParam($data, 'followUpId');
        if ($followUpId === null) {
            return ['success' => false, 'error' => 'A valid follow-up ID is required.'];
        }

        $row = $this->findFollowUp($followUpId);
        if ($row === null || (int) $row['patient_user_id'] !== $patientId) {
            return ['success' => false, 'error' => 'Follow-up not found.', 'status' => 404];
        }
        if ($row['type'] !== 'period') {
            return ['success' => false, 'error' => 'Only period recommendations can be booked.'];
        }
        if ($row['status'] !== 'pending') {
            return ['success' => false, 'error' => 'This recommendation is no longer pending.'];
        }

        $date = $data['date'] ?? null;
        $time = $data['time'] ?? null;
        if (!$date || !$time) {
            return ['success' => false, 'error' => 'Please select a date and time.'];
        }

        // Validate within period
        $deadline = strtotime($row['expires_at']);
        $chosen = strtotime($date);
        if ($chosen > $deadline) {
            return ['success' => false, 'error' => 'The selected date is outside the recommended period.'];
        }
        if ($chosen < strtotime('today')) {
            return ['success' => false, 'error' => 'Cannot book in the past.'];
        }

        $hasAppt = $this->db->prepare(
            "SELECT 1 FROM appointment
              WHERE patient_user_id = ? AND appointment_date = ?
                AND status IN ('pending', 'confirmed', 'in_progress', 'completed')
              LIMIT 1"
        );
        $hasAppt->execute([$patientId, $date]);
        if ($hasAppt->fetchColumn() !== false) {
            return ['success' => false, 'error' => 'You can only have one appointment per day.'];
        }

        if (preg_match('/^\d{2}:\d{2}$/', $time)) {
            $time .= ':00';
        }

        // Create a confirmed appointment
        $endTime = date('H:i:s', strtotime($time . ' +30 minutes'));
        $reason = 'Follow-up appointment' . ($row['note'] ? ': ' . $row['note'] : '');

        try {
            $stmt = $this->db->prepare(
                "INSERT INTO appointment
                     (patient_user_id, doctor_user_id, appointment_date, start_time, end_time,
                      duration_minutes, status, type, reason, created_by_user_id, created_at)
                 VALUES (?, ?, ?, ?, ?, 30, 'confirmed', 'follow-up', ?, ?, NOW())"
            );
            $stmt->execute([
                $patientId,
                (int) $row['doctor_user_id'],
                $date,
                $time,
                $endTime,
                $reason,
                $patientId,
            ]);
        } catch (PDOException $e) {
            if (isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
                return ['success' => false, 'error' => 'That slot was just taken. Please choose another time.'];
            }
            throw $e;
        }

        $newApptId = (int) $this->db->lastInsertId();

        $this->db->prepare(
            "UPDATE follow_up_recommendation SET status = 'booked', booked_appointment_id = ? WHERE id = ?"
        )->execute([$newApptId, $followUpId]);

        // Notify doctor
        $stmt = $this->db->prepare('SELECT name FROM `user` WHERE id = ?');
        $stmt->execute([$patientId]);
        $patientName = $stmt->fetchColumn();

        $this->notifier->send((int) $row['doctor_user_id'], [
            'type'        => Notifier::FOLLOWUP_BOOKED,
            'title'       => 'Follow-up appointment booked',
            'body'        => sprintf(
                '%s has booked a follow-up appointment on %s at %s.',
                $patientName,
                date('M j, Y', strtotime($date)),
                substr($time, 0, 5)
            ),
            'relatedType' => 'follow_up',
            'relatedId'   => $followUpId,
            'urgent'      => false,
        ]);

        return ['success' => true, 'message' => 'Follow-up appointment booked.', 'appointmentId' => $newApptId];
    }

    // =========================================================================
    // POST /api/followups/reminders
    // Called by frontend polling. Sends reminders for expiring recommendations.
    // =========================================================================
    public function checkReminders(): array
    {
        // Find pending period recommendations expiring within 3 days
        // that haven't been reminded in the last 24 hours
        $stmt = $this->db->prepare(
            "SELECT f.id, f.patient_user_id, f.period_label, f.expires_at, f.priority,
                    du.name AS doctor_name
               FROM follow_up_recommendation f
               JOIN `user` du ON du.id = f.doctor_user_id
              WHERE f.status = 'pending'
                AND f.type = 'period'
                AND f.expires_at IS NOT NULL
                AND f.expires_at <= DATE_ADD(NOW(), INTERVAL 3 DAY)
                AND f.expires_at >= NOW()
                AND NOT EXISTS (
                    SELECT 1 FROM notification n
                     WHERE n.user_id = f.patient_user_id
                       AND n.type = ?
                       AND n.related_type = 'follow_up'
                       AND n.related_id = f.id
                       AND n.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                )
              LIMIT 10"
        );
        $stmt->execute([Notifier::FOLLOWUP_REMINDER]);
        $rows = $stmt->fetchAll();
        $sent = 0;

        foreach ($rows as $row) {
            $this->notifier->send((int) $row['patient_user_id'], [
                'type'        => Notifier::FOLLOWUP_REMINDER,
                'title'       => 'Follow-up appointment reminder',
                'body'        => sprintf(
                    '%s recommended a follow-up %s. Please schedule your appointment before the recommendation expires.',
                    $row['doctor_name'],
                    strtolower($row['period_label'] ?? 'soon')
                ),
                'relatedType' => 'follow_up',
                'relatedId'   => (int) $row['id'],
                'urgent'      => $row['priority'] === 'urgent',
            ]);
            $sent++;
        }

        return ['success' => true, 'remindersSent' => $sent];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function findFollowUp(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM follow_up_recommendation WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    private function shape(array $r): array
    {
        return [
            'id'                  => (int) $r['id'],
            'appointmentId'       => (int) $r['appointment_id'],
            'doctorId'            => (int) $r['doctor_user_id'],
            'patientId'           => (int) $r['patient_user_id'],
            'doctorName'          => $r['doctor_name'] ?? null,
            'doctorAvatar'        => $r['doctor_avatar'] ?? null,
            'patientName'         => $r['patient_name'] ?? null,
            'patientAvatar'       => $r['patient_avatar'] ?? null,
            'type'                => $r['type'],
            'priority'            => $r['priority'],
            'periodDays'          => $r['period_days'] !== null ? (int) $r['period_days'] : null,
            'periodLabel'         => $r['period_label'],
            'note'                => $r['note'],
            'status'              => $r['status'],
            'bookedAppointmentId' => $r['booked_appointment_id'] !== null ? (int) $r['booked_appointment_id'] : null,
            'createdAt'           => $r['created_at'],
            'expiresAt'           => $r['expires_at'],
        ];
    }

    private function intParam(array $data, string $key): ?int
    {
        $val = $data[$key] ?? null;
        if (is_int($val)) return $val;
        if (is_string($val) && ctype_digit($val)) return (int) $val;
        return null;
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

    private function userRoles(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();
        if ($roles === false) return [];
        $decoded = json_decode((string) $roles, true);
        return is_array($decoded) ? $decoded : [];
    }

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
            return ['success' => false, 'error' => 'You do not have permission for this action.', 'status' => 403];
        }
        return $userId;
    }
}
