-- =============================================================================
-- Unread-message tracking for the secretary's Active Conversations view
--
-- live_chat_message had no read state at all, so "2 unread messages" could not
-- be answered. Rather than add a per-message read table — which would mean one
-- row per message per reader for a feature with exactly one reader — this
-- records the high-water mark on the conversation itself.
--
-- Unread is then simply: patient messages with an id greater than this.
--
-- Only the secretary side is tracked. The patient is always looking at their
-- own chat while it is open, and nothing in the product shows them an unread
-- count, so a second column would never be read.
--
-- Target: MariaDB 10.4+
-- Run:  mysql -u root medisecretary < 2026_08_12_live_chat_read_tracking.sql
-- =============================================================================

ALTER TABLE `live_chat`
    ADD COLUMN IF NOT EXISTS `secretary_last_read_message_id` INT DEFAULT NULL
        AFTER `secretary_user_id`;

-- Existing open conversations start as fully read, so applying this migration
-- does not light up every conversation with a spurious unread badge.
UPDATE `live_chat` lc
   SET lc.secretary_last_read_message_id = (
        SELECT MAX(m.id) FROM `live_chat_message` m WHERE m.chat_id = lc.id
   )
 WHERE lc.secretary_last_read_message_id IS NULL;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE `live_chat` DROP COLUMN `secretary_last_read_message_id`;
