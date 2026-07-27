<?php

/**
 * Doctor availability: the recurring weekly schedule, dated time off, and the
 * bookable slots derived from both.
 *
 * Slots are never stored. They are computed per request from the weekly grid
 * minus time off, so editing the schedule changes every future slot at once and
 * there is no cache to go stale.
 */
class AvailabilityController
{
    /** Must match CHK_AVAIL_SLOT in the migration. */
    private const ALLOWED_SLOT_MINUTES = [10, 15, 20, 30, 45, 60, 90];

    /** Guards the slots endpoint against an absurd date range. */
    private const MAX_SLOT_DAYS = 62;

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // -------------------------------------------------------------------------
    // GET /api/availability
    // The signed-in doctor's own schedule. Always returns all 7 days, filling in
    // defaults for any weekday with no row yet, so the UI never has holes.
    // -------------------------------------------------------------------------
    public function show(): array
    {
        $doctorId = $this->currentUserId();
        if ($doctorId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        return [
            'success'  => true,
            'schedule' => $this->weekFor($doctorId),
            'timeOff'  => $this->timeOffFor($doctorId),
        ];
    }

    // -------------------------------------------------------------------------
    // POST /api/availability/update   { schedule: [ {dayOfWeek, isEnabled, startTime, endTime, slotMinutes}, ... ] }
    //
    // Takes the whole week and upserts it in one transaction: a partial save
    // would leave the doctor with a half-applied schedule.
    // -------------------------------------------------------------------------
    public function update(array $data): array
    {
        $doctorId = $this->currentUserId();
        if ($doctorId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        if (!$this->isDoctor($doctorId)) {
            return ['success' => false, 'error' => 'Only doctors have an availability schedule.', 'status' => 403];
        }

        $schedule = $data['schedule'] ?? null;
        if (!is_array($schedule) || $schedule === []) {
            return ['success' => false, 'error' => 'A schedule is required.'];
        }
        if (count($schedule) > 7) {
            return ['success' => false, 'error' => 'A week has at most 7 days.'];
        }

        $rows = [];
        $seen = [];

        foreach ($schedule as $entry) {
            if (!is_array($entry)) {
                return ['success' => false, 'error' => 'Malformed schedule entry.'];
            }

            $day = $entry['dayOfWeek'] ?? null;
            if (!is_int($day) && !(is_string($day) && ctype_digit($day))) {
                return ['success' => false, 'error' => 'Each entry needs a day of the week.'];
            }
            $day = (int) $day;
            if ($day < 0 || $day > 6) {
                return ['success' => false, 'error' => 'Day of week must be between 0 (Sunday) and 6 (Saturday).'];
            }
            if (isset($seen[$day])) {
                return ['success' => false, 'error' => 'The same weekday appears twice.'];
            }
            $seen[$day] = true;

            $isEnabled = !empty($entry['isEnabled']) ? 1 : 0;

            $start = $this->cleanTime($entry['startTime'] ?? null);
            $end   = $this->cleanTime($entry['endTime'] ?? null);
            if ($start === null || $end === null) {
                return ['success' => false, 'error' => 'Times must be in HH:MM format.'];
            }

            $slotMinutes = $entry['slotMinutes'] ?? 30;
            if (!is_int($slotMinutes) && !(is_string($slotMinutes) && ctype_digit($slotMinutes))) {
                return ['success' => false, 'error' => 'Slot length must be a number.'];
            }
            $slotMinutes = (int) $slotMinutes;
            if (!in_array($slotMinutes, self::ALLOWED_SLOT_MINUTES, true)) {
                return [
                    'success' => false,
                    'error'   => 'Slot length must be one of: ' . implode(', ', self::ALLOWED_SLOT_MINUTES) . ' minutes.',
                ];
            }

            // Integer minutes, never strtotime(): strtotime("HH:MM") resolves
            // against TODAY in the server timezone, so on a DST-transition day
            // 02:00 and 03:00 both become 03:00 and a valid window is rejected.
            $startMin = $this->toMinutes($start);
            $endMin   = $this->toMinutes($end);

            // Only meaningful for a working day — but CHK_AVAIL_ORDER applies to
            // every row, so enforce it regardless of is_enabled. (Disagreeing
            // with the CHECK would surface as a raw 500 instead of a message.)
            if ($endMin <= $startMin) {
                return [
                    'success' => false,
                    'error'   => sprintf('%s: the end time must be after the start time.', $this->dayName($day)),
                ];
            }

            if ($isEnabled === 1) {
                $span = $endMin - $startMin;
                if ($span < $slotMinutes) {
                    return [
                        'success' => false,
                        'error'   => sprintf(
                            '%s: %d minutes is longer than the %d-minute working window.',
                            $this->dayName($day),
                            $slotMinutes,
                            $span
                        ),
                    ];
                }
            }

            $rows[] = [$doctorId, $day, $isEnabled, $start . ':00', $end . ':00', $slotMinutes];
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO doctor_availability
                     (doctor_user_id, day_of_week, is_enabled, start_time, end_time, slot_minutes, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                     is_enabled   = VALUES(is_enabled),
                     start_time   = VALUES(start_time),
                     end_time     = VALUES(end_time),
                     slot_minutes = VALUES(slot_minutes),
                     updated_at   = NOW()"
            );
            foreach ($rows as $row) {
                $stmt->execute($row);
            }
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'success'  => true,
            'message'  => 'Availability saved.',
            'schedule' => $this->weekFor($doctorId),
            'timeOff'  => $this->timeOffFor($doctorId),
        ];
    }

    // -------------------------------------------------------------------------
    // POST /api/availability/timeoff/create   { startDate, endDate?, reason? }
    // -------------------------------------------------------------------------
    public function createTimeOff(array $data): array
    {
        $doctorId = $this->currentUserId();
        if ($doctorId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        if (!$this->isDoctor($doctorId)) {
            return ['success' => false, 'error' => 'Only doctors can book time off.', 'status' => 403];
        }

        $start = $this->cleanDate($data['startDate'] ?? null);
        if ($start === null) {
            return ['success' => false, 'error' => 'A valid start date (YYYY-MM-DD) is required.'];
        }

        // A single day off is the common case: end defaults to start.
        $rawEnd = $data['endDate'] ?? null;
        $end = ($rawEnd === null || $rawEnd === '') ? $start : $this->cleanDate($rawEnd);
        if ($end === null) {
            return ['success' => false, 'error' => 'The end date must be in YYYY-MM-DD format.'];
        }
        if ($end < $start) {
            return ['success' => false, 'error' => 'The end date cannot be before the start date.'];
        }
        if ($this->inclusiveDays($start, $end) > 366) {
            return ['success' => false, 'error' => 'Time off cannot span more than a year.'];
        }

        // Overlapping ranges would double-block the same days and make the list
        // confusing to read; refuse rather than silently merging.
        $stmt = $this->db->prepare(
            "SELECT start_date, end_date FROM doctor_time_off
              WHERE doctor_user_id = ? AND start_date <= ? AND end_date >= ?
              LIMIT 1"
        );
        $stmt->execute([$doctorId, $end, $start]);
        if ($clash = $stmt->fetch()) {
            return [
                'success' => false,
                'error'   => sprintf(
                    'That overlaps existing time off from %s to %s.',
                    $clash['start_date'],
                    $clash['end_date']
                ),
            ];
        }

        $reason = null;
        if (isset($data['reason']) && is_string($data['reason'])) {
            $reason = trim($data['reason']);
            if ($reason === '') {
                $reason = null;
            } elseif (mb_strlen($reason) > 160) {
                return ['success' => false, 'error' => 'Reason must be 160 characters or fewer.'];
            }
        }

        $stmt = $this->db->prepare(
            "INSERT INTO doctor_time_off (doctor_user_id, start_date, end_date, reason, created_at)
             VALUES (?, ?, ?, ?, NOW())"
        );
        $stmt->execute([$doctorId, $start, $end, $reason]);

        // Time off blocks new bookings but does not cancel existing ones. Say so
        // explicitly — silently leaving patients holding appointments the doctor
        // will not attend is the worst of the three options.
        $affected = $this->appointmentsInRange($doctorId, $start, $end);

        return [
            'success'  => true,
            'message'  => 'Time off added.',
            'timeOff'  => $this->timeOffFor($doctorId),
            'affected' => $affected,
            'warning'  => $affected === [] ? null : sprintf(
                '%d existing appointment%s fall%s in this period and %s not been cancelled.',
                count($affected),
                count($affected) === 1 ? '' : 's',
                count($affected) === 1 ? 's' : '',
                count($affected) === 1 ? 'has' : 'have'
            ),
        ];
    }

    /**
     * Live appointments a new absence would clash with.
     *
     * @return list<array{id:int,date:string,time:string,patientName:string,status:string}>
     */
    private function appointmentsInRange(int $doctorId, string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT a.id, a.appointment_date, a.start_time, a.status, u.name AS patient_name
               FROM appointment a
               JOIN `user` u ON u.id = a.patient_user_id
              WHERE a.doctor_user_id = ?
                AND a.appointment_date BETWEEN ? AND ?
                AND a.status IN ('pending', 'confirmed')
              ORDER BY a.appointment_date ASC, a.start_time ASC"
        );
        $stmt->execute([$doctorId, $from, $to]);

        return array_map(static function (array $r): array {
            return [
                'id'          => (int) $r['id'],
                'date'        => $r['appointment_date'],
                'time'        => substr((string) $r['start_time'], 0, 5),
                'patientName' => $r['patient_name'],
                'status'      => $r['status'],
            ];
        }, $stmt->fetchAll());
    }

    // -------------------------------------------------------------------------
    // POST /api/availability/timeoff/delete   { id }
    // -------------------------------------------------------------------------
    public function deleteTimeOff(array $data): array
    {
        $doctorId = $this->currentUserId();
        if ($doctorId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $id = $data['id'] ?? null;
        if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
            return ['success' => false, 'error' => 'A valid id is required.'];
        }

        // Scoped to the owner, so one doctor cannot delete another's time off.
        $stmt = $this->db->prepare('DELETE FROM doctor_time_off WHERE id = ? AND doctor_user_id = ?');
        $stmt->execute([(int) $id, $doctorId]);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'error' => 'Time off not found.', 'status' => 404];
        }

        return [
            'success' => true,
            'message' => 'Time off removed.',
            'timeOff' => $this->timeOffFor($doctorId),
        ];
    }

    // -------------------------------------------------------------------------
    // GET /api/availability/slots?doctorId=8&from=YYYY-MM-DD&to=YYYY-MM-DD&excludeAppointmentId=5
    //
    // Bookable slots for a doctor: the weekly schedule, minus time off, minus
    // anything already booked. Open to any signed-in user because patients need
    // it to book. Defaults to the next 14 days.
    //
    // `excludeAppointmentId` frees the slot an appointment currently occupies,
    // so the reschedule picker shows the patient's own time as available
    // instead of as a clash with themselves.
    // -------------------------------------------------------------------------
    public function slots(array $query): array
    {
        if ($this->currentUserId() === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $doctorId = $query['doctorId'] ?? null;
        if (!is_string($doctorId) || !ctype_digit($doctorId)) {
            return ['success' => false, 'error' => 'A valid doctorId is required.'];
        }
        $doctorId = (int) $doctorId;

        if (!$this->isDoctor($doctorId)) {
            return ['success' => false, 'error' => 'That user is not a doctor.', 'status' => 404];
        }

        $today = date('Y-m-d');

        // Only fall back to a default when the parameter is ABSENT. A present
        // but malformed date must fail, not silently return a different window.
        $rawFrom = $query['from'] ?? null;
        if ($rawFrom === null || $rawFrom === '') {
            $from = $today;
        } else {
            $from = $this->cleanDate($rawFrom);
            if ($from === null) {
                return ['success' => false, 'error' => 'The "from" date must be in YYYY-MM-DD format.'];
            }
        }

        // Nothing in the past is bookable. Clamp rather than reject so a client
        // in a timezone behind the server does not get a spurious error.
        if ($from < $today) {
            $from = $today;
        }

        $rawTo = $query['to'] ?? null;
        if ($rawTo === null || $rawTo === '') {
            $to = (new DateTimeImmutable($from))->add(new DateInterval('P13D'))->format('Y-m-d');
        } else {
            $to = $this->cleanDate($rawTo);
            if ($to === null) {
                return ['success' => false, 'error' => 'The "to" date must be in YYYY-MM-DD format.'];
            }
        }

        // Reported before the from/to comparison: after clamping `from` to today
        // an entirely past window would otherwise produce the misleading
        // "to cannot be before from".
        if ($to < $today) {
            return ['success' => false, 'error' => 'That date range is in the past.'];
        }
        if ($to < $from) {
            return ['success' => false, 'error' => 'The "to" date cannot be before "from".'];
        }

        if ($this->inclusiveDays($from, $to) > self::MAX_SLOT_DAYS) {
            return ['success' => false, 'error' => 'Please request at most ' . self::MAX_SLOT_DAYS . ' days at a time.'];
        }

        $exclude = null;
        $rawExclude = $query['excludeAppointmentId'] ?? null;
        if ($rawExclude !== null && $rawExclude !== '') {
            if (!is_string($rawExclude) || !ctype_digit($rawExclude)) {
                return ['success' => false, 'error' => 'excludeAppointmentId must be a number.'];
            }
            $exclude = (int) $rawExclude;
        }

        return [
            'success'  => true,
            'doctorId' => $doctorId,
            'from'     => $from,
            'to'       => $to,
            'days'     => $this->slotsFor($doctorId, $from, $to, $exclude),
        ];
    }

    /**
     * The slot calculation itself, callable from other controllers.
     *
     * Kept separate from slots() so booking validates against exactly the list
     * the patient was shown — if these two ever diverged, the UI would offer
     * slots the API then refuses.
     *
     * @param int|null $excludeAppointmentId Treat this booking's time as free.
     * @return list<array{date:string,dayOfWeek:int,slots:list<array{start:string,end:string}>,reason:?string}>
     */
    public function slotsFor(int $doctorId, string $from, string $to, ?int $excludeAppointmentId = null): array
    {
        $today = date('Y-m-d');
        $days  = $this->inclusiveDays($from, $to);

        // Slots already past on the current day are not bookable.
        $nowMinutes = ((int) date('H')) * 60 + (int) date('i');

        $week = [];
        foreach ($this->weekFor($doctorId) as $entry) {
            $week[$entry['dayOfWeek']] = $entry;
        }
        $timeOff = $this->timeOffFor($doctorId);
        $booked  = $this->bookedIntervals($doctorId, $from, $to, $excludeAppointmentId);

        $out = [];
        $cursor = new DateTimeImmutable($from);

        for ($i = 0; $i < $days; $i++) {
            $date    = $cursor->format('Y-m-d');
            $dow     = (int) $cursor->format('w'); // 0 = Sunday, same as day_of_week
            $entry   = $week[$dow] ?? null;
            $blocked = $this->timeOffCovering($timeOff, $date);

            if ($entry === null || !$entry['isEnabled']) {
                $out[] = ['date' => $date, 'dayOfWeek' => $dow, 'slots' => [], 'reason' => 'not_working'];
            } elseif ($blocked !== null) {
                $out[] = [
                    'date'      => $date,
                    'dayOfWeek' => $dow,
                    'slots'     => [],
                    'reason'    => 'time_off',
                    // Dates only. The free-text reason is the doctor's private
                    // note and must not reach a patient browsing for a slot.
                    'timeOff'   => [
                        'startDate' => $blocked['startDate'],
                        'endDate'   => $blocked['endDate'],
                    ],
                ];
            } else {
                $slots = $this->buildSlots(
                    $entry['startTime'],
                    $entry['endTime'],
                    $entry['slotMinutes'],
                    $date === $today ? $nowMinutes : null,
                );

                $out[] = [
                    'date'      => $date,
                    'dayOfWeek' => $dow,
                    'slots'     => $this->removeBooked($slots, $booked[$date] ?? []),
                    'reason'    => null,
                ];
            }

            $cursor = $cursor->add(new DateInterval('P1D'));
        }

        return $out;
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    /**
     * Cut a working window into fixed-length slots. A trailing remainder shorter
     * than one slot is dropped rather than offered as a short appointment.
     *
     * Pure integer arithmetic on minutes-since-midnight. Using strtotime()/date()
     * here would anchor the maths to the server's CURRENT date, so on a DST
     * spring-forward day a 01:00-05:00 @30min window produced 6 slots instead of
     * 8, one of them a 90-minute block labelled "01:30 -> 03:00".
     *
     * @param int|null $notBefore Minutes since midnight; slots starting at or
     *                            before this are dropped. Null keeps them all.
     * @return list<array{start:string,end:string}>
     */
    private function buildSlots(string $start, string $end, int $minutes, ?int $notBefore = null): array
    {
        $cursor = $this->toMinutes($start);
        $finish = $this->toMinutes($end);

        // Defensive: the CHECK constraint and update() both prevent this, but a
        // zero/negative step here would loop forever.
        if ($minutes <= 0 || $finish <= $cursor) {
            return [];
        }

        $slots = [];
        while ($cursor + $minutes <= $finish) {
            if ($notBefore === null || $cursor > $notBefore) {
                $slots[] = [
                    'start' => $this->fromMinutes($cursor),
                    'end'   => $this->fromMinutes($cursor + $minutes),
                ];
            }
            $cursor += $minutes;
        }

        return $slots;
    }

    /** "HH:MM" -> minutes since midnight. Assumes cleanTime() already ran. */
    private function toMinutes(string $hhmm): int
    {
        [$h, $m] = array_pad(explode(':', $hhmm), 2, '0');

        return ((int) $h) * 60 + (int) $m;
    }

    private function fromMinutes(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }

    /**
     * Live bookings for a doctor, grouped by date, as [startMin, endMin] pairs.
     *
     * Only statuses that still hold their slot are counted — the same set the
     * `active_slot` generated column uses, so this view and the unique index
     * can never disagree about what "taken" means.
     *
     * @return array<string, list<array{0:int,1:int}>>
     */
    private function bookedIntervals(int $doctorId, string $from, string $to, ?int $excludeId): array
    {
        $sql = "SELECT appointment_date, start_time, end_time
                  FROM appointment
                 WHERE doctor_user_id = ?
                   AND appointment_date BETWEEN ? AND ?
                   AND status IN ('pending', 'confirmed', 'in_progress', 'completed')";
        $params = [$doctorId, $from, $to];

        // Reschedule: the appointment being moved must not block itself.
        if ($excludeId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $byDate = [];
        foreach ($stmt->fetchAll() as $row) {
            $byDate[$row['appointment_date']][] = [
                $this->toMinutes(substr((string) $row['start_time'], 0, 5)),
                $this->toMinutes(substr((string) $row['end_time'], 0, 5)),
            ];
        }

        return $byDate;
    }

    /**
     * Drop every slot that overlaps an existing booking.
     *
     * Overlap, not an exact start-time match. A doctor who moves from 30- to
     * 60-minute slots after taking bookings has appointments that no longer line
     * up with any generated slot start, and an equality test would cheerfully
     * re-offer a time they are already busy.
     *
     * @param list<array{start:string,end:string}> $slots
     * @param list<array{0:int,1:int}>             $intervals
     * @return list<array{start:string,end:string}>
     */
    private function removeBooked(array $slots, array $intervals): array
    {
        if ($intervals === []) {
            return $slots;
        }

        $free = [];
        foreach ($slots as $slot) {
            $start = $this->toMinutes($slot['start']);
            $end   = $this->toMinutes($slot['end']);

            foreach ($intervals as [$bookedStart, $bookedEnd]) {
                // Half-open [start, end): back-to-back slots do not overlap.
                if ($start < $bookedEnd && $end > $bookedStart) {
                    continue 2;
                }
            }

            $free[] = $slot;
        }

        return $free;
    }

    /**
     * Inclusive calendar-day count between two YYYY-MM-DD dates.
     * DateTimeImmutable::diff counts calendar days; (t2-t1)/86400 does not — a
     * range crossing a DST spring-forward is 3600s short and rounds down.
     */
    private function inclusiveDays(string $from, string $to): int
    {
        return (new DateTimeImmutable($from))->diff(new DateTimeImmutable($to))->days + 1;
    }

    /** All 7 days, with defaults filled in for weekdays that have no row. */
    private function weekFor(int $doctorId): array
    {
        $stmt = $this->db->prepare(
            "SELECT day_of_week, is_enabled, start_time, end_time, slot_minutes
               FROM doctor_availability
              WHERE doctor_user_id = ?"
        );
        $stmt->execute([$doctorId]);

        $byDay = [];
        foreach ($stmt->fetchAll() as $row) {
            $byDay[(int) $row['day_of_week']] = [
                'dayOfWeek'   => (int) $row['day_of_week'],
                'isEnabled'   => (bool) $row['is_enabled'],
                'startTime'   => substr((string) $row['start_time'], 0, 5),
                'endTime'     => substr((string) $row['end_time'], 0, 5),
                'slotMinutes' => (int) $row['slot_minutes'],
            ];
        }

        $week = [];
        for ($day = 0; $day <= 6; $day++) {
            // Defaults must match the migration's seed exactly (Mon-Fri on),
            // otherwise whether a doctor is bookable would depend on whether
            // they existed when the migration ran.
            $week[] = $byDay[$day] ?? [
                'dayOfWeek'   => $day,
                'isEnabled'   => $day >= 1 && $day <= 5,
                'startTime'   => '09:00',
                'endTime'     => '17:00',
                'slotMinutes' => 30,
            ];
        }

        return $week;
    }

    private function timeOffFor(int $doctorId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, start_date, end_date, reason
               FROM doctor_time_off
              WHERE doctor_user_id = ?
              ORDER BY start_date ASC"
        );
        $stmt->execute([$doctorId]);

        return array_map(function (array $row): array {
            return [
                'id'        => (int) $row['id'],
                'startDate' => $row['start_date'],
                'endDate'   => $row['end_date'],
                'reason'    => $row['reason'],
                // Calendar days, not seconds/86400 — a range crossing a DST
                // spring-forward is one hour short and would count a day fewer.
                'days'      => $this->inclusiveDays($row['start_date'], $row['end_date']),
            ];
        }, $stmt->fetchAll());
    }

    /** @param list<array{startDate:string,endDate:string,reason:?string}> $timeOff */
    private function timeOffCovering(array $timeOff, string $date): ?array
    {
        foreach ($timeOff as $t) {
            if ($date >= $t['startDate'] && $date <= $t['endDate']) {
                return $t;
            }
        }

        return null;
    }

    /** Accept "HH:MM" or "HH:MM:SS"; return normalised "HH:MM", or null. */
    private function cleanTime($raw): ?string
    {
        if (!is_string($raw) || !preg_match('/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/', $raw, $m)) {
            return null;
        }

        return $m[1] . ':' . $m[2];
    }

    /** Accept a real calendar date in YYYY-MM-DD; return it, or null. */
    private function cleanDate($raw): ?string
    {
        if (!is_string($raw)) {
            return null;
        }

        $d = DateTime::createFromFormat('Y-m-d', $raw);

        // createFromFormat accepts 2026-02-31 and rolls it over, so compare back.
        return ($d && $d->format('Y-m-d') === $raw) ? $raw : null;
    }

    private function dayName(int $day): string
    {
        $names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return $names[$day] ?? "Day {$day}";
    }

    // -------------------------------------------------------------------------
    // Auth — same placeholder as the other controllers. `Bearer token_<id>` is
    // client-minted and forgeable; kept in one place for the eventual JWT swap.
    // -------------------------------------------------------------------------

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

    /** Role is read from the database, never trusted from the request. */
    private function isDoctor(int $userId): bool
    {
        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return false;
        }

        $decoded = json_decode((string) $roles, true);

        return is_array($decoded) && in_array('ROLE_DOCTOR', $decoded, true);
    }
}
