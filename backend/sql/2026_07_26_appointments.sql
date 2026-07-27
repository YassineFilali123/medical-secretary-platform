-- =============================================================================
-- Appointments
--
-- One table. A booking is (patient, doctor, date, start_time) plus a status
-- that moves through a fixed lifecycle:
--
--     pending ──confirm──> confirmed ──complete──> completed
--        │                     │
--        ├──reject──> rejected │
--        └──────── cancel ─────┴──> cancelled
--
-- The hard part is preventing two patients from taking the same slot. The app
-- checks availability before inserting, but two requests can pass that check
-- concurrently and both insert. `active_slot` + the unique index below make the
-- database itself refuse the second one, so the race cannot be lost.
--
-- Target: MariaDB 10.4.32
-- Run:  mysql -u root medisecretary < 2026_07_26_appointments.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `appointment` (
    `id`                 INT AUTO_INCREMENT NOT NULL,
    `patient_user_id`    INT          NOT NULL,
    `doctor_user_id`     INT          NOT NULL,

    `appointment_date`   DATE         NOT NULL,
    `start_time`         TIME         NOT NULL,
    `end_time`           TIME         NOT NULL,
    -- Denormalised from (end_time - start_time) so the length a patient agreed
    -- to is preserved even if the doctor later changes their slot length.
    `duration_minutes`   SMALLINT     NOT NULL,

    `status`             VARCHAR(20)  NOT NULL DEFAULT 'pending',
    `type`               VARCHAR(20)  NOT NULL DEFAULT 'consultation',

    -- Written by whoever books. Visible to the patient, the doctor and staff.
    `reason`             VARCHAR(500) NOT NULL,
    -- Clinical notes. Staff-only: never returned to a patient.
    `notes`              TEXT         DEFAULT NULL,
    -- Why it was cancelled or rejected. Shown to everyone on the appointment.
    `decision_reason`    VARCHAR(255) DEFAULT NULL,

    -- A patient booking for themselves, or the secretary/admin who did it.
    `created_by_user_id` INT          NOT NULL,

    `created_at`         DATETIME     NOT NULL,
    `updated_at`         DATETIME     DEFAULT NULL,

    -- 1 while the appointment still occupies its slot, NULL once it does not.
    -- MariaDB's unique indexes ignore NULLs, so any number of cancelled or
    -- rejected rows can share a slot while at most one live row holds it.
    `active_slot`        TINYINT(1) AS (
        CASE WHEN `status` IN ('pending', 'confirmed', 'completed') THEN 1 ELSE NULL END
    ) PERSISTENT,

    PRIMARY KEY (`id`),

    -- The double-booking guard. Last line of defence behind the app's own
    -- availability check, and the only one that holds under concurrency.
    UNIQUE INDEX `UNIQ_APPT_DOCTOR_SLOT`  (`doctor_user_id`,  `appointment_date`, `start_time`, `active_slot`),
    -- A patient cannot be in two consulting rooms at once. (Exact-start clashes
    -- only; the controller additionally rejects partial overlaps.)
    UNIQUE INDEX `UNIQ_APPT_PATIENT_SLOT` (`patient_user_id`, `appointment_date`, `start_time`, `active_slot`),

    -- Covers the list queries, which always filter by one party plus a date range.
    INDEX `IDX_APPT_DOCTOR_DATE`  (`doctor_user_id`,  `appointment_date`),
    INDEX `IDX_APPT_PATIENT_DATE` (`patient_user_id`, `appointment_date`),
    INDEX `IDX_APPT_STATUS_DATE`  (`status`, `appointment_date`),

    CONSTRAINT `CHK_APPT_STATUS`
        CHECK (`status` IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
    CONSTRAINT `CHK_APPT_TYPE`
        CHECK (`type` IN ('consultation', 'follow-up', 'checkup', 'emergency')),
    CONSTRAINT `CHK_APPT_ORDER`
        CHECK (`end_time` > `start_time`),
    CONSTRAINT `CHK_APPT_DURATION`
        CHECK (`duration_minutes` > 0),
    -- Self-appointments would let a doctor block their own calendar as a patient.
    CONSTRAINT `CHK_APPT_PARTIES`
        CHECK (`patient_user_id` <> `doctor_user_id`),

    CONSTRAINT `FK_APPT_PATIENT`
        FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_APPT_DOCTOR`
        FOREIGN KEY (`doctor_user_id`)  REFERENCES `user` (`id`) ON DELETE CASCADE,
    -- The booking outlives the staff account that created it, so RESTRICT/CASCADE
    -- would both be wrong here; keep the row and forget who booked it.
    CONSTRAINT `FK_APPT_CREATED_BY`
        FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS `appointment`;
