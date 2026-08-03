-- =============================================================================
-- MedSecretary -- Add document_type to patient_document
--
-- Auto-generated consultation reports have document_request_id = NULL,
-- so the document_type can't come from the request table. We store it
-- directly on the document record.
--
-- HOW TO RUN:
--     Get-Content "...sql" | C:\xampp\mysql\bin\mysql.exe -u root medisecretary
--
-- RE-RUNNABLE. Every statement is idempotent.
-- =============================================================================

SET NAMES utf8mb4;

-- Add document_type column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'patient_document'
                     AND COLUMN_NAME = 'document_type');
SET @sql_add = IF(@col_exists = 0,
    'ALTER TABLE `patient_document` ADD COLUMN `document_type` VARCHAR(50) DEFAULT NULL AFTER `uploaded_by_user_id`',
    'SELECT 1');
PREPARE add_col FROM @sql_add;
EXECUTE add_col;
DEALLOCATE PREPARE add_col;

-- Backfill existing rows from their document_request
UPDATE patient_document d
  JOIN document_request r ON r.id = d.document_request_id
   SET d.document_type = r.document_type
 WHERE d.document_type IS NULL;
