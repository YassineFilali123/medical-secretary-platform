<?php

/**
 * The decision engine behind "the doctor needs more time".
 *
 * Two operations, deliberately separate:
 *
 *   plan()  — pure. Works out what WOULD happen. No writes. Used to decide
 *             whether a secretary must be asked, and to show them the damage.
 *   apply() — writes the plan, in one transaction, with an audit row per move.
 *
 * Keeping them apart means the secretary approves exactly what gets applied,
 * and that auto-approval and manual approval run the same code rather than two
 * implementations that can drift.
 */
class ScheduleAdjuster
{
    /** Statuses that still hold a slot and therefore have to move. */
    private const LIVE_STATUSES = ['pending', 'confirmed', 'in_progress'];

    /** A TIME column cannot wrap past midnight, and neither can a clinic day. */
    private const END_OF_DAY = 23 * 60 + 59;

    private PDO $db;
    private Notifier $notifier;

    public function __construct(PDO $db, Notifier $notifier)
    {
        $this->db = $db;
        $this->notifier = $notifier;
    }

    // =========================================================================
    // Planning
    // =========================================================================

    /**
     * Work out the consequences of giving this consultation `$minutes` more.
     *
     * @return array{
     *   ok: bool,
     *   error?: string,
     *   basis: string,
     *   newEndTime: string,
     *   gapMinutes: ?int,
     *   affected: list<array{id:int,patientId:int,patientName:string,date:string,
     *                        fromStart:string,fromEnd:string,toStart:string,
     *                        toEnd:string,delay:int,status:string}>
     * }
     */
    public function plan(array $appointment, int $minutes): array
    {
        $currentEnd = $this->toMinutes(substr((string) $appointment['end_time'], 0, 5));
        $newEnd     = $currentEnd + $minutes;

        if ($newEnd > self::END_OF_DAY) {
            return [
                'ok'    => false,
                'error' => 'That extension would run past midnight.',
                'basis' => 'conflict',
            ];
        }

        $following = $this->followingAppointments(
            (int) $appointment['doctor_user_id'],
            $appointment['appointment_date'],
            (int) $appointment['id'],
            substr((string) $appointment['start_time'], 0, 5)
        );

        // Case 1 — nothing after this. The doctor's own time to spend.
        if ($following === []) {
            return [
                'ok'         => true,
                'basis'      => 'no_next',
                'newEndTime' => $this->fromMinutes($newEnd),
                'gapMinutes' => null,
                'affected'   => [],
            ];
        }

        $nextStart = $this->toMinutes(substr((string) $following[0]['start_time'], 0, 5));
        $gap       = $nextStart - $currentEnd;

        // Case 2 — it fits in the free time already there. Nobody is affected.
        if ($minutes <= $gap) {
            return [
                'ok'         => true,
                'basis'      => 'free_gap',
                'newEndTime' => $this->fromMinutes($newEnd),
                'gapMinutes' => $gap,
                'affected'   => [],
            ];
        }

        // Case 3 — the next patient is displaced. Cascade forward.
        //
        // Each appointment is pushed only as far as it must be, and a later gap
        // absorbs the overrun: a 10-minute overrun before a 30-minute lunch
        // break stops at the break rather than shunting the whole afternoon.
        $affected = [];
        $cursor   = $newEnd;

        foreach ($following as $row) {
            $start = $this->toMinutes(substr((string) $row['start_time'], 0, 5));

            if ($start >= $cursor) {
                break; // Free time soaked up the delay; everything later is safe.
            }

            $duration = (int) $row['duration_minutes'];
            $toStart  = $cursor;
            $toEnd    = $toStart + $duration;

            if ($toEnd > self::END_OF_DAY) {
                return [
                    'ok'    => false,
                    'error' => sprintf(
                        'Shifting the schedule would push %s past midnight. Cancel or reschedule later appointments first.',
                        $row['patient_name']
                    ),
                    'basis' => 'conflict',
                ];
            }

            $affected[] = [
                'id'          => (int) $row['id'],
                'patientId'   => (int) $row['patient_user_id'],
                'patientName' => $row['patient_name'],
                'date'        => $row['appointment_date'],
                'fromStart'   => substr((string) $row['start_time'], 0, 5),
                'fromEnd'     => substr((string) $row['end_time'], 0, 5),
                'toStart'     => $this->fromMinutes($toStart),
                'toEnd'       => $this->fromMinutes($toEnd),
                'delay'       => $toStart - $start,
                'status'      => $row['status'],
            ];

            $cursor = $toEnd;
        }

        return [
            'ok'         => true,
            'basis'      => 'conflict',
            'newEndTime' => $this->fromMinutes($newEnd),
            'gapMinutes' => $gap,
            'affected'   => $affected,
        ];
    }

    // =========================================================================
    // Applying
    // =========================================================================

    /**
     * Commit a plan: extend the consultation, shift what it displaces, record
     * every move, and tell everybody involved.
     *
     * @param array $plan        Output of plan(), already checked ok.
     * @param int   $actorId     Who caused this — doctor or deciding secretary.
     * @param ?int  $requestId   Adjustment request to attach the audit rows to.
     * @return array{ok:bool,error?:string,shifted:int}
     */
    public function apply(
        array $appointment,
        int $minutes,
        array $plan,
        int $actorId,
        ?int $requestId,
        bool $isEmergency
    ): array {
        $appointmentId = (int) $appointment['id'];
        $oldEnd        = substr((string) $appointment['end_time'], 0, 5);

        $this->db->beginTransaction();
        try {
            // The consultation itself. original_end_time is only stamped the
            // first time, so repeated extensions still report the overrun
            // against what the patient was originally promised.
            $stmt = $this->db->prepare(
                'UPDATE appointment
                    SET end_time          = ?,
                        duration_minutes  = duration_minutes + ?,
                        extended_minutes  = extended_minutes + ?,
                        original_end_time = COALESCE(original_end_time, ?),
                        updated_at        = NOW()
                  WHERE id = ?'
            );
            $stmt->execute([
                $plan['newEndTime'] . ':00',
                $minutes,
                $minutes,
                $oldEnd . ':00',
                $appointmentId,
            ]);

            $this->recordHistory(
                $appointmentId,
                $requestId,
                $appointment['appointment_date'],
                substr((string) $appointment['start_time'], 0, 5),
                $oldEnd,
                $appointment['appointment_date'],
                substr((string) $appointment['start_time'], 0, 5),
                $plan['newEndTime'],
                $minutes,
                'extension',
                $actorId
            );

            // Latest first. Moving 09:30 into 10:00's place while 10:00 still
            // sits there trips UNIQ_APPT_DOCTOR_SLOT; vacating from the back
            // means every target slot is already empty when we arrive.
            foreach (array_reverse($plan['affected']) as $move) {
                $stmt = $this->db->prepare(
                    'UPDATE appointment
                        SET start_time      = ?,
                            end_time        = ?,
                            delayed_minutes = delayed_minutes + ?,
                            updated_at      = NOW()
                      WHERE id = ?'
                );
                $stmt->execute([
                    $move['toStart'] . ':00',
                    $move['toEnd'] . ':00',
                    $move['delay'],
                    $move['id'],
                ]);

                $this->recordHistory(
                    $move['id'],
                    $requestId,
                    $move['date'],
                    $move['fromStart'],
                    $move['fromEnd'],
                    $move['date'],
                    $move['toStart'],
                    $move['toEnd'],
                    $move['delay'],
                    'cascade',
                    $actorId
                );
            }

            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();

            // 1062: a shifted appointment landed on a slot the patient already
            // holds with another doctor. Nothing was written — the whole shift
            // is one transaction — so the schedule is exactly as it was.
            if (isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
                return [
                    'ok'    => false,
                    'error' => 'Shifting the schedule would clash with another booking one of these patients holds. No changes were made.',
                    'shifted' => 0,
                ];
            }

            throw $e;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        $this->notifyAffected($appointment, $plan, $minutes, $isEmergency);

        return ['ok' => true, 'shifted' => count($plan['affected'])];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    /**
     * Live appointments later the same day for the same doctor, in time order.
     *
     * Ordered by start_time then id so two appointments sharing a start (only
     * possible across a cancelled/live boundary) still cascade deterministically.
     */
    private function followingAppointments(int $doctorId, string $date, int $excludeId, string $afterStart): array
    {
        $placeholders = implode(',', array_fill(0, count(self::LIVE_STATUSES), '?'));

        $stmt = $this->db->prepare(
            "SELECT a.id, a.patient_user_id, a.appointment_date, a.start_time, a.end_time,
                    a.duration_minutes, a.status, u.name AS patient_name
               FROM appointment a
               JOIN `user` u ON u.id = a.patient_user_id
              WHERE a.doctor_user_id = ?
                AND a.appointment_date = ?
                AND a.id <> ?
                AND a.start_time >= ?
                AND a.status IN ({$placeholders})
              ORDER BY a.start_time ASC, a.id ASC"
        );

        $stmt->execute(array_merge(
            [$doctorId, $date, $excludeId, $afterStart . ':00'],
            self::LIVE_STATUSES
        ));

        return $stmt->fetchAll();
    }

    private function recordHistory(
        int $appointmentId,
        ?int $requestId,
        string $prevDate,
        string $prevStart,
        string $prevEnd,
        string $newDate,
        string $newStart,
        string $newEnd,
        int $delayMinutes,
        string $changeType,
        int $actorId
    ): void {
        $stmt = $this->db->prepare(
            'INSERT INTO appointment_delay_history
                 (appointment_id, adjustment_request_id,
                  previous_date, previous_start_time, previous_end_time,
                  new_date, new_start_time, new_end_time,
                  delay_minutes, change_type, changed_by_user_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );

        $stmt->execute([
            $appointmentId,
            $requestId,
            $prevDate,
            $prevStart . ':00',
            $prevEnd . ':00',
            $newDate,
            $newStart . ':00',
            $newEnd . ':00',
            $delayMinutes,
            $changeType,
            $actorId,
        ]);
    }

    /** Tell the doctor it went through, and every displaced patient why. */
    private function notifyAffected(array $appointment, array $plan, int $minutes, bool $isEmergency): void
    {
        $doctorName = $appointment['doctor_name'] ?? 'Your doctor';

        $this->notifier->send((int) $appointment['doctor_user_id'], [
            'type'        => $isEmergency ? Notifier::EMERGENCY : Notifier::EXTENSION_AUTO_APPROVED,
            'title'       => sprintf('Consultation extended by %d minutes', $minutes),
            'body'        => $plan['affected'] === []
                ? 'No other appointments were affected.'
                : sprintf('%d later appointment(s) were moved back.', count($plan['affected'])),
            'relatedType' => 'appointment',
            'relatedId'   => (int) $appointment['id'],
        ]);

        foreach ($plan['affected'] as $move) {
            $this->notifier->send($move['patientId'], [
                'type'  => Notifier::APPOINTMENT_DELAYED,
                'title' => sprintf('Your appointment moved to %s', $move['toStart']),
                'body'  => $isEmergency
                    ? sprintf(
                        '%s is handling an emergency. Your appointment on %s now starts at %s instead of %s — about %d minutes later. We are sorry for the delay.',
                        $doctorName,
                        $move['date'],
                        $move['toStart'],
                        $move['fromStart'],
                        $move['delay']
                    )
                    : sprintf(
                        'The consultation before yours is running long. Your appointment on %s now starts at %s instead of %s — about %d minutes later.',
                        $move['date'],
                        $move['toStart'],
                        $move['fromStart'],
                        $move['delay']
                    ),
                'relatedType' => 'appointment',
                'relatedId'   => $move['id'],
                'urgent'      => $isEmergency,
            ]);
        }
    }

    private function toMinutes(string $hhmm): int
    {
        [$h, $m] = array_pad(explode(':', $hhmm), 2, '0');

        return ((int) $h) * 60 + (int) $m;
    }

    private function fromMinutes(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}
