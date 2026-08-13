<?php

/**
 * A doctor's read-only view of their patients' AI conversations.
 *
 * Two deliberate constraints shape this class:
 *
 *  1. It is READ ONLY. There is no create/update/delete here and no route in
 *     index.php that could reach one — a doctor reviews a transcript, they do
 *     not edit the record of what a patient said.
 *
 *  2. Authorisation is the same rule DoctorPatientController uses: a patient
 *     belongs to a doctor exactly when an appointment links them. That rule
 *     lives in one place here — the EXISTS clause in patientScope() — and both
 *     the list and the detail lookup go through it, so a doctor cannot reach
 *     another doctor's patients by guessing a conversation id.
 *
 * The conversations themselves are the live_chat / live_chat_message rows
 * written by AiChatController and LiveChatController. Nothing is duplicated:
 * one conversation is one live_chat row, whether it stayed with the assistant
 * or was handed to a secretary.
 */
class DoctorConversationController
{
    /**
     * Stored status → what the doctor is shown.
     *
     * 'ai' is a conversation still with the assistant; 'active' means a
     * secretary has taken it over, which from the doctor's side reads as
     * "transferred".
     */
    private const STATUS_OUT = [
        'ai'      => 'active',
        'waiting' => 'waiting',
        'active'  => 'transferred',
        'closed'  => 'closed',
    ];

    /** The reverse, for the status filter. */
    private const STATUS_IN = [
        'active'      => 'ai',
        'waiting'     => 'waiting',
        'transferred' => 'active',
        'closed'      => 'closed',
    ];

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // GET /api/doctor/conversations[?q=&date=&status=]
    //
    // Every conversation belonging to one of this doctor's patients, newest
    // first. Filters are applied in SQL rather than in the browser so that a
    // doctor never receives rows they then have to be trusted to hide.
    // =========================================================================
    public function index(array $query): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        $sql = "SELECT lc.id,
                       lc.patient_user_id,
                       u.name  AS patient_name,
                       s.name  AS secretary_name,
                       lc.status,
                       lc.created_at,
                       COUNT(m.id) AS message_count,
                       MAX(m.id)   AS last_message_id
                  FROM live_chat lc
                  JOIN `user` u ON u.id = lc.patient_user_id
                  LEFT JOIN `user` s ON s.id = lc.secretary_user_id
                  LEFT JOIN live_chat_message m ON m.chat_id = lc.id
                 WHERE " . $this->patientScope();
        $params = [$doctorId];

        // --- Search by patient ------------------------------------------------
        $rawQ = $query['q'] ?? null;
        if (is_string($rawQ) && trim($rawQ) !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], trim($rawQ)) . '%';
            $sql .= ' AND (u.name LIKE ? OR u.email LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }

        // --- Filter by date ---------------------------------------------------
        $date = $query['date'] ?? null;
        if (is_string($date) && $date !== '') {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                return ['success' => false, 'error' => 'Date must be in YYYY-MM-DD format.'];
            }
            $sql .= ' AND DATE(lc.created_at) = ?';
            $params[] = $date;
        }

        // --- Filter by status -------------------------------------------------
        $status = $query['status'] ?? null;
        if (is_string($status) && $status !== '' && $status !== 'all') {
            if (!isset(self::STATUS_IN[$status])) {
                return ['success' => false, 'error' => 'Unknown conversation status.'];
            }
            $sql .= ' AND lc.status = ?';
            $params[] = self::STATUS_IN[$status];
        }

        $sql .= ' GROUP BY lc.id, lc.patient_user_id, u.name, s.name, lc.status, lc.created_at
                  HAVING COUNT(m.id) > 0
                  ORDER BY lc.created_at DESC, lc.id DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $lastMessages = $this->lastMessagesFor(
            array_map(static fn(array $r): int => (int) $r['last_message_id'], $rows)
        );

        $conversations = array_map(function (array $r) use ($lastMessages): array {
            $last = $lastMessages[(int) $r['last_message_id']] ?? null;

            return [
                'id'            => (int) $r['id'],
                'patientId'     => (int) $r['patient_user_id'],
                'patientName'   => $r['patient_name'],
                'date'          => substr((string) $r['created_at'], 0, 10),
                'startedAt'     => $r['created_at'],
                'status'        => self::STATUS_OUT[$r['status']] ?? 'closed',
                'messageCount'  => (int) $r['message_count'],
                'lastMessage'   => $last['content'] ?? '',
                'lastMessageAt' => $last['created_at'] ?? $r['created_at'],
                'lastMessageBy' => $last['sender_role'] ?? null,
                // Non-null once a secretary has been involved, which is what
                // tells the doctor the conversation left the assistant.
                'secretaryName' => $r['secretary_name'],
            ];
        }, $rows);

        return [
            'success'       => true,
            'conversations' => $conversations,
            'total'         => count($conversations),
        ];
    }

    // =========================================================================
    // GET /api/doctor/conversations/get?id=42
    //
    // The full transcript: patient, assistant, and — when the conversation was
    // handed over — the secretary's messages too.
    // =========================================================================
    public function show(array $query): array
    {
        $doctorId = $this->currentDoctorId();
        if (is_array($doctorId)) {
            return $doctorId;
        }

        $id = $query['id'] ?? null;
        if (!is_string($id) && !is_int($id)) {
            return ['success' => false, 'error' => 'A valid conversation id is required.'];
        }
        $id = (string) $id;
        if (!ctype_digit($id) || (int) $id <= 0) {
            return ['success' => false, 'error' => 'A valid conversation id is required.'];
        }
        $id = (int) $id;

        // The ownership test is part of the fetch, not a check performed after
        // it: a conversation belonging to another doctor's patient simply does
        // not exist as far as this query is concerned.
        $stmt = $this->db->prepare(
            "SELECT lc.id,
                    lc.patient_user_id,
                    u.name  AS patient_name,
                    u.email AS patient_email,
                    s.name  AS secretary_name,
                    lc.status,
                    lc.created_at,
                    lc.accepted_at,
                    lc.closed_at
               FROM live_chat lc
               JOIN `user` u ON u.id = lc.patient_user_id
               LEFT JOIN `user` s ON s.id = lc.secretary_user_id
              WHERE lc.id = ?
                AND " . $this->patientScope()
        );
        $stmt->execute([$id, $doctorId]);
        $row = $stmt->fetch();

        if ($row === false) {
            // Same answer whether the conversation does not exist or belongs to
            // someone else's patient — probing must not distinguish the two.
            return [
                'success' => false,
                'error'   => 'Conversation not found, or it does not belong to one of your patients.',
                'status'  => 404,
            ];
        }

        $messages = $this->messagesFor($id, (string) $row['patient_name']);

        return [
            'success'      => true,
            'conversation' => [
                'id'            => (int) $row['id'],
                'patientId'     => (int) $row['patient_user_id'],
                'patientName'   => $row['patient_name'],
                'patientEmail'  => $row['patient_email'],
                'date'          => substr((string) $row['created_at'], 0, 10),
                'startedAt'     => $row['created_at'],
                'acceptedAt'    => $row['accepted_at'],
                'closedAt'      => $row['closed_at'],
                'status'        => self::STATUS_OUT[$row['status']] ?? 'closed',
                'messageCount'  => count($messages),
                'lastMessage'   => $messages === [] ? '' : end($messages)['content'],
                'secretaryName' => $row['secretary_name'],
            ],
            'messages' => $messages,
            // Stated by the server rather than assumed by the browser: this
            // endpoint has no write counterpart.
            'readOnly' => true,
        ];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    /**
     * The authorisation rule, in one place.
     *
     * Expects the conversation's patient column to be in scope as
     * lc.patient_user_id, and binds one parameter: the doctor's id.
     */
    private function patientScope(): string
    {
        return 'EXISTS (SELECT 1
                          FROM appointment a
                         WHERE a.doctor_user_id = ?
                           AND a.patient_user_id = lc.patient_user_id)';
    }

    /**
     * Every message in a conversation, in order, including the AI turns that
     * the live-chat endpoints hide from the patient and secretary panes.
     */
    private function messagesFor(int $conversationId, string $patientName): array
    {
        $stmt = $this->db->prepare(
            "SELECT m.id, m.sender_role, m.content, m.created_at,
                    u.name AS sender_name
               FROM live_chat_message m
               LEFT JOIN `user` u ON u.id = m.sender_user_id
              WHERE m.chat_id = ?
              ORDER BY m.id ASC"
        );
        $stmt->execute([$conversationId]);

        return array_map(static function (array $r) use ($patientName): array {
            $role = (string) $r['sender_role'];

            // AI rows carry the patient's id in sender_user_id (the assistant
            // has no account), so the display name comes from the role.
            $senderName = $role === 'ai'
                ? 'AI Assistant'
                : ($r['sender_name'] ?? $patientName);

            return [
                'id'         => (int) $r['id'],
                'role'       => $role,
                'senderName' => $senderName,
                'content'    => $r['content'],
                'createdAt'  => $r['created_at'],
            ];
        }, $stmt->fetchAll());
    }

    /**
     * Content of the given message ids, keyed by id.
     *
     * Fetched in one round trip rather than a correlated subquery per row.
     *
     * @param list<int> $ids
     */
    private function lastMessagesFor(array $ids): array
    {
        $ids = array_values(array_filter($ids, static fn(int $id): bool => $id > 0));
        if ($ids === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT id, content, sender_role, created_at
               FROM live_chat_message
              WHERE id IN ({$placeholders})"
        );
        $stmt->execute($ids);

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[(int) $row['id']] = [
                'content'     => $row['content'],
                'sender_role' => $row['sender_role'],
                'created_at'  => $row['created_at'],
            ];
        }

        return $out;
    }

    // =========================================================================
    // Auth — mirrors DoctorPatientController.
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
                'error'   => 'Only doctors can review patient AI conversations.',
                'status'  => 403,
            ];
        }

        return $userId;
    }
}
