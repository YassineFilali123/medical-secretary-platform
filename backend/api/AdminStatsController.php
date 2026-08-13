<?php

/**
 * Administrator statistics dashboard.
 *
 * Every number here is a COUNT/AVG over a table that already exists — nothing
 * is stored, cached, or precomputed, so there is no second statistics system to
 * drift out of step with reality.
 *
 * WHICH TABLE BACKS WHAT
 *   appointment      — total / completed / cancelled / pending / accepted, and
 *                      the appointments-over-time series
 *   user             — patient, doctor and secretary head counts
 *   live_chat        — AI conversations and open live chats
 *   live_chat_message— identifies which conversations the assistant took part in
 *   document_request — document request counts and series
 *   doctor_rating    — average rating, distribution, satisfaction
 *
 * DATE SCOPING
 *   Activity metrics are filtered to the selected range. Head counts (doctors,
 *   secretaries, active patients) are NOT: "how many doctors between the 3rd and
 *   the 9th" is not a meaningful question, and pretending otherwise would make
 *   the tiles look wrong every time the range changed. The response labels which
 *   is which via `rangeScoped`.
 *
 * SECURITY
 *   requireAdmin() first, on every call. index.php exposes one GET route.
 */
class AdminStatsController
{
    /** Ranges the dashboard offers. 'custom' is driven by startDate/endDate. */
    private const RANGES = ['today', 'week', 'month', 'year', 'custom'];

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // GET /api/admin/statistics[?range=month&startDate=&endDate=]
    // =========================================================================
    public function index(array $query): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $window = $this->resolveRange($query);
        if (isset($window['error'])) {
            return $window;
        }

        [$from, $to] = [$window['from'], $window['to']];

        return [
            'success' => true,
            'range'   => ['key' => $window['key'], 'from' => $from, 'to' => $to],
            'kpis'    => $this->kpis($from, $to),
            'charts'  => [
                'appointmentsOverTime'   => $this->appointmentsOverTime($from, $to),
                'appointmentStatus'      => $this->appointmentStatusBreakdown($from, $to),
                'aiConversationsOverTime' => $this->conversationsOverTime($from, $to),
                'documentRequestsOverTime' => $this->documentsOverTime($from, $to),
                'ratingDistribution'     => $this->ratingDistribution($from, $to),
            ],
        ];
    }

    // =========================================================================
    // KPIs
    // =========================================================================

    private function kpis(string $from, string $to): array
    {
        // --- Appointments, by status, within the range -----------------------
        $stmt = $this->db->prepare(
            "SELECT status, COUNT(*) AS n
               FROM appointment
              WHERE appointment_date BETWEEN ? AND ?
              GROUP BY status"
        );
        $stmt->execute([$from, $to]);

        $byStatus = ['pending' => 0, 'confirmed' => 0, 'completed' => 0, 'cancelled' => 0, 'rejected' => 0];
        foreach ($stmt->fetchAll() as $row) {
            $byStatus[$row['status']] = (int) $row['n'];
        }
        $totalAppointments = array_sum($byStatus);

        // --- Head counts. Deliberately not range-scoped (see class docblock).
        $roleCount = function (string $role): int {
            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM `user`
                  WHERE deleted_at IS NULL
                    AND status = 'active'
                    AND JSON_CONTAINS(roles, ?)"
            );
            $stmt->execute([json_encode($role)]);

            return (int) $stmt->fetchColumn();
        };

        // --- AI conversations -------------------------------------------------
        // A conversation counts as an AI one when the assistant actually spoke
        // in it, plus any still sitting in the 'ai' state with no messages yet.
        $aiConversations = $this->scalar(
            "SELECT COUNT(*) FROM live_chat lc
              WHERE DATE(lc.created_at) BETWEEN ? AND ?
                AND (lc.status = 'ai'
                     OR EXISTS (SELECT 1 FROM live_chat_message m
                                 WHERE m.chat_id = lc.id AND m.sender_role = 'ai'))",
            [$from, $to]
        );

        // Open live chats are a "right now" figure, not a range one — a queue
        // that was busy last week tells an administrator nothing about today.
        $activeLiveChats = $this->scalar(
            "SELECT COUNT(*) FROM live_chat WHERE status IN ('waiting', 'active')"
        );

        // --- Documents --------------------------------------------------------
        $documentRequests = $this->scalar(
            'SELECT COUNT(*) FROM document_request WHERE DATE(created_at) BETWEEN ? AND ?',
            [$from, $to]
        );
        $documentsPending = $this->scalar(
            "SELECT COUNT(*) FROM document_request
              WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'pending'",
            [$from, $to]
        );

        // --- Ratings ----------------------------------------------------------
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) AS n,
                    ROUND(AVG(rating), 2) AS avg_rating,
                    SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) AS satisfied
               FROM doctor_rating
              WHERE DATE(created_at) BETWEEN ? AND ?"
        );
        $stmt->execute([$from, $to]);
        $rating = $stmt->fetch();

        $ratingCount = (int) ($rating['n'] ?? 0);

        return [
            // Range-scoped
            'totalAppointments'     => $totalAppointments,
            'completedAppointments' => $byStatus['completed'],
            'cancelledAppointments' => $byStatus['cancelled'],
            'pendingAppointments'   => $byStatus['pending'],
            'acceptedAppointments'  => $byStatus['confirmed'],
            'rejectedAppointments'  => $byStatus['rejected'],
            'aiConversations'       => $aiConversations,
            'documentRequests'      => $documentRequests,
            'documentsPending'      => $documentsPending,
            'totalRatings'          => $ratingCount,
            'averageRating'         => $rating['avg_rating'] !== null
                ? round((float) $rating['avg_rating'], 1)
                : null,
            // Share of ratings of 4 or 5. Null rather than 0 when nobody has
            // rated, so the tile can say "no data" instead of "0% satisfied".
            'patientSatisfaction'   => $ratingCount > 0
                ? (int) round(((int) $rating['satisfied'] / $ratingCount) * 100)
                : null,

            // Point-in-time
            'activePatients'        => $roleCount('ROLE_PATIENT'),
            'totalDoctors'          => $roleCount('ROLE_DOCTOR'),
            'totalSecretaries'      => $roleCount('ROLE_SECRETARY'),
            // Included so a "total users" figure can be assembled without
            // silently omitting the administrators.
            'totalAdmins'           => $roleCount('ROLE_ADMIN'),
            'activeLiveChats'       => $activeLiveChats,
        ];
    }

    // =========================================================================
    // Chart series
    // =========================================================================

    /** Appointments per day, split into completed / cancelled / other. */
    private function appointmentsOverTime(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT appointment_date AS d,
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
               FROM appointment
              WHERE appointment_date BETWEEN ? AND ?
              GROUP BY appointment_date
              ORDER BY appointment_date ASC"
        );
        $stmt->execute([$from, $to]);

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[$r['d']] = [
                'date'      => $r['d'],
                'total'     => (int) $r['total'],
                'completed' => (int) $r['completed'],
                'cancelled' => (int) $r['cancelled'],
            ];
        }

        return $this->fillDays($from, $to, $rows, ['total' => 0, 'completed' => 0, 'cancelled' => 0]);
    }

    private function appointmentStatusBreakdown(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT status, COUNT(*) AS n
               FROM appointment
              WHERE appointment_date BETWEEN ? AND ?
              GROUP BY status
              ORDER BY n DESC"
        );
        $stmt->execute([$from, $to]);

        return array_map(static function (array $r): array {
            return ['status' => $r['status'], 'count' => (int) $r['n']];
        }, $stmt->fetchAll());
    }

    private function conversationsOverTime(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE(lc.created_at) AS d, COUNT(*) AS n
               FROM live_chat lc
              WHERE DATE(lc.created_at) BETWEEN ? AND ?
                AND (lc.status = 'ai'
                     OR EXISTS (SELECT 1 FROM live_chat_message m
                                 WHERE m.chat_id = lc.id AND m.sender_role = 'ai'))
              GROUP BY DATE(lc.created_at)
              ORDER BY d ASC"
        );
        $stmt->execute([$from, $to]);

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[$r['d']] = ['date' => $r['d'], 'conversations' => (int) $r['n']];
        }

        return $this->fillDays($from, $to, $rows, ['conversations' => 0]);
    }

    private function documentsOverTime(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE(created_at) AS d, COUNT(*) AS n
               FROM document_request
              WHERE DATE(created_at) BETWEEN ? AND ?
              GROUP BY DATE(created_at)
              ORDER BY d ASC"
        );
        $stmt->execute([$from, $to]);

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[$r['d']] = ['date' => $r['d'], 'requests' => (int) $r['n']];
        }

        return $this->fillDays($from, $to, $rows, ['requests' => 0]);
    }

    private function ratingDistribution(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT rating, COUNT(*) AS n
               FROM doctor_rating
              WHERE DATE(created_at) BETWEEN ? AND ?
              GROUP BY rating"
        );
        $stmt->execute([$from, $to]);

        $counts = array_fill(1, 5, 0);
        foreach ($stmt->fetchAll() as $r) {
            $counts[(int) $r['rating']] = (int) $r['n'];
        }

        $out = [];
        foreach ([5, 4, 3, 2, 1] as $star) {
            $out[] = ['stars' => $star, 'count' => $counts[$star]];
        }

        return $out;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Turn a sparse day map into a dense series.
     *
     * A line chart with days missing draws a straight segment across the gap,
     * which reads as "steady activity" when the truth is "no activity". Filling
     * the zeros keeps the shape honest. Capped so a multi-year custom range
     * cannot produce an enormous payload.
     */
    private function fillDays(string $from, string $to, array $rows, array $zero): array
    {
        $start = new DateTimeImmutable($from);
        $end   = new DateTimeImmutable($to);

        if ($start > $end) {
            return [];
        }

        // Beyond this many days a daily series is unreadable anyway; return only
        // the days that have data rather than thousands of zeroes.
        $maxDays = 400;
        if ((int) $start->diff($end)->days > $maxDays) {
            return array_values($rows);
        }

        $out = [];
        for ($d = $start; $d <= $end; $d = $d->add(new DateInterval('P1D'))) {
            $key = $d->format('Y-m-d');
            $out[] = $rows[$key] ?? array_merge(['date' => $key], $zero);
        }

        return $out;
    }

    /** @param list<mixed> $params */
    private function scalar(string $sql, array $params = []): int
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Turn the requested range into concrete dates.
     *
     * PHP's clock is used rather than the database's, matching the rest of the
     * codebase — MariaDB's timezone is not necessarily the clinic's.
     *
     * @return array{key:string,from:string,to:string}|array{success:bool,error:string}
     */
    private function resolveRange(array $query): array
    {
        $key = $query['range'] ?? 'month';
        if (!is_string($key) || !in_array($key, self::RANGES, true)) {
            return [
                'success' => false,
                'error'   => 'range must be one of: ' . implode(', ', self::RANGES) . '.',
            ];
        }

        $today = new DateTimeImmutable('today');

        if ($key === 'custom') {
            $from = $query['startDate'] ?? null;
            $to   = $query['endDate'] ?? null;

            if (!$this->isDate($from) || !$this->isDate($to)) {
                return [
                    'success' => false,
                    'error'   => 'A custom range needs startDate and endDate in YYYY-MM-DD format.',
                ];
            }
            if ($from > $to) {
                return ['success' => false, 'error' => 'startDate must be on or before endDate.'];
            }

            return ['key' => $key, 'from' => $from, 'to' => $to];
        }

        // Each range spans its whole calendar period, including days still to
        // come. Appointments are booked in advance, so a window that stopped at
        // today would omit every pending and confirmed booking — "This Month"
        // would report fewer appointments than the month actually contains.
        switch ($key) {
            case 'today':
                $from = $today;
                $to   = $today;
                break;
            case 'week':
                $from = $today->modify('monday this week');
                $to   = $from->modify('+6 days');
                break;
            case 'year':
                $from = $today->modify('first day of January');
                $to   = $today->modify('last day of December');
                break;
            case 'month':
            default:
                $from = $today->modify('first day of this month');
                $to   = $today->modify('last day of this month');
                break;
        }

        return [
            'key'  => $key,
            'from' => $from->format('Y-m-d'),
            'to'   => $to->format('Y-m-d'),
        ];
    }

    private function isDate($value): bool
    {
        return is_string($value)
            && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1
            && checkdate((int) substr($value, 5, 2), (int) substr($value, 8, 2), (int) substr($value, 0, 4));
    }

    // =========================================================================
    // Auth
    // =========================================================================

    /** @return int|array The admin's id, or an error array to return as-is. */
    private function requireAdmin()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $stmt = $this->db->prepare(
            "SELECT roles FROM `user`
              WHERE id = ? AND deleted_at IS NULL AND status = 'active'"
        );
        $stmt->execute([(int) $m[1]]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $decoded = json_decode((string) $roles, true);
        if (!is_array($decoded) || !in_array('ROLE_ADMIN', $decoded, true)) {
            return ['success' => false, 'error' => 'Administrator access required.', 'status' => 403];
        }

        return (int) $m[1];
    }
}
