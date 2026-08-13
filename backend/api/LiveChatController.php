<?php

/**
 * Secretary ↔ Patient Live Chat
 *
 * Security model:
 *   - Patient: may only see/write to their own chat.
 *   - Secretary: may see the waiting queue; once they accept a chat it is
 *     locked to them — no other secretary can read/write/close it.
 *   - Admin: not granted special access here (front desk only).
 *
 * Locking:
 *   accept() executes a single atomic UPDATE … WHERE status='waiting'.
 *   MariaDB row-level locking guarantees exactly one concurrent caller
 *   updates the row. The loser receives rowCount()=0 → HTTP 409.
 */
class LiveChatController
{
    private const MAX_MESSAGE = 2000;

    private PDO      $db;
    private Notifier $notifier;
    /**
     * Pushes events to connected sockets AFTER a write has been committed.
     * Purely additive: no validation, authorisation or locking below depends
     * on it, and every call is best-effort.
     */
    private RealtimeNotifier $realtime;

    public function __construct()
    {
        $this->db       = Database::getConnection();
        $this->notifier = new Notifier($this->db);
        $this->realtime = new RealtimeNotifier();
    }

    // =========================================================================
    // POST /api/livechat/start
    // Patient creates a new WAITING chat session.
    // =========================================================================
    public function start(): array
    {
        $patient = $this->requirePatient();
        if (!$patient) {
            return $this->unauthorized();
        }

        // Prevent a patient from opening multiple simultaneous chats.
        $existing = $this->fetchPatientOpenChat($patient['id']);
        if ($existing !== null) {
            return [
                'success' => true,
                'chat'    => $this->shapeChat($existing),
            ];
        }

        // If the patient was already talking to the AI assistant, that
        // conversation IS this one — promote it in place rather than opening a
        // second row, so the AI turns and the secretary turns stay in a single
        // transcript. Only ever moves 'ai' → 'waiting', so the queue below and
        // every other status check behave exactly as before.
        $chatId = $this->promoteAiConversation($patient['id']);

        if ($chatId === null) {
            $stmt = $this->db->prepare(
                "INSERT INTO live_chat (patient_user_id, status, created_at)
                 VALUES (?, 'waiting', NOW())"
            );
            $stmt->execute([$patient['id']]);
            $chatId = (int) $this->db->lastInsertId();
        }

        // Notify every available secretary about the new waiting patient.
        $secretaryIds = $this->notifier->secretaryIds();
        $this->notifier->sendMany($secretaryIds, [
            'type'        => 'live_chat.new_waiting',
            'title'       => 'New patient waiting for live chat',
            'body'        => sprintf('Patient #%d is waiting for a secretary.', $patient['id']),
            'relatedType' => 'live_chat',
            'relatedId'   => $chatId,
        ]);

        $row = $this->fetchChatById($chatId);
        $shaped = $this->shapeChat($row);

        // Tells every secretary watching the queue that someone is waiting,
        // which is what used to require a 5-second poll.
        $this->realtime->waiting($chatId, $shaped);

        return ['success' => true, 'chat' => $shaped];
    }

    // =========================================================================
    // GET /api/livechat/my
    // Patient fetches their own open (waiting/active) chat.
    // =========================================================================
    public function myChat(): array
    {
        $patient = $this->requirePatient();
        if (!$patient) {
            return $this->unauthorized();
        }

        $row = $this->fetchPatientOpenChat($patient['id']);
        if ($row === null) {
            return ['success' => true, 'chat' => null];
        }

        return ['success' => true, 'chat' => $this->shapeChat($row)];
    }

    // =========================================================================
    // GET /api/livechat/waiting
    // Secretary fetches all waiting chat sessions.
    // =========================================================================
    public function waitingQueue(): array
    {
        $secretary = $this->requireSecretary();
        if (!$secretary) {
            return $this->unauthorized();
        }

        $stmt = $this->db->query(
            "SELECT lc.*, u.name AS patient_name
               FROM live_chat lc
               JOIN user u ON u.id = lc.patient_user_id
              WHERE lc.status = 'waiting'
              ORDER BY lc.created_at ASC"
        );

        $rows = $stmt->fetchAll();

        return [
            'success' => true,
            'chats'   => array_map([$this, 'shapeChat'], $rows),
        ];
    }

    // =========================================================================
    // GET /api/livechat/active
    // Secretary fetches their own active (accepted) chats.
    // =========================================================================
    public function myActiveChats(): array
    {
        $secretary = $this->requireSecretary();
        if (!$secretary) {
            return $this->unauthorized();
        }

        // Enriched with the last message and an unread count so the Active
        // Conversations list can be drawn from this one call. The WHERE clause
        // is unchanged: still only chats this secretary owns, still only
        // 'active' ones.
        $stmt = $this->db->prepare(
            "SELECT lc.*, u.name AS patient_name, s.name AS secretary_name,
                    lm.content    AS last_message,
                    lm.created_at AS last_message_at,
                    lm.sender_role AS last_message_role,
                    (SELECT COUNT(*)
                       FROM live_chat_message m
                      WHERE m.chat_id = lc.id
                        AND m.sender_role = 'patient'
                        AND m.id > COALESCE(lc.secretary_last_read_message_id, 0)
                    ) AS unread_count
               FROM live_chat lc
               JOIN user u ON u.id = lc.patient_user_id
               LEFT JOIN user s ON s.id = lc.secretary_user_id
               LEFT JOIN live_chat_message lm
                      ON lm.id = (SELECT MAX(m2.id) FROM live_chat_message m2 WHERE m2.chat_id = lc.id)
              WHERE lc.secretary_user_id = ?
                AND lc.status = 'active'
              ORDER BY lc.accepted_at ASC"
        );
        $stmt->execute([$secretary['id']]);

        $chats = array_map(function (array $row): array {
            return array_merge($this->shapeChat($row), [
                'lastMessage'     => $row['last_message'],
                'lastMessageAt'   => $row['last_message_at'],
                'lastMessageRole' => $row['last_message_role'],
                'unreadCount'     => (int) $row['unread_count'],
            ]);
        }, $stmt->fetchAll());

        return ['success' => true, 'chats' => $chats];
    }

    // =========================================================================
    // POST /api/livechat/accept   { chatId }
    // Secretary atomically locks a waiting chat to themselves.
    // =========================================================================
    public function accept(array $data): array
    {
        $secretary = $this->requireSecretary();
        if (!$secretary) {
            return $this->unauthorized();
        }

        $chatId = $this->cleanId($data['chatId'] ?? null);
        if ($chatId === null) {
            return ['success' => false, 'error' => 'chatId is required.'];
        }

        // Atomic accept — only wins if status is still 'waiting'.
        $stmt = $this->db->prepare(
            "UPDATE live_chat
                SET status             = 'active',
                    secretary_user_id  = ?,
                    accepted_at        = NOW()
              WHERE id = ? AND status = 'waiting'"
        );
        $stmt->execute([$secretary['id'], $chatId]);

        if ($stmt->rowCount() === 0) {
            // Either wrong ID or another secretary already accepted it.
            return [
                'success' => false,
                'error'   => 'This chat was already accepted by another secretary, or does not exist.',
                'status'  => 409,
            ];
        }

        $row = $this->fetchChatById($chatId);

        // Notify the patient that a secretary has joined.
        $this->notifier->send((int) $row['patient_user_id'], [
            'type'        => 'live_chat.secretary_joined',
            'title'       => 'A secretary has joined your chat',
            'body'        => sprintf('%s has accepted your live chat request.', $secretary['name']),
            'relatedType' => 'live_chat',
            'relatedId'   => $chatId,
        ]);

        // Welcome message from secretary.
        $this->insertMessage($chatId, $secretary['id'], 'secretary',
            sprintf('Hello, I\'m %s. How can I help you today?', $secretary['name']));

        $shaped = $this->shapeChat($row);

        // The atomic accept above is untouched: a secretary who lost the race
        // returned 409 and never reaches this line, so only the owner ever
        // publishes. This tells the patient who picked their conversation up.
        $this->realtime->accepted($chatId, $shaped);

        return ['success' => true, 'chat' => $shaped];
    }

    // =========================================================================
    // GET /api/livechat/messages?chatId=&since=
    // Load messages for a chat. Both patient and assigned secretary may call this.
    // since = last known message ID (0 for all).
    // =========================================================================
    public function messages(array $query): array
    {
        $caller = $this->requireAny();
        if (!$caller) {
            return $this->unauthorized();
        }

        $chatId = $this->cleanId($query['chatId'] ?? null);
        if ($chatId === null) {
            return ['success' => false, 'error' => 'chatId is required.'];
        }

        $chat = $this->fetchChatById($chatId);
        if ($chat === null) {
            return ['success' => false, 'error' => 'Chat not found.', 'status' => 404];
        }

        if (!$this->canAccessChat($caller, $chat)) {
            return ['success' => false, 'error' => 'Access denied.', 'status' => 403];
        }

        $since = max(0, (int) ($query['since'] ?? 0));

        // AI turns are excluded here on purpose. This endpoint feeds the patient
        // and secretary live-chat panes, both of which place a message left or
        // right purely on senderRole === 'patient' / 'secretary'; an unknown
        // third role would be rendered as if the secretary had said it. The
        // doctor's read-only view has its own endpoint and shows every role.
        $stmt = $this->db->prepare(
            "SELECT m.id, m.sender_user_id, m.sender_role, m.content, m.created_at,
                    u.name AS sender_name
               FROM live_chat_message m
               JOIN user u ON u.id = m.sender_user_id
              WHERE m.chat_id = ? AND m.id > ?
                AND m.sender_role <> 'ai'
              ORDER BY m.id ASC"
        );
        $stmt->execute([$chatId, $since]);

        $messages = array_map(static function (array $row): array {
            return [
                'id'         => (int) $row['id'],
                'senderRole' => $row['sender_role'],
                'senderName' => $row['sender_name'],
                'content'    => $row['content'],
                'createdAt'  => $row['created_at'],
            ];
        }, $stmt->fetchAll());

        // Reading a conversation marks it read — but only for the secretary who
        // owns it. canAccessChat() above already refused anyone else, and the
        // guard on secretary_user_id makes that explicit here too, so one
        // secretary can never clear another's unread badge.
        if (in_array('ROLE_SECRETARY', $caller['roles'], true)) {
            $this->markRead($chatId, $caller['id']);
        }

        return [
            'success'  => true,
            'chat'     => $this->shapeChat($chat),
            'messages' => $messages,
        ];
    }

    // =========================================================================
    // POST /api/livechat/message   { chatId, content }
    // Send a message. Both patient and assigned secretary may call this.
    // =========================================================================
    public function sendMessage(array $data): array
    {
        $caller = $this->requireAny();
        if (!$caller) {
            return $this->unauthorized();
        }

        $chatId = $this->cleanId($data['chatId'] ?? null);
        if ($chatId === null) {
            return ['success' => false, 'error' => 'chatId is required.'];
        }

        $content = $this->cleanContent($data['content'] ?? null);
        if ($content === null) {
            return ['success' => false, 'error' => 'Message content is required (max 2000 chars).'];
        }

        $chat = $this->fetchChatById($chatId);
        if ($chat === null) {
            return ['success' => false, 'error' => 'Chat not found.', 'status' => 404];
        }

        if ((string) $chat['status'] !== 'active') {
            return ['success' => false, 'error' => 'This chat is not active.'];
        }

        if (!$this->canAccessChat($caller, $chat)) {
            return ['success' => false, 'error' => 'Access denied.', 'status' => 403];
        }

        $role = in_array('ROLE_SECRETARY', $caller['roles'], true) ? 'secretary' : 'patient';
        $msgId = $this->insertMessage($chatId, $caller['id'], $role, $content);

        // Notify the other party.
        if ($role === 'patient' && $chat['secretary_user_id'] !== null) {
            $this->notifier->send((int) $chat['secretary_user_id'], [
                'type'        => 'live_chat.new_message',
                'title'       => 'New patient message',
                'body'        => mb_substr($content, 0, 100),
                'relatedType' => 'live_chat',
                'relatedId'   => $chatId,
            ]);
        } elseif ($role === 'secretary') {
            $this->notifier->send((int) $chat['patient_user_id'], [
                'type'        => 'live_chat.new_message',
                'title'       => 'New message from secretary',
                'body'        => mb_substr($content, 0, 100),
                'relatedType' => 'live_chat',
                'relatedId'   => $chatId,
            ]);
        }

        $payload = [
            'id'         => $msgId,
            'senderRole' => $role,
            'senderName' => $caller['name'],
            'content'    => $content,
            'createdAt'  => date('Y-m-d H:i:s'),
        ];

        // Already committed above — this only pushes it to whoever is watching.
        // Both directions use this one call: a patient message reaches the
        // assigned secretary and vice versa, because the realtime server fans
        // out to the conversation's subscribers, and only PHP decides who is
        // allowed to be one.
        $this->realtime->message($chatId, $payload);

        return ['success' => true, 'message' => $payload];
    }

    // =========================================================================
    // POST /api/livechat/close   { chatId }
    // Secretary closes an active chat.
    // =========================================================================
    public function close(array $data): array
    {
        $secretary = $this->requireSecretary();
        if (!$secretary) {
            return $this->unauthorized();
        }

        $chatId = $this->cleanId($data['chatId'] ?? null);
        if ($chatId === null) {
            return ['success' => false, 'error' => 'chatId is required.'];
        }

        $chat = $this->fetchChatById($chatId);
        if ($chat === null) {
            return ['success' => false, 'error' => 'Chat not found.', 'status' => 404];
        }

        // Only the assigned secretary may close their own chat.
        if ((int) $chat['secretary_user_id'] !== $secretary['id']) {
            return ['success' => false, 'error' => 'Access denied.', 'status' => 403];
        }

        if ((string) $chat['status'] !== 'active') {
            return ['success' => false, 'error' => 'Chat is not active.'];
        }

        $stmt = $this->db->prepare(
            "UPDATE live_chat SET status = 'closed', closed_at = NOW() WHERE id = ?"
        );
        $stmt->execute([$chatId]);

        // Notify the patient.
        $this->notifier->send((int) $chat['patient_user_id'], [
            'type'        => 'live_chat.closed',
            'title'       => 'Live chat ended',
            'body'        => 'The secretary has closed your live chat session.',
            'relatedType' => 'live_chat',
            'relatedId'   => $chatId,
        ]);

        $this->realtime->closed($chatId, $this->shapeChat($this->fetchChatById($chatId) ?? $chat));

        return ['success' => true, 'message' => 'Chat closed.'];
    }

    // =========================================================================
    // GET /api/livechat/poll?chatId=&since=
    // Lightweight poll: returns chat status + messages since a given ID.
    // Used by both patient and secretary for the live message feed.
    // =========================================================================
    public function poll(array $query): array
    {
        return $this->messages($query);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private function fetchChatById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT lc.*, u.name AS patient_name,
                    s.name AS secretary_name
               FROM live_chat lc
               JOIN user u ON u.id = lc.patient_user_id
               LEFT JOIN user s ON s.id = lc.secretary_user_id
              WHERE lc.id = ?"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    /**
     * Turn this patient's open AI conversation into a waiting live chat.
     *
     * The UPDATE is guarded on status='ai' so it can only ever promote a
     * conversation the secretary queue has never seen. Returns the promoted
     * chat id, or null when the patient has no AI conversation to carry over.
     */
    private function promoteAiConversation(int $patientId): ?int
    {
        $stmt = $this->db->prepare(
            "SELECT id FROM live_chat
              WHERE patient_user_id = ? AND status = 'ai'
              ORDER BY id DESC
              LIMIT 1"
        );
        $stmt->execute([$patientId]);
        $chatId = $stmt->fetchColumn();

        if ($chatId === false) {
            return null;
        }

        $promote = $this->db->prepare(
            "UPDATE live_chat
                SET status = 'waiting', created_at = NOW()
              WHERE id = ? AND status = 'ai'"
        );
        $promote->execute([(int) $chatId]);

        // Lost a race with another tab doing the same thing — let the caller
        // fall back to a plain insert.
        return $promote->rowCount() === 1 ? (int) $chatId : null;
    }

    private function fetchPatientOpenChat(int $patientId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT lc.*, u.name AS patient_name,
                    s.name AS secretary_name
               FROM live_chat lc
               JOIN user u ON u.id = lc.patient_user_id
               LEFT JOIN user s ON s.id = lc.secretary_user_id
              WHERE lc.patient_user_id = ?
                AND lc.status IN ('waiting', 'active')
              ORDER BY lc.id DESC
              LIMIT 1"
        );
        $stmt->execute([$patientId]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    private function shapeChat(array $row): array
    {
        return [
            'id'             => (int) $row['id'],
            'patientId'      => (int) $row['patient_user_id'],
            'patientName'    => $row['patient_name'] ?? null,
            'secretaryId'    => $row['secretary_user_id'] !== null ? (int) $row['secretary_user_id'] : null,
            'secretaryName'  => $row['secretary_name'] ?? null,
            'status'         => $row['status'],
            'createdAt'      => $row['created_at'],
            'acceptedAt'     => $row['accepted_at'],
            'closedAt'       => $row['closed_at'],
        ];
    }

    /**
     * Advance this conversation's read high-water mark to its newest message.
     *
     * Guarded on secretary_user_id so it is a no-op for any secretary other
     * than the assigned one — the read marker belongs to the owner of the
     * conversation, not to whoever happened to issue the request.
     *
     * GREATEST() keeps the marker monotonic: polling with `since` set, or a
     * request arriving out of order, must never move it backwards and
     * resurrect messages the secretary has already seen.
     */
    private function markRead(int $chatId, int $secretaryId): void
    {
        $stmt = $this->db->prepare(
            "UPDATE live_chat lc
                SET lc.secretary_last_read_message_id = GREATEST(
                        COALESCE(lc.secretary_last_read_message_id, 0),
                        COALESCE((SELECT MAX(m.id) FROM live_chat_message m WHERE m.chat_id = lc.id), 0)
                    )
              WHERE lc.id = ? AND lc.secretary_user_id = ?"
        );
        $stmt->execute([$chatId, $secretaryId]);
    }

    private function insertMessage(int $chatId, int $senderId, string $role, string $content): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO live_chat_message (chat_id, sender_user_id, sender_role, content, created_at)
             VALUES (?, ?, ?, ?, NOW())"
        );
        $stmt->execute([$chatId, $senderId, $role, $content]);

        return (int) $this->db->lastInsertId();
    }

    /** True if the caller is either the patient or the assigned secretary. */
    private function canAccessChat(array $caller, array $chat): bool
    {
        if (in_array('ROLE_PATIENT', $caller['roles'], true)) {
            return $caller['id'] === (int) $chat['patient_user_id'];
        }
        if (in_array('ROLE_SECRETARY', $caller['roles'], true)) {
            // Waiting queue is visible to all secretaries.
            if ((string) $chat['status'] === 'waiting') {
                return true;
            }
            // Active/closed — only the assigned secretary.
            return $chat['secretary_user_id'] !== null
                && $caller['id'] === (int) $chat['secretary_user_id'];
        }

        return false;
    }

    // ── Auth helpers ──────────────────────────────────────────────────────────

    private function requirePatient(): ?array
    {
        $user = $this->currentUser();
        if ($user === null || !in_array('ROLE_PATIENT', $user['roles'], true)) {
            return null;
        }

        return $user;
    }

    private function requireSecretary(): ?array
    {
        $user = $this->currentUser();
        if ($user === null || !in_array('ROLE_SECRETARY', $user['roles'], true)) {
            return null;
        }

        return $user;
    }

    /** Any authenticated user (patient or secretary). */
    private function requireAny(): ?array
    {
        return $this->currentUser();
    }

    private function currentUser(): ?array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $matches)) {
            return null;
        }

        $stmt = $this->db->prepare('SELECT id, name, roles FROM `user` WHERE id = ?');
        $stmt->execute([(int) $matches[1]]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        $roles = json_decode((string) $row['roles'], true);
        if (!is_array($roles)) {
            return null;
        }

        return ['id' => (int) $row['id'], 'name' => $row['name'], 'roles' => $roles];
    }

    // ── Value helpers ─────────────────────────────────────────────────────────

    private function cleanId($value): ?int
    {
        if (is_int($value) && $value > 0) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
            return (int) $value;
        }

        return null;
    }

    private function cleanContent($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);
        if ($trimmed === '' || mb_strlen($trimmed) > self::MAX_MESSAGE) {
            return null;
        }

        return $trimmed;
    }

    private function unauthorized(): array
    {
        return ['success' => false, 'error' => 'Authentication required.', 'status' => 401];
    }
}
