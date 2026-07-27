<?php

/**
 * Writes notifications.
 *
 * Deliberately store-then-read rather than push. Persisting first means a
 * recipient who was offline, on another page, or mid-refresh still sees what
 * happened — a pure push would simply lose it.
 *
 * ---------------------------------------------------------------------------
 * WHERE REAL-TIME TRANSPORT PLUGS IN
 *
 * `send()` is the single choke point through which every notification in the
 * system passes. To move from polling to WebSockets, publish here — after the
 * INSERT, so the stored row stays the source of truth and a dropped socket
 * degrades to "seen on next poll" instead of "lost":
 *
 *     $id = $this->insert(...);
 *     $this->publish($userId, $id);   // e.g. Redis PUBLISH, or POST to a
 *                                     // Ratchet/Node process holding the sockets
 *
 * Nothing else in the codebase needs to change: callers already speak in terms
 * of "notify this user", not "write a row".
 * ---------------------------------------------------------------------------
 */
class Notifier
{
    // Types are strings rather than an enum so adding one never needs a migration.
    public const EXTENSION_AUTO_APPROVED = 'consultation.extension.auto_approved';
    public const EXTENSION_REQUESTED     = 'consultation.extension.requested';
    public const EXTENSION_APPROVED      = 'consultation.extension.approved';
    public const EXTENSION_REJECTED      = 'consultation.extension.rejected';
    public const APPOINTMENT_DELAYED     = 'appointment.delayed';
    public const EMERGENCY               = 'consultation.emergency';

    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * @param array{type:string,title:string,body?:?string,relatedType?:?string,
     *              relatedId?:?int,urgent?:bool} $notification
     */
    public function send(int $userId, array $notification): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO notification
                 (user_id, type, title, body, related_type, related_id, is_urgent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
        );

        $stmt->execute([
            $userId,
            $notification['type'],
            $this->clip($notification['title'], 160),
            isset($notification['body']) ? $this->clip($notification['body'], 500) : null,
            $notification['relatedType'] ?? null,
            $notification['relatedId'] ?? null,
            !empty($notification['urgent']) ? 1 : 0,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Same notification to several people — every secretary, say.
     *
     * @param list<int> $userIds
     * @return list<int>
     */
    public function sendMany(array $userIds, array $notification): array
    {
        $ids = [];
        foreach (array_unique($userIds) as $userId) {
            $ids[] = $this->send((int) $userId, $notification);
        }

        return $ids;
    }

    /**
     * Everyone who staffs the front desk. Adjustment requests go to the role,
     * not to a named person, so whoever is on shift picks them up.
     *
     * @return list<int>
     */
    public function secretaryIds(): array
    {
        $stmt = $this->db->query(
            "SELECT id FROM `user` WHERE roles LIKE '%ROLE_SECRETARY%' AND status = 'active'"
        );

        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** Titles and bodies are bounded columns; truncate rather than error. */
    private function clip(string $text, int $max): string
    {
        return mb_strlen($text) <= $max ? $text : mb_substr($text, 0, $max - 1) . '…';
    }
}
