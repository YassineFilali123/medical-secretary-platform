-- =============================================================================
-- Doctor availability
--
--   doctor_availability : the recurring weekly schedule (one row per weekday)
--   doctor_time_off     : dated absences that override the weekly schedule
--
-- Bookable slots are DERIVED from these two tables at request time rather than
-- stored, so changing a working day instantly changes every future slot.
--
-- Target: MariaDB 10.4.32
-- Run:  mysql -u root medisecretary < 2026_07_26_doctor_availability.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Weekly recurring schedule
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctor_availability` (
    `id`               INT AUTO_INCREMENT NOT NULL,
    `doctor_user_id`   INT        NOT NULL,
    -- 0 = Sunday .. 6 = Saturday, matching JavaScript's Date.getDay().
    `day_of_week`      TINYINT    NOT NULL,
    `is_enabled`       TINYINT(1) NOT NULL DEFAULT 0,
    `start_time`       TIME       NOT NULL DEFAULT '09:00:00',
    `end_time`         TIME       NOT NULL DEFAULT '17:00:00',
    `slot_minutes`     SMALLINT   NOT NULL DEFAULT 30,
    `created_at`       DATETIME   NOT NULL,
    `updated_at`       DATETIME   DEFAULT NULL,
    PRIMARY KEY (`id`),
    -- One row per doctor per weekday; the app upserts against this.
    UNIQUE INDEX `UNIQ_AVAIL_DOCTOR_DAY` (`doctor_user_id`, `day_of_week`),
    CONSTRAINT `CHK_AVAIL_DAY`   CHECK (`day_of_week` BETWEEN 0 AND 6),
    CONSTRAINT `CHK_AVAIL_ORDER` CHECK (`end_time` > `start_time`),
    CONSTRAINT `CHK_AVAIL_SLOT`  CHECK (`slot_minutes` IN (10, 15, 20, 30, 45, 60, 90)),
    CONSTRAINT `FK_AVAIL_DOCTOR`
        FOREIGN KEY (`doctor_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 2. Time off — an inclusive date range that blocks the weekly schedule
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctor_time_off` (
    `id`             INT AUTO_INCREMENT NOT NULL,
    `doctor_user_id` INT          NOT NULL,
    `start_date`     DATE         NOT NULL,
    `end_date`       DATE         NOT NULL,
    `reason`         VARCHAR(160) DEFAULT NULL,
    `created_at`     DATETIME     NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `IDX_TIMEOFF_DOCTOR_RANGE` (`doctor_user_id`, `start_date`, `end_date`),
    -- A single day off is start_date = end_date, so >= not >.
    CONSTRAINT `CHK_TIMEOFF_ORDER` CHECK (`end_date` >= `start_date`),
    CONSTRAINT `FK_TIMEOFF_DOCTOR`
        FOREIGN KEY (`doctor_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 3. Seed a default Mon-Fri 09:00-17:00 week for every existing doctor
--    so the page is not empty on first open. Re-running is a no-op.
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `doctor_availability`
    (`doctor_user_id`, `day_of_week`, `is_enabled`, `start_time`, `end_time`, `slot_minutes`, `created_at`)
SELECT u.`id`, d.`day`,
       CASE WHEN d.`day` BETWEEN 1 AND 5 THEN 1 ELSE 0 END,
       '09:00:00', '17:00:00', 30, NOW()
  FROM `user` u
  JOIN (
      SELECT 0 AS `day` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
      UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  ) d
 WHERE u.`roles` LIKE '%ROLE_DOCTOR%';


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS `doctor_time_off`;
-- DROP TABLE IF EXISTS `doctor_availability`;
