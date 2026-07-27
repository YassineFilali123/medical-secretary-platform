-- =============================================================================
-- MedSecretary — Profile + Password management
-- Database: medisecretary
-- Run in phpMyAdmin, or:  mysql -u root medisecretary < 2026_07_26_profile_and_password.sql
--
-- Depends on the existing `user` table (Version20260725000001).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Security / audit columns on the existing `user` table
-- -----------------------------------------------------------------------------
ALTER TABLE `user`
    ADD COLUMN `status`                    VARCHAR(20)  NOT NULL DEFAULT 'active' AFTER `is_verified`,
    ADD COLUMN `password_changed_at`       DATETIME     DEFAULT NULL AFTER `password`,
    ADD COLUMN `password_reset_token`      VARCHAR(64)  DEFAULT NULL AFTER `password_changed_at`,
    ADD COLUMN `password_reset_expires_at` DATETIME     DEFAULT NULL AFTER `password_reset_token`,
    ADD COLUMN `updated_at`                DATETIME     DEFAULT NULL AFTER `created_at`,
    ADD COLUMN `last_login_at`             DATETIME     DEFAULT NULL AFTER `updated_at`;

-- Lookup index for the forgot-password flow
ALTER TABLE `user`
    ADD INDEX `IDX_USER_RESET_TOKEN` (`password_reset_token`);

-- Existing accounts: treat their creation date as the last password change
UPDATE `user`
   SET `password_changed_at` = `created_at`
 WHERE `password_changed_at` IS NULL;


-- -----------------------------------------------------------------------------
-- 2. `user_profile` — 1:1 with `user`
--    Common columns for every role; role-specific columns are nullable.
-- -----------------------------------------------------------------------------
CREATE TABLE `user_profile` (
    `id`                INT AUTO_INCREMENT NOT NULL,
    `user_id`           INT          NOT NULL,

    -- Common (all roles)
    `phone`             VARCHAR(30)  DEFAULT NULL,
    `avatar_url`        VARCHAR(255) DEFAULT NULL,

    -- Patient
    `date_of_birth`     DATE         DEFAULT NULL,
    `gender`            VARCHAR(20)  DEFAULT NULL,
    `blood_type`        VARCHAR(5)   DEFAULT NULL,
    `allergies`         TEXT         NULL,
    `emergency_contact` VARCHAR(255) DEFAULT NULL,

    -- Doctor
    `specialty`         VARCHAR(120) DEFAULT NULL,
    `license_number`    VARCHAR(60)  DEFAULT NULL,
    `bio`               TEXT         NULL,
    `clinic_name`       VARCHAR(180) DEFAULT NULL,
    `clinic_address`    VARCHAR(255) DEFAULT NULL,

    -- Secretary
    `department`        VARCHAR(120) DEFAULT NULL,

    `created_at`        DATETIME     NOT NULL,
    `updated_at`        DATETIME     DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `UNIQ_USER_PROFILE_USER` (`user_id`),
    CONSTRAINT `FK_USER_PROFILE_USER`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 3. Backfill: give every existing user an empty profile row
-- -----------------------------------------------------------------------------
INSERT INTO `user_profile` (`user_id`, `created_at`)
SELECT u.`id`, NOW()
  FROM `user` u
  LEFT JOIN `user_profile` p ON p.`user_id` = u.`id`
 WHERE p.`id` IS NULL;


-- -----------------------------------------------------------------------------
-- 4. Convenience view — user + profile in one row
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_user_profile` AS
SELECT
    u.`id`                AS user_id,
    u.`name`,
    u.`email`,
    u.`roles`,
    u.`is_verified`,
    u.`status`,
    u.`created_at`,
    u.`last_login_at`,
    u.`password_changed_at`,
    p.`phone`,
    p.`avatar_url`,
    p.`date_of_birth`,
    p.`gender`,
    p.`blood_type`,
    p.`allergies`,
    p.`emergency_contact`,
    p.`specialty`,
    p.`license_number`,
    p.`bio`,
    p.`clinic_name`,
    p.`clinic_address`,
    p.`department`
FROM `user` u
LEFT JOIN `user_profile` p ON p.`user_id` = u.`id`;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP VIEW IF EXISTS `v_user_profile`;
-- DROP TABLE IF EXISTS `user_profile`;
-- ALTER TABLE `user` DROP INDEX `IDX_USER_RESET_TOKEN`;
-- ALTER TABLE `user`
--     DROP COLUMN `status`,
--     DROP COLUMN `password_changed_at`,
--     DROP COLUMN `password_reset_token`,
--     DROP COLUMN `password_reset_expires_at`,
--     DROP COLUMN `updated_at`,
--     DROP COLUMN `last_login_at`;
