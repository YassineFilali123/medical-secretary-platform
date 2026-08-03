-- =============================================================================
-- MedSecretary -- Follow-up appointment recommendations
-- Target server : MariaDB 10.4.32 (XAMPP)
-- Database      : medisecretary  (utf8mb4 / utf8mb4_unicode_ci / InnoDB)
--
-- HOW TO RUN:
--     Get-Content "...sql" | C:\xampp\mysql\bin\mysql.exe -u root medisecretary
--
-- WHAT THIS SCRIPT PRODUCES
--   TABLE  follow_up_recommendation (new)
--
-- RE-RUNNABLE. Every statement is idempotent.
-- =============================================================================

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION';


CREATE TABLE IF NOT EXISTS `follow_up_recommendation` (
    `id`                   INT          NOT NULL AUTO_INCREMENT,
    `appointment_id`       INT          NOT NULL,
    `doctor_user_id`       INT          NOT NULL,
    `patient_user_id`      INT          NOT NULL,

    -- Type: none, exact, period
    `type`                 VARCHAR(20)  NOT NULL DEFAULT 'none',

    -- Priority: routine, recommended, urgent
    `priority`             VARCHAR(20)  NOT NULL DEFAULT 'routine',

    -- For exact type
    `recommended_date`     DATE         DEFAULT NULL,
    `recommended_time`     TIME         DEFAULT NULL,

    -- For period type
    `period_days`          INT          DEFAULT NULL,
    `period_label`         VARCHAR(100) DEFAULT NULL,

    -- Doctor's note / reason
    `note`                 TEXT         DEFAULT NULL,

    -- Status: pending, accepted, booked, cancelled, expired
    `status`               VARCHAR(20)  NOT NULL DEFAULT 'pending',

    -- If patient accepted/booked, link to new appointment
    `booked_appointment_id` INT         DEFAULT NULL,

    `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at`           DATETIME     DEFAULT NULL,
    `updated_at`           DATETIME     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `IDX_FOLLOWUP_DOCTOR` (`doctor_user_id`),
    INDEX `IDX_FOLLOWUP_PATIENT` (`patient_user_id`),
    INDEX `IDX_FOLLOWUP_STATUS` (`status`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `follow_up_recommendation` DROP FOREIGN KEY IF EXISTS `FK_FOLLOWUP_APPT`;
ALTER TABLE `follow_up_recommendation` ADD CONSTRAINT `FK_FOLLOWUP_APPT`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`) ON DELETE CASCADE;

ALTER TABLE `follow_up_recommendation` DROP FOREIGN KEY IF EXISTS `FK_FOLLOWUP_DOCTOR`;
ALTER TABLE `follow_up_recommendation` ADD CONSTRAINT `FK_FOLLOWUP_DOCTOR`
    FOREIGN KEY (`doctor_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `follow_up_recommendation` DROP FOREIGN KEY IF EXISTS `FK_FOLLOWUP_PATIENT`;
ALTER TABLE `follow_up_recommendation` ADD CONSTRAINT `FK_FOLLOWUP_PATIENT`
    FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `follow_up_recommendation` DROP FOREIGN KEY IF EXISTS `FK_FOLLOWUP_BOOKED`;
ALTER TABLE `follow_up_recommendation` ADD CONSTRAINT `FK_FOLLOWUP_BOOKED`
    FOREIGN KEY (`booked_appointment_id`) REFERENCES `appointment` (`id`) ON DELETE SET NULL;

ALTER TABLE `follow_up_recommendation` DROP CONSTRAINT IF EXISTS `CHK_FOLLOWUP_TYPE`;
ALTER TABLE `follow_up_recommendation` ADD CONSTRAINT `CHK_FOLLOWUP_TYPE`
    CHECK (`type` IN ('none','exact','period'));

ALTER TABLE `follow_up_recommendation` DROP CONSTRAINT IF EXISTS `CHK_FOLLOWUP_PRIORITY`;
ALTER TABLE `follow_up_recommendation` ADD CONSTRAINT `CHK_FOLLOWUP_PRIORITY`
    CHECK (`priority` IN ('routine','recommended','urgent'));

ALTER TABLE `follow_up_recommendation` DROP CONSTRAINT IF EXISTS `CHK_FOLLOWUP_STATUS`;
ALTER TABLE `follow_up_recommendation` ADD CONSTRAINT `CHK_FOLLOWUP_STATUS`
    CHECK (`status` IN ('pending','accepted','booked','cancelled','expired'));
