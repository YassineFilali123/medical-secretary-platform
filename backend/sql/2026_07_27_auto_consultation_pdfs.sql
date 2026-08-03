-- =============================================================================
-- MedSecretary -- Support auto-generated consultation report PDFs
-- Target server : MariaDB 10.4.32 (XAMPP)
-- Database      : medisecretary  (utf8mb4 / utf8mb4_unicode_ci / InnoDB)
--
-- WHAT THIS SCRIPT DOES:
--   1. Makes patient_document.document_request_id nullable
--      (auto-generated reports don't come from a patient request)
--   2. Drops the UNIQUE KEY on document_request_id (multiple docs can be null)
--   3. Adds a regular index instead to keep queries fast
--
-- HOW TO RUN:
--     Get-Content "...sql" | C:\xampp\mysql\bin\mysql.exe -u root medisecretary
--
-- RE-RUNNABLE. Every statement is idempotent.
-- =============================================================================

SET NAMES utf8mb4;

-- 1. Make document_request_id nullable
ALTER TABLE `patient_document` MODIFY `document_request_id` INT DEFAULT NULL;

-- 2. Drop FK first (it references document_request.id via the unique index)
ALTER TABLE `patient_document` DROP FOREIGN KEY IF EXISTS `FK_PATDOC_REQUEST`;

-- 3. Drop UNIQUE index
SET @idx_name = (SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'patient_document'
                   AND CONSTRAINT_NAME = 'UNQ_DOC_REQUEST'
                 LIMIT 1);
SET @sql_drop = IF(@idx_name IS NOT NULL,
    'ALTER TABLE `patient_document` DROP INDEX `UNQ_DOC_REQUEST`',
    'SELECT 1');
PREPARE drop_idx FROM @sql_drop;
EXECUTE drop_idx;
DEALLOCATE PREPARE drop_idx;

-- 4. Add a regular (non-unique) index for performance
ALTER TABLE `patient_document` ADD INDEX `IDX_PATDOC_REQUEST` (`document_request_id`);

-- 5. Re-add FK constraint
ALTER TABLE `patient_document` ADD CONSTRAINT `FK_PATDOC_REQUEST`
    FOREIGN KEY (`document_request_id`) REFERENCES `document_request` (`id`) ON DELETE SET NULL;
