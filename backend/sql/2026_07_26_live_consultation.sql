-- =============================================================================
-- Live consultation & schedule adjustment
--
-- A doctor running over time is the normal case, not the exception. This adds:
--
--   appointment.*            an in-progress state and the timing columns that
--                            record how far a consultation ran over
--   schedule_adjustment_request  the doctor's ask, and what was decided
--   appointment_delay_history    every time shifted, and by whom — the audit trail
--   notification             what each party was told, and when they read it
--
-- Target: MariaDB 10.4.32
-- Run:  mysql -u root medisecretary < 2026_07_26_live_consultation.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Teach `appointment` about consultations that are under way
--
-- `in_progress` MUST join the active-slot set. If it did not, starting a
-- consultation would null out active_slot, free the slot in the unique index,
-- and let a second patient book the room the doctor is currently sitting in.
--
-- active_slot is indexed, so MariaDB will not let us redefine it in place —
-- the unique keys come off first and go back on afterwards.
-- -----------------------------------------------------------------------------
ALTER TABLE `appointment`
    DROP INDEX `UNIQ_APPT_DOCTOR_SLOT`,
    DROP INDEX `UNIQ_APPT_PATIENT_SLOT`;

ALTER TABLE `appointment`
    MODIFY COLUMN `active_slot` TINYINT(1) AS (
        CASE WHEN `status` IN ('pending', 'confirmed', 'in_progress', 'completed')
             THEN 1 ELSE NULL END
    ) PERSISTENT;

ALTER TABLE `appointment`
    ADD UNIQUE INDEX `UNIQ_APPT_DOCTOR_SLOT`  (`doctor_user_id`,  `appointment_date`, `start_time`, `active_slot`),
    ADD UNIQUE INDEX `UNIQ_APPT_PATIENT_SLOT` (`patient_user_id`, `appointment_date`, `start_time`, `active_slot`);

ALTER TABLE `appointment`
    DROP CONSTRAINT `CHK_APPT_STATUS`;

ALTER TABLE `appointment`
    ADD CONSTRAINT `CHK_APPT_STATUS`
        CHECK (`status` IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'));

ALTER TABLE `appointment`
    -- When the doctor actually walked in, as opposed to when it was scheduled.
    ADD COLUMN IF NOT EXISTS `started_at`        DATETIME  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `ended_at`          DATETIME  DEFAULT NULL,
    -- The end time first agreed with the patient. Captured on the FIRST
    -- extension only, so "ran 25 minutes over" survives repeated extensions.
    ADD COLUMN IF NOT EXISTS `original_end_time` TIME      DEFAULT NULL,
    -- Minutes this consultation gained.
    ADD COLUMN IF NOT EXISTS `extended_minutes`  SMALLINT  NOT NULL DEFAULT 0,
    -- Minutes this appointment was pushed back by somebody else's overrun.
    -- Non-zero is what "marked as delayed" means to the patient.
    ADD COLUMN IF NOT EXISTS `delayed_minutes`   SMALLINT  NOT NULL DEFAULT 0;

-- One live consultation per doctor. A NULL started_at does not participate in a
-- unique index, so only rows actually in progress are constrained.
ALTER TABLE `appointment`
    ADD COLUMN IF NOT EXISTS `live_lock` TINYINT(1) AS (
        CASE WHEN `status` = 'in_progress' THEN 1 ELSE NULL END
    ) PERSISTENT;

ALTER TABLE `appointment`
    ADD UNIQUE INDEX `UNIQ_APPT_ONE_LIVE` (`doctor_user_id`, `live_lock`);


-- -----------------------------------------------------------------------------
-- 2. The doctor's request for more time, and its outcome
--
-- Rows are written for auto-approved requests too. "The system decided this
-- without asking anyone" is exactly the kind of thing an audit needs to show.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schedule_adjustment_request` (
    `id`                  INT AUTO_INCREMENT NOT NULL,
    `appointment_id`      INT          NOT NULL,
    `doctor_user_id`      INT          NOT NULL,
    `patient_user_id`     INT          NOT NULL,

    `requested_minutes`   SMALLINT     NOT NULL,
    -- What was actually applied. Differs from requested when a secretary
    -- approves a shorter extension than the doctor asked for.
    `granted_minutes`     SMALLINT     DEFAULT NULL,

    `reason_category`     VARCHAR(30)  NOT NULL DEFAULT 'other',
    `reason`              VARCHAR(500) DEFAULT NULL,
    `is_emergency`        TINYINT(1)   NOT NULL DEFAULT 0,

    --   auto_approved : fit in free time, nobody had to be asked
    --   pending       : waiting on the secretary
    --   approved      : secretary said yes
    --   rejected      : secretary said no
    --   cancelled     : consultation ended before anyone decided
    `status`              VARCHAR(20)  NOT NULL DEFAULT 'pending',
    -- Which branch of the decision produced this: no_next / free_gap / conflict
    `decision_basis`      VARCHAR(20)  NOT NULL,
    -- How many appointments would move. Snapshotted at request time so the
    -- record still reads correctly after the schedule has changed.
    `affected_count`      SMALLINT     NOT NULL DEFAULT 0,

    `decided_by_user_id`  INT          DEFAULT NULL,
    `decided_at`          DATETIME     DEFAULT NULL,
    `decision_note`       VARCHAR(500) DEFAULT NULL,

    `created_at`          DATETIME     NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `IDX_ADJ_STATUS`  (`status`, `created_at`),
    INDEX `IDX_ADJ_DOCTOR`  (`doctor_user_id`, `created_at`),
    INDEX `IDX_ADJ_APPT`    (`appointment_id`),

    CONSTRAINT `CHK_ADJ_STATUS`
        CHECK (`status` IN ('auto_approved', 'pending', 'approved', 'rejected', 'cancelled')),
    CONSTRAINT `CHK_ADJ_BASIS`
        CHECK (`decision_basis` IN ('no_next', 'free_gap', 'conflict')),
    CONSTRAINT `CHK_ADJ_MINUTES`
        CHECK (`requested_minutes` > 0 AND `requested_minutes` <= 240),

    CONSTRAINT `FK_ADJ_APPOINTMENT`
        FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_ADJ_DOCTOR`
        FOREIGN KEY (`doctor_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_ADJ_PATIENT`
        FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 3. Audit trail — one row per appointment actually moved
--
-- Before AND after are both stored. Without the "before", an audit can tell you
-- that something changed but not what it changed from, which is the only
-- question anyone asks afterwards.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointment_delay_history` (
    `id`                  INT AUTO_INCREMENT NOT NULL,
    `appointment_id`      INT          NOT NULL,
    -- Null for the consultation that was extended: it caused the shift rather
    -- than being shifted, and an auto-approval has no request to point at.
    `adjustment_request_id` INT        DEFAULT NULL,

    `previous_date`       DATE         NOT NULL,
    `previous_start_time` TIME         NOT NULL,
    `previous_end_time`   TIME         NOT NULL,
    `new_date`            DATE         NOT NULL,
    `new_start_time`      TIME         NOT NULL,
    `new_end_time`        TIME         NOT NULL,

    `delay_minutes`       SMALLINT     NOT NULL,
    --   extension : this is the consultation that ran long
    --   cascade   : pushed back to make room for one that did
    `change_type`         VARCHAR(20)  NOT NULL DEFAULT 'cascade',
    `changed_by_user_id`  INT          NOT NULL,
    `created_at`          DATETIME     NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `IDX_DELAY_APPT`    (`appointment_id`, `created_at`),
    INDEX `IDX_DELAY_REQUEST` (`adjustment_request_id`),

    CONSTRAINT `CHK_DELAY_TYPE` CHECK (`change_type` IN ('extension', 'cascade')),

    CONSTRAINT `FK_DELAY_APPOINTMENT`
        FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`) ON DELETE CASCADE,
    -- History outlives the request it came from only if the request survives;
    -- SET NULL would leave orphan rows that cannot be explained.
    CONSTRAINT `FK_DELAY_REQUEST`
        FOREIGN KEY (`adjustment_request_id`) REFERENCES `schedule_adjustment_request` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_DELAY_ACTOR`
        FOREIGN KEY (`changed_by_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 4. Notifications
--
-- Stored, not pushed. Persisting them first means a delivery mechanism can be
-- swapped (polling today, WebSocket later) without the sender changing, and a
-- recipient who was offline still sees what happened.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification` (
    `id`           INT AUTO_INCREMENT NOT NULL,
    `user_id`      INT          NOT NULL,
    `type`         VARCHAR(40)  NOT NULL,
    `title`        VARCHAR(160) NOT NULL,
    `body`         VARCHAR(500) DEFAULT NULL,
    -- What this is about, so the UI can link straight to it.
    `related_type` VARCHAR(40)  DEFAULT NULL,
    `related_id`   INT          DEFAULT NULL,
    `is_urgent`    TINYINT(1)   NOT NULL DEFAULT 0,
    `is_read`      TINYINT(1)   NOT NULL DEFAULT 0,
    `read_at`      DATETIME     DEFAULT NULL,
    `created_at`   DATETIME     NOT NULL,

    PRIMARY KEY (`id`),
    -- Serves both the unread badge and the newest-first list.
    INDEX `IDX_NOTIF_USER` (`user_id`, `is_read`, `id`),

    CONSTRAINT `FK_NOTIF_USER`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS `notification`;
-- DROP TABLE IF EXISTS `appointment_delay_history`;
-- DROP TABLE IF EXISTS `schedule_adjustment_request`;
-- ALTER TABLE `appointment`
--     DROP INDEX `UNIQ_APPT_ONE_LIVE`,
--     DROP COLUMN `live_lock`,
--     DROP COLUMN `delayed_minutes`,
--     DROP COLUMN `extended_minutes`,
--     DROP COLUMN `original_end_time`,
--     DROP COLUMN `ended_at`,
--     DROP COLUMN `started_at`;
