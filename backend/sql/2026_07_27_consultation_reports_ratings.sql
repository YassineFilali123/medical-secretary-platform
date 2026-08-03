-- =============================================================================
-- MedSecretary -- Consultation reports and doctor ratings
-- Target server : MariaDB 10.4.32 (XAMPP)
-- Database      : medisecretary  (utf8mb4 / utf8mb4_unicode_ci / InnoDB)
--
-- HOW TO RUN:
--     Get-Content "...sql" | C:\xampp\mysql\bin\mysql.exe -u root medisecretary
--
-- WHAT THIS SCRIPT PRODUCES
--   TABLES  consultation_report (new)  doctor_rating (new)
--
-- RE-RUNNABLE. Every statement is idempotent.
-- =============================================================================

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION';


-- =============================================================================
-- 1. consultation_report
--
--    Structured report the doctor fills in at the end of a consultation.
--    One report per completed appointment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `consultation_report` (
    `id`                           INT          NOT NULL AUTO_INCREMENT,
    `appointment_id`               INT          NOT NULL,
    `doctor_user_id`               INT          NOT NULL,
    `patient_user_id`              INT          NOT NULL,

    `diagnosis`                    TEXT         DEFAULT NULL,
    `notes`                        TEXT         DEFAULT NULL,
    `prescription`                 TEXT         DEFAULT NULL,
    `recommended_examinations`     TEXT         DEFAULT NULL,
    `follow_up_instructions`       TEXT         DEFAULT NULL,

    `next_appointment_recommended` TINYINT(1)   NOT NULL DEFAULT 0,
    `next_appointment_reason`      VARCHAR(255) DEFAULT NULL,

    `created_at`                   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                   DATETIME     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `UNQ_REPORT_APPOINTMENT` (`appointment_id`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `consultation_report` DROP FOREIGN KEY IF EXISTS `FK_REPORT_APPOINTMENT`;
ALTER TABLE `consultation_report` ADD CONSTRAINT `FK_REPORT_APPOINTMENT`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`) ON DELETE CASCADE;

ALTER TABLE `consultation_report` DROP FOREIGN KEY IF EXISTS `FK_REPORT_DOCTOR`;
ALTER TABLE `consultation_report` ADD CONSTRAINT `FK_REPORT_DOCTOR`
    FOREIGN KEY (`doctor_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `consultation_report` DROP FOREIGN KEY IF EXISTS `FK_REPORT_PATIENT`;
ALTER TABLE `consultation_report` ADD CONSTRAINT `FK_REPORT_PATIENT`
    FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `consultation_report`
    ADD INDEX IF NOT EXISTS `IDX_REPORT_DOCTOR` (`doctor_user_id`),
    ADD INDEX IF NOT EXISTS `IDX_REPORT_PATIENT` (`patient_user_id`);


-- =============================================================================
-- 2. doctor_rating
--
--    Patient rates the doctor after a completed consultation.
--    One rating per appointment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `doctor_rating` (
    `id`                INT          NOT NULL AUTO_INCREMENT,
    `appointment_id`    INT          NOT NULL,
    `doctor_user_id`    INT          NOT NULL,
    `patient_user_id`   INT          NOT NULL,

    `rating`            TINYINT      NOT NULL,
    `review`            TEXT         DEFAULT NULL,

    `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `UNQ_RATING_APPOINTMENT` (`appointment_id`),
    CONSTRAINT `CHK_RATING_RANGE` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `doctor_rating` DROP FOREIGN KEY IF EXISTS `FK_RATING_APPOINTMENT`;
ALTER TABLE `doctor_rating` ADD CONSTRAINT `FK_RATING_APPOINTMENT`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`) ON DELETE CASCADE;

ALTER TABLE `doctor_rating` DROP FOREIGN KEY IF EXISTS `FK_RATING_DOCTOR`;
ALTER TABLE `doctor_rating` ADD CONSTRAINT `FK_RATING_DOCTOR`
    FOREIGN KEY (`doctor_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `doctor_rating` DROP FOREIGN KEY IF EXISTS `FK_RATING_PATIENT`;
ALTER TABLE `doctor_rating` ADD CONSTRAINT `FK_RATING_PATIENT`
    FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `doctor_rating`
    ADD INDEX IF NOT EXISTS `IDX_RATING_DOCTOR` (`doctor_user_id`),
    ADD INDEX IF NOT EXISTS `IDX_RATING_PATIENT` (`patient_user_id`);
