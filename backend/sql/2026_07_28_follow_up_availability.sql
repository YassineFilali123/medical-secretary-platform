-- =============================================================================
-- MedSecretary -- Follow-up availability slots
-- Stores specific date + time slots the doctor is available for follow-up
-- appointments within a recommended period.
--
-- HOW TO RUN:
--     Get-Content "...sql" | C:\xampp\mysql\bin\mysql.exe -u root medisecretary
-- =============================================================================

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `follow_up_availability_slot` (
    `id`                       INT          NOT NULL AUTO_INCREMENT,
    `follow_up_recommendation_id` INT       NOT NULL,
    `available_date`           DATE         NOT NULL,
    `start_time`               TIME         NOT NULL,
    `end_time`                 TIME         NOT NULL,
    `is_recurring`             TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at`                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `IDX_FUAVAIL_FOLLOWUP` (`follow_up_recommendation_id`),
    INDEX `IDX_FUAVAIL_DATE` (`available_date`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `follow_up_availability_slot` DROP FOREIGN KEY IF EXISTS `FK_FUAVAIL_FOLLOWUP`;
ALTER TABLE `follow_up_availability_slot` ADD CONSTRAINT `FK_FUAVAIL_FOLLOWUP`
    FOREIGN KEY (`follow_up_recommendation_id`) REFERENCES `follow_up_recommendation` (`id`) ON DELETE CASCADE;
