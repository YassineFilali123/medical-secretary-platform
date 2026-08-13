-- =============================================================================
-- Admin user management
--
-- Adds the one column the admin module needs: deleted_at.
--
-- WHY SOFT DELETE
--   Every foreign key that points at `user` is ON DELETE CASCADE — 24 of them,
--   covering appointment, consultation_report, doctor_rating, patient_document,
--   live_chat and more. A hard DELETE of a doctor would therefore erase their
--   patients' appointments and medical reports as a side effect, silently and
--   irreversibly. Soft delete keeps the row (and every record hanging off it)
--   and simply removes the account from circulation.
--
--   `status` is NOT reused for this: 'inactive' is a reversible suspension the
--   admin toggles, whereas deleted_at means the account is gone. Keeping them
--   separate lets the UI show "3 inactive users" without counting deleted ones.
--
-- NOTE ON EMAIL
--   user.email stays UNIQUE, so a soft-deleted account keeps its address
--   reserved. Creating a new user with that address is refused with an explicit
--   message rather than silently resurrecting the old account.
--
-- Target: MariaDB 10.4+
-- Run:  mysql -u root medisecretary < 2026_08_11_admin_user_management.sql
-- =============================================================================

ALTER TABLE `user`
    ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME DEFAULT NULL AFTER `last_login_at`;

-- The admin list filters on deleted_at and usually also on status; the doctor
-- and patient directories filter on status + deleted_at together.
CREATE INDEX `IDX_USER_ACTIVE` ON `user` (`deleted_at`, `status`);


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP INDEX `IDX_USER_ACTIVE` ON `user`;
-- ALTER TABLE `user` DROP COLUMN `deleted_at`;
