-- =============================================================================
-- AI configuration settings
--
-- The chatbot's editable behaviour — welcome text, fallback text, which
-- capabilities are offered, whether the FAQ is consulted — previously lived as
-- string literals inside AiChatController. This gives the administrator a place
-- to change them without a deploy.
--
-- WHAT IS DELIBERATELY *NOT* HERE
--   The Gemini API key. It stays in backend/.env and is read server-side by
--   AiChatController::env(). Putting a credential in a table that an admin
--   screen reads back would be the fastest way to leak it to the browser. The
--   admin UI is told only whether a key is configured, never its value.
--
-- Key/value rather than one column per setting: the set of knobs will change,
-- and a narrow table means adding one is an INSERT rather than a migration.
--
-- Target: MariaDB 10.4+
-- Run:  mysql -u root medisecretary < 2026_08_11_ai_settings.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `ai_setting` (
    `setting_key`  VARCHAR(64)  NOT NULL,
    `setting_value` TEXT        NOT NULL,
    `updated_at`   DATETIME     DEFAULT NULL ON UPDATE current_timestamp(),
    `updated_by`   INT          DEFAULT NULL,

    PRIMARY KEY (`setting_key`),

    CONSTRAINT `FK_AI_SETTING_USER`
        FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL

) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- Defaults.
--
-- INSERT IGNORE so re-running never overwrites what an administrator has since
-- changed. The fallback text and option list reproduce the behaviour the chat
-- already had, so applying this migration on its own changes nothing.
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `ai_setting` (`setting_key`, `setting_value`) VALUES
    ('assistant_enabled',  '1'),
    ('welcome_message',    'Hello! I''m your clinic assistant. I can help you book or cancel an appointment, request a document, or connect you with a secretary.'),
    ('fallback_message',   'Sorry, I couldn''t understand your request. Please select one of the options below:'),
    ('faq_enabled',        '1');

-- Which chatbot options are offered is NOT stored here. That is
-- ai_intent.is_active — the Conversation Scenarios screen — so there is exactly
-- one switch per scenario rather than two that could disagree.


-- -----------------------------------------------------------------------------
-- The fourth built-in scenario.
--
-- ai_intent was seeded with book_appointment, cancel_appointment and
-- document_request, but not the secretary hand-off — even though
-- LiveChatController has implemented it all along. Without a row the admin
-- cannot see or disable it alongside the other three.
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `ai_intent` (`name`, `description`, `priority`, `is_active`) VALUES
    ('live_chat', 'Patient wants to talk to a human secretary', 12, 1);

INSERT IGNORE INTO `ai_keyword` (`keyword`, `intent_id`)
SELECT k.kw, i.id
  FROM `ai_intent` i
  JOIN (
        SELECT 'live chat'  AS kw
  UNION SELECT 'secretary'
  UNION SELECT 'human'
  UNION SELECT 'talk to someone'
  UNION SELECT 'real person'
  ) k
 WHERE i.name = 'live_chat';


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS `ai_setting`;
