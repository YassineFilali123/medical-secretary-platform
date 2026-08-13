-- =============================================================================
-- AI conversation history (doctor read-only view)
--
-- The patient AI assistant used to be entirely stateless: /api/ai/chat answered
-- and forgot. Nothing was stored, so a doctor had no way to review what their
-- patients had discussed with the assistant.
--
-- Rather than introduce a second conversation system, this reuses the existing
-- live_chat / live_chat_message pair. One live_chat row is ONE conversation for
-- its whole life, including a hand-off to a secretary:
--
--   ai       → AI assistant only; no secretary involved (new)
--   waiting  → patient asked for a secretary, none has accepted yet
--   active   → a secretary accepted and is handling it
--   closed   → finished
--
-- 'ai' is deliberately a separate status from 'waiting': the secretary queue
-- selects WHERE status='waiting', so AI-only conversations must never land in
-- it. LiveChatController::start() promotes 'ai' → 'waiting' in place, which is
-- what keeps the AI turns and the secretary turns in a single transcript.
--
-- Target: MariaDB 10.4+
-- Run:  mysql -u root medisecretary < 2026_08_11_ai_conversation_history.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Allow the 'ai' conversation status
-- -----------------------------------------------------------------------------
ALTER TABLE `live_chat`
    DROP CONSTRAINT IF EXISTS `CHK_LC_STATUS`;

ALTER TABLE `live_chat`
    ADD CONSTRAINT `CHK_LC_STATUS`
        CHECK (`status` IN ('ai', 'waiting', 'active', 'closed'));


-- -----------------------------------------------------------------------------
-- 2. Allow 'ai' as a message sender
--
-- sender_user_id stays NOT NULL and holds the patient's id for AI turns: the
-- assistant is not a user account, and relaxing the column to NULL would mean
-- revisiting every JOIN in LiveChatController. sender_role is the field that
-- actually distinguishes who spoke.
-- -----------------------------------------------------------------------------
ALTER TABLE `live_chat_message`
    DROP CONSTRAINT IF EXISTS `CHK_LCM_ROLE`;

ALTER TABLE `live_chat_message`
    ADD CONSTRAINT `CHK_LCM_ROLE`
        CHECK (`sender_role` IN ('patient', 'ai', 'secretary'));


-- -----------------------------------------------------------------------------
-- 3. Index for "find this patient's current AI conversation"
--
-- IDX_LC_PATIENT (patient_user_id, status) already covers the lookup; this adds
-- created_at so the doctor's list can order without a filesort.
-- -----------------------------------------------------------------------------
CREATE INDEX `IDX_LC_PATIENT_CREATED`
    ON `live_chat` (`patient_user_id`, `created_at`);


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP INDEX `IDX_LC_PATIENT_CREATED` ON `live_chat`;
-- DELETE FROM `live_chat_message` WHERE `sender_role` = 'ai';
-- DELETE FROM `live_chat` WHERE `status` = 'ai';
-- ALTER TABLE `live_chat_message` DROP CONSTRAINT IF EXISTS `CHK_LCM_ROLE`;
-- ALTER TABLE `live_chat_message` ADD CONSTRAINT `CHK_LCM_ROLE`
--     CHECK (`sender_role` IN ('patient', 'secretary'));
-- ALTER TABLE `live_chat` DROP CONSTRAINT IF EXISTS `CHK_LC_STATUS`;
-- ALTER TABLE `live_chat` ADD CONSTRAINT `CHK_LC_STATUS`
--     CHECK (`status` IN ('waiting', 'active', 'closed'));
