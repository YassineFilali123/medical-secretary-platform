-- =============================================================================
-- MedSecretary -- Document requests and patient documents
-- Target server : MariaDB 10.4.32 (XAMPP)
-- Database      : medisecretary  (utf8mb4 / utf8mb4_unicode_ci / InnoDB)
--
-- HOW TO RUN:
--     Get-Content "...sql" | C:\xampp\mysql\bin\mysql.exe -u root medisecretary
--
-- WHAT THIS SCRIPT PRODUCES
--   TABLES  document_request (new)  patient_document (new)
--
-- RE-RUNNABLE. Every statement is idempotent.
-- =============================================================================

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION';


-- =============================================================================
-- 1. document_request
--
--    Patient requests an official medical document. The secretary reviews,
--    uploads the file, and sends it to the patient.
--
--    Status flow: pending -> approved -> uploaded -> completed
--                 pending -> rejected
-- =============================================================================

CREATE TABLE IF NOT EXISTS `document_request` (
    `id`                   INT          NOT NULL AUTO_INCREMENT,
    `patient_user_id`      INT          NOT NULL,
    `document_type`        VARCHAR(50)  NOT NULL,
    `note`                 TEXT         DEFAULT NULL,

    -- Status: pending, approved, uploaded, completed, rejected
    `status`               VARCHAR(20)  NOT NULL DEFAULT 'pending',
    `rejection_reason`     TEXT         DEFAULT NULL,
    `secretary_message`    TEXT         DEFAULT NULL,

    -- Secretary who processed it
    `processed_by_user_id` INT          DEFAULT NULL,
    `processed_at`         DATETIME     DEFAULT NULL,

    `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           DATETIME     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `IDX_DOCREQ_PATIENT` (`patient_user_id`),
    INDEX `IDX_DOCREQ_STATUS` (`status`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `document_request` DROP FOREIGN KEY IF EXISTS `FK_DOCREQ_PATIENT`;
ALTER TABLE `document_request` ADD CONSTRAINT `FK_DOCREQ_PATIENT`
    FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `document_request` DROP FOREIGN KEY IF EXISTS `FK_DOCREQ_SECRETARY`;
ALTER TABLE `document_request` ADD CONSTRAINT `FK_DOCREQ_SECRETARY`
    FOREIGN KEY (`processed_by_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

ALTER TABLE `document_request` DROP CONSTRAINT IF EXISTS `CHK_DOCREQ_STATUS`;
ALTER TABLE `document_request` ADD CONSTRAINT `CHK_DOCREQ_STATUS`
    CHECK (`status` IN ('pending','approved','uploaded','completed','rejected'));


-- =============================================================================
-- 2. patient_document
--
--    The actual uploaded document linked to a request.
--    One document per request.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `patient_document` (
    `id`                   INT          NOT NULL AUTO_INCREMENT,
    `document_request_id`  INT          NOT NULL,
    `patient_user_id`      INT          NOT NULL,
    `uploaded_by_user_id`  INT          DEFAULT NULL,

    `file_name`            VARCHAR(255) NOT NULL,
    `file_path`            VARCHAR(500) NOT NULL,
    `file_size`            INT          DEFAULT NULL,
    `mime_type`            VARCHAR(100) DEFAULT NULL,

    `download_count`       INT          NOT NULL DEFAULT 0,
    `last_downloaded_at`   DATETIME     DEFAULT NULL,

    `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `UNQ_DOC_REQUEST` (`document_request_id`),
    INDEX `IDX_PATDOC_PATIENT` (`patient_user_id`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `patient_document` DROP FOREIGN KEY IF EXISTS `FK_PATDOC_REQUEST`;
ALTER TABLE `patient_document` ADD CONSTRAINT `FK_PATDOC_REQUEST`
    FOREIGN KEY (`document_request_id`) REFERENCES `document_request` (`id`) ON DELETE CASCADE;

ALTER TABLE `patient_document` DROP FOREIGN KEY IF EXISTS `FK_PATDOC_PATIENT`;
ALTER TABLE `patient_document` ADD CONSTRAINT `FK_PATDOC_PATIENT`
    FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

ALTER TABLE `patient_document` DROP FOREIGN KEY IF EXISTS `FK_PATDOC_UPLOADER`;
ALTER TABLE `patient_document` ADD CONSTRAINT `FK_PATDOC_UPLOADER`
    FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;
