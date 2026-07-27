<?php

/**
 * The read side of notifications.
 *
 * `since` makes this cheap enough to poll: the client sends the highest id it
 * already holds and gets back only what is newer, so a quiet clinic costs an
 * empty array. When a WebSocket transport is added it feeds the same rows —
 * this endpoint stays as the catch-up path after a reconnect.
 */
class NotificationController
{
    private const DEFAULT_LIMIT = 30;
    private const MAX_LIMIT     = 100;

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // GET /api/notifications[?since=41&unreadOnly=1&limit=30]
    // =========================================================================
    public function index(array $query): array
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $where  = ['user_id = ?'];
        $params = [$userId];

        $since = $query['since'] ?? null;
        if ($since !== null && $since !== '') {
            if (!is_string($since) || !ctype_digit($since)) {
                return ['success' => false, 'error' => 'since must be a number.'];
            }
            $where[]  = 'id > ?';
            $params[] = (int) $since;
        }

        if (!empty($query['unreadOnly'])) {
            $where[] = 'is_read = 0';
        }

        $limit = self::DEFAULT_LIMIT;
        if (isset($query['limit']) && is_string($query['limit']) && ctype_digit($query['limit'])) {
            $limit = max(1, min((int) $query['limit'], self::MAX_LIMIT));
        }

        $stmt = $this->db->prepare(
            'SELECT id, type, title, body, related_type, related_id, is_urgent, is_read, created_at
               FROM notification
              WHERE ' . implode(' AND ', $where) . '
              ORDER BY id DESC
              LIMIT ' . $limit
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Always the true unread total, not a count of this page — the badge
        // must not change just because the caller asked for `since`.
        $unread = $this->db->prepare('SELECT COUNT(*) FROM notification WHERE user_id = ? AND is_read = 0');
        $unread->execute([$userId]);

        $latest = $this->db->prepare('SELECT COALESCE(MAX(id), 0) FROM notification WHERE user_id = ?');
        $latest->execute([$userId]);

        return [
            'success'       => true,
            'notifications' => array_map(static function (array $r): array {
                return [
                    'id'          => (int) $r['id'],
                    'type'        => $r['type'],
                    'title'       => $r['title'],
                    'body'        => $r['body'],
                    'relatedType' => $r['related_type'],
                    'relatedId'   => $r['related_id'] === null ? null : (int) $r['related_id'],
                    'isUrgent'    => (bool) $r['is_urgent'],
                    'isRead'      => (bool) $r['is_read'],
                    'createdAt'   => $r['created_at'],
                ];
            }, $rows),
            'unreadCount'   => (int) $unread->fetchColumn(),
            // The cursor to send back next poll.
            'latestId'      => (int) $latest->fetchColumn(),
        ];
    }

    // =========================================================================
    // POST /api/notifications/read   { id }  or  { all: true }
    // =========================================================================
    public function markRead(array $data): array
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        if (!empty($data['all'])) {
            $stmt = $this->db->prepare(
                'UPDATE notification SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0'
            );
            $stmt->execute([$userId]);

            return ['success' => true, 'message' => 'All notifications marked as read.', 'updated' => $stmt->rowCount()];
        }

        $id = $data['id'] ?? null;
        if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
            return ['success' => false, 'error' => 'A valid id is required.'];
        }

        // Scoped to the owner, so one user cannot mark another's notifications.
        $stmt = $this->db->prepare(
            'UPDATE notification SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([(int) $id, $userId]);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'error' => 'Notification not found.', 'status' => 404];
        }

        return ['success' => true, 'message' => 'Marked as read.', 'updated' => 1];
    }

    private function currentUserId(): ?int
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return null;
        }

        $stmt = $this->db->prepare('SELECT id FROM `user` WHERE id = ?');
        $stmt->execute([(int) $m[1]]);

        return $stmt->fetchColumn() === false ? null : (int) $m[1];
    }
}
