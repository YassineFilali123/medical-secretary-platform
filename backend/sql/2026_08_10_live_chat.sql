-- =============================================================================
-- Secretary Live Chat
--
-- Allows a patient to initiate a live text conversation with a secretary
-- directly from the AI chat interface.
--
-- Status lifecycle:
--   waiting  → patient clicked "Live Chat with Secretary", no secretary yet
--   active   → a secretary accepted (atomically locked to that secretary)
--   closed   → secretary or system closed the conversation
--
-- Locking strategy:
--   The accept action uses a single atomic UPDATE:
--     UPDATE live_chat SET status='active', secretary_user_id=?, accepted_at=NOW()
--      WHERE id=? AND status='waiting'
--   rowCount()=0 means another secretary won the race → HTTP 409.
--
-- Target: MariaDB 10.4+
-- Run:  mysql -u root medisecretary < 2026_08_10_live_chat.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Chat session
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `live_chat` (
    `id`                  INT AUTO_INCREMENT NOT NULL,
    `patient_user_id`     INT          NOT NULL,
    -- NULL while waiting; set atomically when a secretary accepts
    `secretary_user_id`   INT          DEFAULT NULL,
    -- waiting | active | closed
    `status`              VARCHAR(10)  NOT NULL DEFAULT 'waiting',
    `created_at`          DATETIME     NOT NULL,
    `accepted_at`         DATETIME     DEFAULT NULL,
    `closed_at`           DATETIME     DEFAULT NULL,

    PRIMARY KEY (`id`),
    -- Fast lookup for the patient's own current chat
    INDEX `IDX_LC_PATIENT`   (`patient_user_id`, `status`),
    -- Secretary queue: all waiting chats ordered by arrival
    INDEX `IDX_LC_WAITING`   (`status`, `created_at`),
    -- Secretary's own active chats
    INDEX `IDX_LC_SECRETARY` (`secretary_user_id`, `status`),

    CONSTRAINT `CHK_LC_STATUS`
        CHECK (`status` IN ('waiting', 'active', 'closed')),

    CONSTRAINT `FK_LC_PATIENT`
        FOREIGN KEY (`patient_user_id`)   REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_LC_SECRETARY`
        FOREIGN KEY (`secretary_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL

) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 2. Messages within a chat session
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `live_chat_message` (
    `id`              INT AUTO_INCREMENT NOT NULL,
    `chat_id`         INT          NOT NULL,
    `sender_user_id`  INT          NOT NULL,
    -- 'patient' | 'secretary'
    `sender_role`     VARCHAR(20)  NOT NULL,
    `content`         TEXT         NOT NULL,
    `created_at`      DATETIME     NOT NULL,

    PRIMARY KEY (`id`),
    -- Ordered message fetch for a given chat
    INDEX `IDX_LCM_CHAT` (`chat_id`, `id`),

    CONSTRAINT `CHK_LCM_ROLE`
        CHECK (`sender_role` IN ('patient', 'secretary')),

    CONSTRAINT `FK_LCM_CHAT`
        FOREIGN KEY (`chat_id`)        REFERENCES `live_chat` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_LCM_SENDER`
        FOREIGN KEY (`sender_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE

) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS `live_chat_message`;
-- DROP TABLE IF EXISTS `live_chat`;
