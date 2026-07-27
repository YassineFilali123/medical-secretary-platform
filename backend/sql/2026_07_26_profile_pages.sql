-- =============================================================================
-- MedSecretary -- Profile pages, settings and lookups
-- Target server : MariaDB 10.4.32 (XAMPP)   -- verified on this exact version
-- Database      : medisecretary  (utf8mb4 / utf8mb4_unicode_ci / InnoDB)
--
-- HOW TO RUN (XAMPP mysql client, from a normal cmd / PowerShell prompt):
--
--     C:\xampp\mysql\bin\mysql.exe -u root medisecretary < "c:\project\medical-secretary-platform\medical-secretary-platform\backend\sql\2026_07_26_profile_pages.sql"
--
--   ...or, if the root account has a password:
--
--     C:\xampp\mysql\bin\mysql.exe -u root -p medisecretary < "...\2026_07_26_profile_pages.sql"
--
--   ...or paste it into phpMyAdmin -> medisecretary -> SQL.
--
-- BACK UP FIRST. Section 3 rebuilds the primary key of `user_profile`:
--     C:\xampp\mysql\bin\mysqldump.exe -u root medisecretary > medisecretary_backup.sql
--
-- WHAT THIS SCRIPT PRODUCES
--   TABLES  user (altered)  user_profile (altered)  user_setting (new)
--           ref_specialty (new)  ref_department (new)
--   VIEWS   v_user_profile  v_user_setting  v_profile_stats
--
-- RE-RUNNABLE. Every statement is idempotent, and NO statement deletes or
-- blanks a value a user typed. Running it a second time is a no-op.
--
-- IMPORTANT CONTEXT: the earlier migration (Version20260726000002.php /
-- 2026_07_26_profile_and_password.sql) is ALREADY APPLIED to this database, so
-- `user`, `user_profile` and `v_user_profile` already exist. This script
-- upgrades them in place. It supersedes that file; do not run the old one again
-- (it is not re-runnable -- it uses bare CREATE TABLE and bare ADD CONSTRAINT).
-- Section 0 records both migrations as executed so the Doctrine chain and this
-- file cannot fight over the same schema.
--
-- -----------------------------------------------------------------------------
-- THE MARIADB 10.4 FACTS THIS SCRIPT IS BUILT AROUND (all tested, not assumed)
--
--   1. `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS ... FOREIGN KEY` is a
--      SYNTAX ERROR (1064) on 10.4. IF NOT EXISTS works for ADD COLUMN and
--      ADD INDEX but NOT for ADD CONSTRAINT. So every foreign key and every
--      CHECK below is made re-runnable with the drop-then-add pattern:
--          ALTER TABLE t DROP FOREIGN KEY IF EXISTS fk;   -- IF EXISTS *is* valid
--          ALTER TABLE t ADD CONSTRAINT fk FOREIGN KEY ...;
--
--   2. CHECK constraints are CASE-BLIND under utf8mb4_unicode_ci. Proven:
--      with CHECK (gender IN ('male',...)) on a unicode_ci column,
--      `UPDATE ... SET gender='Male'` SUCCEEDS and stores "Male" verbatim --
--      which then breaks every === comparison in PHP and TypeScript.
--      The same statement fails with ERROR 4025 once the column is
--      COLLATE utf8mb4_bin. So the columns that really are a closed vocabulary
--      -- `user.status`, `gender`, `blood_type`, `language`, `theme` -- are
--      declared COLLATE utf8mb4_bin. That one keyword is what makes their
--      CHECK constraints actually mean something.
--
--      `specialty` and `department` are NOT in that list: they are free text
--      (see section 2) and stay utf8mb4_unicode_ci so search and grouping stay
--      case-insensitive.
--
--   3. sql_mode on this server is NO_ZERO_IN_DATE,NO_ZERO_DATE,
--      NO_ENGINE_SUBSTITUTION -- i.e. NON-STRICT. A bad ENUM value would be
--      silently coerced to '' with only a warning. So: VARCHAR + CHECK
--      everywhere, never ENUM.
--
--   4. DDL AUTO-COMMITS. There is no transaction to roll back to if a statement
--      in the middle fails, and the mysql client stops at the first error. That
--      is why this script NEVER narrows a column: `specialty`/`department` stay
--      VARCHAR(120) and `blood_type` stays VARCHAR(5), exactly as the live table
--      already has them. A narrowing MODIFY under the STRICT mode set below is
--      ERROR 1406 "Data too long" on the first over-length row, and it would
--      abort the run in the middle of section 3 with the foreign keys already
--      dropped. Ordering + not-narrowing is the only protection available.
-- =============================================================================

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION';
-- ^ Strict for the duration of this script only, so a bad backfill value is a
--   loud error rather than a silently truncated row. Does not persist.


-- =============================================================================
-- 0. ONE SOURCE OF TRUTH FOR THE SCHEMA
--
--    backend/composer.json pulls in doctrine/doctrine-migrations-bundle and
--    backend/migrations/ holds Version20260725000001 (creates `user`) and
--    Version20260726000002 (creates the FIRST draft of user_profile). Both are
--    already applied to this database -- but they were applied by hand, so
--    `doctrine_migration_versions` does not exist and Doctrine believes NOTHING
--    has run. `php bin/console doctrine:migrations:migrate` would therefore
--    replay them and die on ERROR 1050 "Table 'user' already exists" /
--    ERROR 1060 "Duplicate column name 'status'".
--
--    From here on the .sql files in backend/sql/ ARE the schema. The block
--    below stamps the two historical migrations as executed so Doctrine leaves
--    them alone. It uses the standard doctrine-migrations 3.x table shape; if
--    the table already exists this is a no-op INSERT IGNORE.
--
--    STILL TO DO BY HAND IN PHP (cannot be done from SQL):
--      * backend/migrations/Version20260726000002.php is now HISTORICAL only.
--        Do not add new schema to it. Its down() drops `user_profile` while
--        v_user_setting and v_profile_stats still reference it, which would
--        leave two broken views -- add
--            DROP VIEW IF EXISTS `v_profile_stats`;
--            DROP VIEW IF EXISTS `v_user_setting`;
--        to that down() if you ever intend to run it.
--      * If you would rather keep Doctrine as the source of truth instead,
--        delete this section, delete backend/sql/*.sql, and port sections 1-6
--        into a new Version20260726000003.php as addSql() calls in the same
--        order.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `doctrine_migration_versions` (
    `version`        VARCHAR(191) NOT NULL,
    `executed_at`    DATETIME DEFAULT NULL,
    `execution_time` INT      DEFAULT NULL,
    PRIMARY KEY (`version`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `doctrine_migration_versions` (`version`, `executed_at`, `execution_time`) VALUES
    ('DoctrineMigrations\\Version20260725000001', NOW(), 0),
    ('DoctrineMigrations\\Version20260726000002', NOW(), 0);


-- =============================================================================
-- 1. `user` -- security / audit columns
--    These six columns are already present on the live DB; IF NOT EXISTS makes
--    this section a no-op there, and makes the script work on a fresh install.
-- =============================================================================

ALTER TABLE `user`
    ADD COLUMN IF NOT EXISTS `status`                    VARCHAR(20) NOT NULL DEFAULT 'active' AFTER `is_verified`,
    ADD COLUMN IF NOT EXISTS `password_changed_at`       DATETIME    DEFAULT NULL AFTER `password`,
    ADD COLUMN IF NOT EXISTS `password_reset_token`      VARCHAR(64) DEFAULT NULL AFTER `password_changed_at`,
    ADD COLUMN IF NOT EXISTS `password_reset_expires_at` DATETIME    DEFAULT NULL AFTER `password_reset_token`,
    ADD COLUMN IF NOT EXISTS `updated_at`                DATETIME    DEFAULT NULL AFTER `created_at`,
    ADD COLUMN IF NOT EXISTS `last_login_at`             DATETIME    DEFAULT NULL AFTER `updated_at`;

-- Lookup index for the forgot-password flow.
ALTER TABLE `user`
    ADD INDEX IF NOT EXISTS `IDX_USER_RESET_TOKEN` (`password_reset_token`);

-- ---------------------------------------------------------------------------
-- `user`.`status` -- the vocabulary is exactly what the ADMIN UI can produce.
--
--    src/types/admin.ts:6           status: "active" | "inactive"
--    src/models/index.ts:34,53,70,82  status: "active" | "inactive"
--    src/pages/admin/UserManagementPage.tsx:58-59  <option value="active">
--                                                  <option value="inactive">
--    ...plus the activate/deactivate toggle on line 106 and the badge logic in
--    admin/UserDetailsPage.tsx:57.
--
--    So the CHECK allows 'active' and 'inactive' and NOTHING ELSE. An earlier
--    draft of this file allowed ('active','suspended','pending','deleted') --
--    a vocabulary that appears nowhere in the app -- which meant the admin's
--    own deactivate button would have been rejected with ERROR 4025 the moment
--    UserManagementPage stops reading MOCK_USERS and calls the real API.
--    If you later want suspended/pending/deleted, add the <option> values and
--    widen the union type in src/types/admin.ts in the SAME commit as the CHECK.
--
--    PRE-FLIGHT: this returns every row the normalisation below would rewrite.
--    It returns 0 rows on the live DB (all 8 accounts are 'active').
--      SELECT id, email, status FROM `user`
--       WHERE LOWER(TRIM(status)) NOT IN ('active','inactive');
-- ---------------------------------------------------------------------------
UPDATE `user` SET `status` = LOWER(TRIM(`status`)) WHERE `status` IS NOT NULL;

-- Known synonyms map onto the two real states rather than being reset.
UPDATE `user` SET `status` = 'inactive'
 WHERE `status` IN ('suspended','pending','deleted','disabled','banned','locked','0','false','');
UPDATE `user` SET `status` = 'active'
 WHERE `status` IN ('enabled','1','true','ok');

-- Anything still unrecognised fails CLOSED. Resetting an unknown status to
-- 'active' would silently re-enable an account somebody deliberately disabled;
-- 'inactive' is visible in the admin list and is one click to undo.
UPDATE `user` SET `status` = 'inactive'
 WHERE `status` NOT IN ('active','inactive');

ALTER TABLE `user`
    MODIFY COLUMN `status` VARCHAR(20)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'active';

ALTER TABLE `user` DROP CONSTRAINT IF EXISTS `CHK_USER_STATUS`;
ALTER TABLE `user` ADD CONSTRAINT `CHK_USER_STATUS`
    CHECK (`status` IN ('active','inactive'));

-- Existing accounts: treat their creation date as the last password change,
-- so "password last changed" on the profile page is never blank.
UPDATE `user`
   SET `password_changed_at` = `created_at`
 WHERE `password_changed_at` IS NULL;


-- =============================================================================
-- 2. Lookup tables -- SUGGESTION LISTS, NOT CONSTRAINTS
--
--    `specialty` (doctor/ProfilePage.tsx:96) and `department`
--    (secretary/ProfilePage.tsx:74) are plain free-text <Input> boxes. The
--    value goes save(form) -> profileService.update -> ProfileController::
--    PROFILE_FIELDS ('specialty' => 'specialty') and is written verbatim:
--    validateProfileFields() has no branch for either column, so there is no
--    lower-casing, no underscoring and no membership test anywhere in PHP.
--
--    An earlier draft of this file put REAL foreign keys on those two columns.
--    That would have bricked both pages: a doctor typing "Cardiology" gets
--    errno 1452 on FK_PROFILE_SPECIALTY, PDO is in ERRMODE_EXCEPTION
--    (backend/api/Database.php:13), update() rethrows, index.php returns HTTP
--    500 -- and because the whole save is one transaction the doctor also
--    loses the bio, clinic name and phone edits in the same click. With the
--    binary collation it fired even for correctly spelled values, since only
--    the snake_case code 'cardiology' would have been accepted.
--
--    So: NO foreign keys, NO CHECK, and NOTHING in this script ever clears a
--    specialty or department that somebody typed. These two tables exist only
--    as (a) the seed list for a <select> if the inputs are ever upgraded, and
--    (b) the label/ordering source for v_profile_stats in section 6c, which
--    matches stored text against `code` case-insensitively and still counts
--    values that are not in the list.
--
--    `code` is utf8mb4_unicode_ci (the table default) on purpose -- section 6c
--    compares it against `user_profile`.`specialty`, and mixing utf8mb4_bin
--    with utf8mb4_unicode_ci in a JOIN predicate raises ERROR 1267
--    "Illegal mix of collations".
--
--    NO `is_active` column, on purpose. A soft-deleted lookup row is a trap:
--    the doctor's stored specialty stays pointing at it and the <select> no
--    longer offers it. Just delete the row -- nothing references it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `ref_specialty` (
    `code`       VARCHAR(120) NOT NULL,
    `label`      VARCHAR(120) NOT NULL,
    `sort_order` SMALLINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (`code`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ref_department` (
    `code`       VARCHAR(120) NOT NULL,
    `label`      VARCHAR(120) NOT NULL,
    `sort_order` SMALLINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (`code`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Force the target shape if an older draft of this file created these tables
-- with utf8mb4_bin `code` columns. Safe: nothing has a foreign key onto them.
ALTER TABLE `ref_specialty`
    MODIFY COLUMN `code`  VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `label` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `ref_department`
    MODIFY COLUMN `code`  VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `label` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Seeds. ON DUPLICATE KEY UPDATE makes re-running refresh labels/ordering
-- without ever creating a duplicate.
-- (VALUES(col) is correct here -- MySQL 8's `AS new` row-alias form does NOT
-- exist on MariaDB 10.4.)
INSERT INTO `ref_specialty` (`code`, `label`, `sort_order`) VALUES
    ('general_practice', 'General Practice', 10),
    ('family_medicine',  'Family Medicine',  20),
    ('cardiology',       'Cardiology',       30),
    ('dermatology',      'Dermatology',      40),
    ('neurology',        'Neurology',        50),
    ('oncology',         'Oncology',         60),
    ('ophthalmology',    'Ophthalmology',    70),
    ('orthopedics',      'Orthopedics',      80),
    ('pediatrics',       'Pediatrics',       90),
    ('gynecology',       'Gynecology',      100),
    ('psychiatry',       'Psychiatry',      110),
    ('radiology',        'Radiology',       120),
    ('anesthesiology',   'Anesthesiology',  130),
    ('urology',          'Urology',         140),
    ('ent',              'ENT',             150),
    ('other',            'Other',           999)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `sort_order` = VALUES(`sort_order`);

INSERT INTO `ref_department` (`code`, `label`, `sort_order`) VALUES
    ('front_desk',      'Front Desk',      10),
    ('reception',       'Reception',       20),
    ('billing',         'Billing',         30),
    ('medical_records', 'Medical Records', 40),
    ('triage',          'Triage',          50),
    ('nursing',         'Nursing',         60),
    ('pharmacy',        'Pharmacy',        70),
    ('administration',  'Administration',  80),
    ('other',           'Other',          999)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `sort_order` = VALUES(`sort_order`);

-- The lookups are also SEEDED FROM THE LIVE DATA, so whatever doctors and
-- secretaries have already typed is adopted into the list instead of being
-- thrown away to make the data fit the list. That happens in section 3h,
-- because it has to read `user_profile` and section 3 is what guarantees that
-- table exists on a fresh install.


-- =============================================================================
-- 3. `user_profile` -- the wide 1:1 profile row (upgraded in place)
--
--    One row per user, role-specific columns nullable. All four profile pages
--    read the same shape, which is exactly what src/services/profile.ts already
--    declares as `UserProfile`, so no TSX changes are needed.
--
--    ORDER OF OPERATIONS INSIDE THIS SECTION (this order is the bug fix):
--      3a  fresh-install CREATE TABLE
--      3b  primary-key swap, immediately re-securing the FK to `user`
--      3c  ADD COLUMN IF NOT EXISTS for any column an older copy is missing
--      3d  DROP the old constraints
--      3e  NORMALISE the stored values          <-- before any MODIFY
--      3f  MODIFY the column types/collations   <-- after the data is clean
--      3g  ADD the constraints back
--    An earlier draft ran 3f before 3e. Under the STRICT_ALL_TABLES set at the
--    top of this file that meant a MODIFY could abort the whole script with
--    ERROR 1406 while the foreign key from 3b was still dropped, leaving
--    `user_profile` with no ON DELETE CASCADE and no CHECK constraints -- and
--    re-running would abort at the same statement. Fixed twice over: the
--    normalisation now runs first, AND no column is ever narrowed.
-- =============================================================================

-- 3a. Fresh-install path. On the live DB the table already exists and this is
--     skipped entirely; 3b onward then upgrade the existing table to match.
--     The FK is declared INLINE because ADD CONSTRAINT IF NOT EXISTS ...
--     FOREIGN KEY does not parse on 10.4 (fact 1 at the top of this file).
--     Widths here are IDENTICAL to the widths 3f settles on, so a fresh install
--     and an upgraded install end up byte-for-byte the same.
CREATE TABLE IF NOT EXISTS `user_profile` (
    `user_id`           INT          NOT NULL,

    -- Common -- all four profile pages
    `phone`             VARCHAR(30)  DEFAULT NULL,
    `avatar_url`        VARCHAR(255) DEFAULT NULL,

    -- Patient page
    `date_of_birth`     DATE         DEFAULT NULL,
    `gender`            VARCHAR(20)  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
    `blood_type`        VARCHAR(5)   CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
    `allergies`         TEXT         DEFAULT NULL,
    `emergency_contact` VARCHAR(255) DEFAULT NULL,

    -- Doctor page  (specialty is FREE TEXT -- see section 2)
    `specialty`         VARCHAR(120) DEFAULT NULL,
    `license_number`    VARCHAR(60)  DEFAULT NULL,
    `bio`               TEXT         DEFAULT NULL,
    `clinic_name`       VARCHAR(180) DEFAULT NULL,
    `clinic_address`    VARCHAR(255) DEFAULT NULL,

    -- Secretary page  (department is FREE TEXT -- see section 2)
    `department`        VARCHAR(120) DEFAULT NULL,

    `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`user_id`),
    CONSTRAINT `FK_USER_PROFILE_USER`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- 3b. Primary-key swap for the ALREADY-APPLIED table.
--     Existing shape: surrogate `id` AUTO_INCREMENT PK + UNIQUE(user_id).
--     Target shape:   natural PK on user_id (it is a strict 1:1 -- the
--     surrogate key buys nothing and lets a second row per user look legal).
--     The `id` column is dropped in the SAME statement as the PK, which is what
--     keeps InnoDB from complaining that an AUTO_INCREMENT column is no longer
--     part of a key (ERROR 1075).
--
--     The FK must be dropped first because InnoDB needs the index it sits on --
--     but it is put back in the very next statement, so the window in which
--     `user_profile` has no ON DELETE CASCADE is one statement wide instead of
--     spanning the rest of the section.
--
--     Idempotent: on the second run DROP PRIMARY KEY removes the user_id PK,
--     the two IF EXISTS clauses are no-ops, and ADD PRIMARY KEY puts it back.
--     AvatarController's `INSERT ... ON DUPLICATE KEY UPDATE avatar_url`
--     (AvatarController.php:986) keeps working: it needs A unique key on
--     user_id, and the primary key is one.
ALTER TABLE `user_profile` DROP FOREIGN KEY IF EXISTS `FK_USER_PROFILE_USER`;

ALTER TABLE `user_profile`
    DROP PRIMARY KEY,
    DROP COLUMN IF EXISTS `id`,
    DROP INDEX IF EXISTS `UNIQ_USER_PROFILE_USER`,
    ADD PRIMARY KEY (`user_id`);

ALTER TABLE `user_profile` ADD CONSTRAINT `FK_USER_PROFILE_USER`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;


-- 3c. Add any column missing on an older copy of the table (no-op on the live
--     DB). Widths match 3a and 3f.
ALTER TABLE `user_profile`
    ADD COLUMN IF NOT EXISTS `phone`             VARCHAR(30)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `avatar_url`        VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `date_of_birth`     DATE         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `gender`            VARCHAR(20)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `blood_type`        VARCHAR(5)   DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `allergies`         TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `emergency_contact` VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `specialty`         VARCHAR(120) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `license_number`    VARCHAR(60)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `bio`               TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `clinic_name`       VARCHAR(180) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `clinic_address`    VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `department`        VARCHAR(120) DEFAULT NULL;


-- 3d. Drop the old constraints. Must happen before 3e so the normalising
--     UPDATEs cannot be blocked by a CHECK that the pre-normalised data fails,
--     and before 3f because retyping a column a CHECK depends on is fragile.
--     The two FOREIGN KEY drops undo an earlier draft of this file that put
--     lookup FKs on specialty/department; on a database that never ran that
--     draft they are no-ops.
ALTER TABLE `user_profile` DROP CONSTRAINT IF EXISTS `CHK_PROFILE_GENDER`;
ALTER TABLE `user_profile` DROP CONSTRAINT IF EXISTS `CHK_PROFILE_BLOOD_TYPE`;
ALTER TABLE `user_profile` DROP FOREIGN KEY IF EXISTS `FK_PROFILE_SPECIALTY`;
ALTER TABLE `user_profile` DROP FOREIGN KEY IF EXISTS `FK_PROFILE_DEPARTMENT`;
ALTER TABLE `user_profile` DROP INDEX IF EXISTS `FK_PROFILE_SPECIALTY`;
ALTER TABLE `user_profile` DROP INDEX IF EXISTS `FK_PROFILE_DEPARTMENT`;


-- 3e. Normalise the CLOSED-VOCABULARY values, BEFORE anything is retyped and
--     before the constraints go back on.
--     ADD CONSTRAINT ... CHECK fails with ERROR 4025 if even one stored row
--     violates it. On the live DB these touch 0 rows (the one populated profile
--     already holds 'male' / 'A-'), but they mean the script also survives a
--     database somebody edited in phpMyAdmin.
--
--     `gender` and `blood_type` are safe to rewrite because both are <select>
--     boxes in patient/ProfilePage.tsx (lines 130-141 and 145-156) whose option
--     values are exactly the strings below -- a stored value outside the list
--     did not come from the app and cannot be displayed by it either.
--
--     `specialty` and `department` are NOT touched. They are free text; there
--     is no correct value to coerce them to, and blanking them would delete
--     something a doctor typed. Section 2 adopts them into ref_specialty /
--     ref_department instead.
UPDATE `user_profile` SET `gender`     = LOWER(TRIM(`gender`))     WHERE `gender` IS NOT NULL;
UPDATE `user_profile` SET `blood_type` = UPPER(TRIM(`blood_type`)) WHERE `blood_type` IS NOT NULL;

-- PRE-FLIGHT: what the next two statements would blank (0 rows on the live DB).
--   SELECT user_id, gender, blood_type FROM user_profile
--    WHERE (gender     IS NOT NULL AND LOWER(TRIM(gender))     NOT IN ('male','female','other','prefer_not_to_say'))
--       OR (blood_type IS NOT NULL AND UPPER(TRIM(blood_type)) NOT IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));
UPDATE `user_profile` SET `gender` = NULL
 WHERE `gender` IS NOT NULL
   AND `gender` NOT IN ('male','female','other','prefer_not_to_say');

UPDATE `user_profile` SET `blood_type` = NULL
 WHERE `blood_type` IS NOT NULL
   AND `blood_type` NOT IN ('A+','A-','B+','B-','AB+','AB-','O+','O-');


-- 3f. Retype to the target definition, now that the data cannot violate it.
--     NOTHING HERE NARROWS A COLUMN -- see fact 4 at the top of this file.
--       gender     VARCHAR(20)  -> VARCHAR(20)  (collation only)
--       blood_type VARCHAR(5)   -> VARCHAR(5)   (collation only)
--       specialty  VARCHAR(120) -> untouched, free text, unicode_ci
--       department VARCHAR(120) -> untouched, free text, unicode_ci
--     The bin collation is what gives the two CHECK constraints their teeth.
ALTER TABLE `user_profile`
    MODIFY COLUMN `gender`     VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
    MODIFY COLUMN `blood_type` VARCHAR(5)  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
    MODIFY COLUMN `specialty`  VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    MODIFY COLUMN `department` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    MODIFY COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY COLUMN `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;


-- 3g. Constraints back on. Drop-then-add == re-runnable (fact 1 at the top).
--     Only the two genuinely closed vocabularies are constrained. Both are
--     already enforced identically in PHP by
--     ProfileController::validateProfileFields() (lines 258 and 262), so the
--     CHECK is a backstop for direct SQL, not the first line of defence -- the
--     user still gets a readable 400, not a 500.
ALTER TABLE `user_profile` ADD CONSTRAINT `CHK_PROFILE_GENDER`
    CHECK (`gender` IS NULL OR `gender` IN ('male','female','other','prefer_not_to_say'));

ALTER TABLE `user_profile` ADD CONSTRAINT `CHK_PROFILE_BLOOD_TYPE`
    CHECK (`blood_type` IS NULL OR `blood_type` IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));

-- Helper index for "list the doctors in cardiology" / the stats view.
-- Not unique, not a constraint -- just a lookup aid on free text.
ALTER TABLE `user_profile` ADD INDEX IF NOT EXISTS `IDX_PROFILE_SPECIALTY`  (`specialty`);
ALTER TABLE `user_profile` ADD INDEX IF NOT EXISTS `IDX_PROFILE_DEPARTMENT` (`department`);


-- 3h. Adopt the free text that is ALREADY stored into the section-2 lookups.
--     This is the replacement for the "SET specialty = NULL WHERE it is not a
--     seeded code" statements an earlier draft of this file had. Those deleted
--     real data -- a doctor who had typed "Cardiologist" or "Medecine Generale"
--     simply found the field empty after the migration, with no backup and no
--     log. Growing the list is the non-destructive direction.
--
--     Lives here rather than in section 2 only because it reads `user_profile`,
--     which section 3a is what creates on a fresh install. INSERT IGNORE keeps
--     the hand-written seeds' labels and sort_order when a code collides.
INSERT IGNORE INTO `ref_specialty` (`code`, `label`, `sort_order`)
SELECT LOWER(REPLACE(TRIM(p.`specialty`), ' ', '_')), MAX(TRIM(p.`specialty`)), 500
  FROM `user_profile` p
 WHERE p.`specialty` IS NOT NULL
   AND TRIM(p.`specialty`) <> ''
 GROUP BY LOWER(REPLACE(TRIM(p.`specialty`), ' ', '_'));

INSERT IGNORE INTO `ref_department` (`code`, `label`, `sort_order`)
SELECT LOWER(REPLACE(TRIM(p.`department`), ' ', '_')), MAX(TRIM(p.`department`)), 500
  FROM `user_profile` p
 WHERE p.`department` IS NOT NULL
   AND TRIM(p.`department`) <> ''
 GROUP BY LOWER(REPLACE(TRIM(p.`department`), ' ', '_'));


-- =============================================================================
-- 4. `user_setting` -- one row per user, one row per settings page
--
--    *** SCHEMA ONLY. NOTHING READS OR WRITES THIS TABLE YET. ***
--
--    Be clear about what running this script does and does not buy you: it
--    creates the table and backfills a row per user with the defaults. It does
--    NOT make the settings pages persist anything. After this script,
--    src/pages/{patient,doctor,secretary}/SettingsPage.tsx still keep language
--    and theme in local component state and still forget them on reload.
--
--    STILL TO BE WRITTEN (none of it exists in the repo today):
--      * backend/api/SettingsController.php with
--            show()   -> SELECT * FROM v_user_setting WHERE user_id = ?
--            update() -> INSERT INTO user_setting (...) VALUES (...)
--                        ON DUPLICATE KEY UPDATE ...,
--                        whitelisting language|theme|notify_* the way
--                        ProfileController::PROFILE_FIELDS does
--      * two `case` entries in backend/api/index.php -- the switch currently
--        stops at 'POST /api/profile/password'
--      * src/services/settings.ts + a useSettings hook, then wire the three
--        SettingsPage.tsx files to them
--
--    Separate table from user_profile on purpose: toggling dark mode should not
--    rewrite a row that contains allergies and an emergency contact. Different
--    write frequency, different sensitivity, different page.
--
--    The five notification toggles are kept DISTINCT rather than collapsed,
--    because the three settings pages between them show five differently
--    labelled switches:
--        patient   : Appointment Reminders / Messages / Health Reminders
--        doctor    : Appointment Reminders / Emergency Alerts / System Reminders
--        secretary : Appointment Reminders / Emergency Alerts / System Reminders
--    Five TINYINTs is a cheap price for not lying to the user about what a
--    switch controls.
--
--    Admin has NO settings row semantics of its own -- there is no
--    admin/SettingsPage.tsx. Admin uses SystemSettingsPage.tsx, which is
--    SYSTEM-WIDE configuration and must NOT read or write this table.
--
--    `language` / `theme` values match the <option value> attributes in
--    patient/SettingsPage.tsx lines 29-32 and 48-50 exactly.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `user_setting` (
    `user_id`                   INT NOT NULL,

    `language`                  VARCHAR(5)  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'en',
    `theme`                     VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'system',

    `notify_appointments`       TINYINT(1) NOT NULL DEFAULT 1,  -- "Appointment Reminders" (all 3 pages)
    `notify_messages`           TINYINT(1) NOT NULL DEFAULT 1,  -- "Messages"              (patient)
    `notify_health_reminders`   TINYINT(1) NOT NULL DEFAULT 1,  -- "Health Reminders"      (patient)
    `notify_emergency`          TINYINT(1) NOT NULL DEFAULT 1,  -- "Emergency Alerts"      (doctor, secretary)
    `notify_system_reminders`   TINYINT(1) NOT NULL DEFAULT 1,  -- "System Reminders"      (doctor, secretary)

    `created_at`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`user_id`),
    CONSTRAINT `FK_USER_SETTING_USER`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Normalise before constraining, same reason as 3e (no-op on a new table).
UPDATE `user_setting` SET `language` = LOWER(TRIM(`language`));
UPDATE `user_setting` SET `theme`    = LOWER(TRIM(`theme`));
UPDATE `user_setting` SET `language` = 'en'     WHERE `language` NOT IN ('en','fr','es','ar');
UPDATE `user_setting` SET `theme`    = 'system' WHERE `theme`    NOT IN ('light','dark','system');

ALTER TABLE `user_setting` DROP CONSTRAINT IF EXISTS `CHK_SETTING_LANGUAGE`;
ALTER TABLE `user_setting` ADD CONSTRAINT `CHK_SETTING_LANGUAGE`
    CHECK (`language` IN ('en','fr','es','ar'));

ALTER TABLE `user_setting` DROP CONSTRAINT IF EXISTS `CHK_SETTING_THEME`;
ALTER TABLE `user_setting` ADD CONSTRAINT `CHK_SETTING_THEME`
    CHECK (`theme` IN ('light','dark','system'));


-- =============================================================================
-- 5. Backfill -- every existing user gets a profile row and a settings row
--    LEFT JOIN ... WHERE NULL means re-running inserts nothing.
--    `created_at` is supplied by its DEFAULT CURRENT_TIMESTAMP (set in 3f).
-- =============================================================================

INSERT INTO `user_profile` (`user_id`)
SELECT u.`id`
  FROM `user` u
  LEFT JOIN `user_profile` p ON p.`user_id` = u.`id`
 WHERE p.`user_id` IS NULL;

INSERT INTO `user_setting` (`user_id`)
SELECT u.`id`
  FROM `user` u
  LEFT JOIN `user_setting` s ON s.`user_id` = u.`id`
 WHERE s.`user_id` IS NULL;


-- =============================================================================
-- 6. Views
--
--    RULE FOR FUTURE MIGRATIONS: any migration that ALTERs `user_profile` or
--    `user_setting` must re-run the matching CREATE OR REPLACE VIEW in the same
--    file. A view keeps a frozen snapshot of the column list; if you add a
--    column and forget the view, the API silently never returns it.
-- =============================================================================

-- 6a. v_user_profile -- keeps ProfileController::show() a single SELECT.
--     The LEFT JOIN is load-bearing: a user with no profile row still returns
--     one row of NULLs instead of a 404.
--     Every column name presentProfile() reads (ProfileController.php:293-322)
--     is present and unchanged, so neither the PHP nor the TS `UserProfile`
--     type needs touching. `specialty` and `department` are returned verbatim
--     as the doctor/secretary typed them -- already human-readable, which is
--     why there is no *_label column to translate.
--     Deliberately EXCLUDES password, verification_code and
--     password_reset_token, so `SELECT *` against this view is always safe.
CREATE OR REPLACE VIEW `v_user_profile` AS
SELECT
    u.`id`                  AS `user_id`,
    u.`name`                AS `name`,
    u.`email`               AS `email`,
    u.`roles`               AS `roles`,
    u.`is_verified`         AS `is_verified`,
    u.`status`              AS `status`,
    u.`created_at`          AS `created_at`,
    u.`updated_at`          AS `updated_at`,
    u.`last_login_at`       AS `last_login_at`,
    u.`password_changed_at` AS `password_changed_at`,

    p.`phone`               AS `phone`,
    p.`avatar_url`          AS `avatar_url`,

    p.`date_of_birth`       AS `date_of_birth`,
    p.`gender`              AS `gender`,
    p.`blood_type`          AS `blood_type`,
    p.`allergies`           AS `allergies`,
    p.`emergency_contact`   AS `emergency_contact`,

    p.`specialty`           AS `specialty`,
    p.`license_number`      AS `license_number`,
    p.`bio`                 AS `bio`,
    p.`clinic_name`         AS `clinic_name`,
    p.`clinic_address`      AS `clinic_address`,

    p.`department`          AS `department`,

    p.`updated_at`          AS `profile_updated_at`
FROM `user` u
LEFT JOIN `user_profile` p ON p.`user_id` = u.`id`;


-- 6b. v_user_setting -- the SELECT a future GET /api/settings should use.
--     Nothing calls it yet (see the header of section 4).
--     COALESCE supplies the documented defaults so a user whose settings row is
--     somehow missing still reads back a usable object instead of NULLs.
CREATE OR REPLACE VIEW `v_user_setting` AS
SELECT
    u.`id`                                     AS `user_id`,
    u.`email`                                  AS `email`,
    COALESCE(s.`language`, 'en')               AS `language`,
    COALESCE(s.`theme`, 'system')              AS `theme`,
    COALESCE(s.`notify_appointments`, 1)       AS `notify_appointments`,
    COALESCE(s.`notify_messages`, 1)           AS `notify_messages`,
    COALESCE(s.`notify_health_reminders`, 1)   AS `notify_health_reminders`,
    COALESCE(s.`notify_emergency`, 1)          AS `notify_emergency`,
    COALESCE(s.`notify_system_reminders`, 1)   AS `notify_system_reminders`,
    s.`updated_at`                             AS `updated_at`
FROM `user` u
LEFT JOIN `user_setting` s ON s.`user_id` = u.`id`;


-- 6c. v_profile_stats -- real numbers for src/pages/admin/StatisticsPage.tsx,
--     which is currently 100% hardcoded arrays. (Also not wired up yet.)
--
--     Shape: dimension | code | label | sort_order | user_count
--     Usage: SELECT * FROM v_profile_stats WHERE dimension = 'specialty'
--            ORDER BY sort_order, label;
--
--     Because specialty/department are free text, each of those dimensions is
--     TWO branches:
--       * one FROM the lookup table, so a seeded specialty with zero doctors
--         still renders as a zero-height bar instead of vanishing;
--       * one over the stored values that do NOT match any seed, so a doctor
--         who typed something unusual is still counted under their own label
--         instead of silently disappearing from the chart.
--     Section 2 adopts existing free text into the lookups, so in practice the
--     second branch only catches values typed after this script ran.
--
--     The join key is LOWER(REPLACE(TRIM(x),' ','_')) on both sides, so
--     "Cardiology", "cardiology" and "CARDIOLOGY" are one bar. It is a
--     presentation-time fold, not a rewrite of the stored value.
--
--     Every code/label is cast to utf8mb4_unicode_ci: the source columns are a
--     mix of utf8mb4_bin (gender, blood_type, roles) and utf8mb4_unicode_ci
--     (specialty, department, labels), and UNION-ing mixed collations raises
--     "illegal mix of collations" (1271) without an explicit COLLATE on each
--     branch.
CREATE OR REPLACE VIEW `v_profile_stats` AS

    -- users per role
    SELECT
        'role' COLLATE utf8mb4_unicode_ci AS `dimension`,
        LOWER(REPLACE(JSON_VALUE(u.`roles`, '$[0]'), 'ROLE_', '')) COLLATE utf8mb4_unicode_ci AS `code`,
        CASE LOWER(REPLACE(JSON_VALUE(u.`roles`, '$[0]'), 'ROLE_', ''))
            WHEN 'patient'   THEN 'Patient'
            WHEN 'doctor'    THEN 'Doctor'
            WHEN 'secretary' THEN 'Secretary'
            WHEN 'admin'     THEN 'Admin'
            ELSE 'Unknown'
        END COLLATE utf8mb4_unicode_ci AS `label`,
        0 AS `sort_order`,
        COUNT(*) AS `user_count`
    FROM `user` u
    GROUP BY `code`, `label`

    UNION ALL

    -- accounts per status
    SELECT
        'status' COLLATE utf8mb4_unicode_ci,
        u.`status` COLLATE utf8mb4_unicode_ci,
        CASE u.`status` WHEN 'active' THEN 'Active' ELSE 'Inactive' END COLLATE utf8mb4_unicode_ci,
        0,
        COUNT(*)
    FROM `user` u
    GROUP BY u.`status`

    UNION ALL

    -- patients per gender
    SELECT
        'gender' COLLATE utf8mb4_unicode_ci,
        p.`gender` COLLATE utf8mb4_unicode_ci,
        CASE p.`gender`
            WHEN 'male'              THEN 'Male'
            WHEN 'female'            THEN 'Female'
            WHEN 'other'             THEN 'Other'
            WHEN 'prefer_not_to_say' THEN 'Prefer not to say'
            ELSE p.`gender`
        END COLLATE utf8mb4_unicode_ci,
        0,
        COUNT(*)
    FROM `user_profile` p
    WHERE p.`gender` IS NOT NULL
    GROUP BY p.`gender`

    UNION ALL

    -- patients per blood type
    SELECT
        'blood_type' COLLATE utf8mb4_unicode_ci,
        p.`blood_type` COLLATE utf8mb4_unicode_ci,
        p.`blood_type` COLLATE utf8mb4_unicode_ci,
        0,
        COUNT(*)
    FROM `user_profile` p
    WHERE p.`blood_type` IS NOT NULL
    GROUP BY p.`blood_type`

    UNION ALL

    -- doctors per KNOWN specialty -- zero-count specialties still appear
    SELECT
        'specialty' COLLATE utf8mb4_unicode_ci,
        rs.`code`  COLLATE utf8mb4_unicode_ci,
        rs.`label` COLLATE utf8mb4_unicode_ci,
        rs.`sort_order`,
        COUNT(p.`user_id`)
    FROM `ref_specialty` rs
    LEFT JOIN `user_profile` p
           ON LOWER(REPLACE(TRIM(p.`specialty`), ' ', '_')) = rs.`code`
    GROUP BY rs.`code`, rs.`label`, rs.`sort_order`

    UNION ALL

    -- ...plus anything typed that is not in the lookup, under its own label
    SELECT
        'specialty' COLLATE utf8mb4_unicode_ci,
        LOWER(REPLACE(TRIM(p.`specialty`), ' ', '_')) COLLATE utf8mb4_unicode_ci,
        MAX(TRIM(p.`specialty`)) COLLATE utf8mb4_unicode_ci,
        900,
        COUNT(*)
    FROM `user_profile` p
    WHERE p.`specialty` IS NOT NULL
      AND TRIM(p.`specialty`) <> ''
      AND LOWER(REPLACE(TRIM(p.`specialty`), ' ', '_')) NOT IN (SELECT `code` FROM `ref_specialty`)
    GROUP BY LOWER(REPLACE(TRIM(p.`specialty`), ' ', '_'))

    UNION ALL

    -- secretaries per KNOWN department -- zero-count departments still appear
    SELECT
        'department' COLLATE utf8mb4_unicode_ci,
        rd.`code`  COLLATE utf8mb4_unicode_ci,
        rd.`label` COLLATE utf8mb4_unicode_ci,
        rd.`sort_order`,
        COUNT(p.`user_id`)
    FROM `ref_department` rd
    LEFT JOIN `user_profile` p
           ON LOWER(REPLACE(TRIM(p.`department`), ' ', '_')) = rd.`code`
    GROUP BY rd.`code`, rd.`label`, rd.`sort_order`

    UNION ALL

    -- ...plus anything typed that is not in the lookup, under its own label
    SELECT
        'department' COLLATE utf8mb4_unicode_ci,
        LOWER(REPLACE(TRIM(p.`department`), ' ', '_')) COLLATE utf8mb4_unicode_ci,
        MAX(TRIM(p.`department`)) COLLATE utf8mb4_unicode_ci,
        900,
        COUNT(*)
    FROM `user_profile` p
    WHERE p.`department` IS NOT NULL
      AND TRIM(p.`department`) <> ''
      AND LOWER(REPLACE(TRIM(p.`department`), ' ', '_')) NOT IN (SELECT `code` FROM `ref_department`)
    GROUP BY LOWER(REPLACE(TRIM(p.`department`), ' ', '_'));


-- =============================================================================
-- 7. Sanity check -- these should all return sensible numbers after the run.
--    Safe to leave in; they only read.
-- =============================================================================

SELECT 'users'          AS what, COUNT(*) AS n FROM `user`
UNION ALL SELECT 'profile rows',   COUNT(*) FROM `user_profile`
UNION ALL SELECT 'setting rows',   COUNT(*) FROM `user_setting`
UNION ALL SELECT 'specialties',    COUNT(*) FROM `ref_specialty`
UNION ALL SELECT 'departments',    COUNT(*) FROM `ref_department`;
-- users, profile rows and setting rows must be equal.

-- Nothing was lost: this must return 0.
SELECT COUNT(*) AS `profiles_without_a_user`
  FROM `user_profile` p
  LEFT JOIN `user` u ON u.`id` = p.`user_id`
 WHERE u.`id` IS NULL;

-- The ON DELETE CASCADE survived the primary-key swap: this must return 2
-- (FK_USER_PROFILE_USER and FK_USER_SETTING_USER).
SELECT COUNT(*) AS `foreign_keys_present`
  FROM `information_schema`.`TABLE_CONSTRAINTS`
 WHERE `CONSTRAINT_SCHEMA` = DATABASE()
   AND `CONSTRAINT_TYPE`   = 'FOREIGN KEY'
   AND `TABLE_NAME` IN ('user_profile','user_setting');


-- =============================================================================
-- 8. NOTES FOR THE PHP SIDE (no SQL to run here -- read once, then delete)
-- =============================================================================
--
-- 8a. ROLE-SCOPE THE WRITE WHITELIST. ProfileController::PROFILE_FIELDS
--     (ProfileController.php:13-27) is one flat, role-blind array, so a logged
--     -in PATIENT can POST {"specialty":"cardiology"} and it is written to
--     their row. Split it and pick by role -- about 20 lines:
--
--       COMMON    = phone, avatarUrl
--       PATIENT  += dateOfBirth, gender, bloodType, allergies, emergencyContact
--       DOCTOR   += specialty, licenseNumber, bio, clinicName, clinicAddress
--       SECRETARY+= department
--       ADMIN     = COMMON only
--
--     This is the only thing keeping specialty/department honest now that they
--     are free text with no database constraint.
--
-- 8b. ADD LENGTH VALIDATION for the free-text columns, in
--     validateProfileFields(), alongside the avatar_url length check that is
--     already there (line 274). Under the server's NON-strict default sql_mode
--     an over-length value is silently TRUNCATED, not rejected:
--
--       specialty      120   department  120   clinic_name  180
--       license_number  60   phone        30   clinic_address / emergency_contact 255
--
--     e.g.  if ($column === 'specialty' && mb_strlen((string) $value) > 120) {
--               return 'Specialty is too long (max 120 characters).';
--           }
--
-- 8c. TRANSLATE CONSTRAINT VIOLATIONS. gender and blood_type now have CHECK
--     constraints, and both have utf8mb4_bin collation, so 'Male' is REJECTED
--     where 'male' is accepted. validateProfileFields() already rejects those
--     first with a readable 400 (lines 258 and 262), so this only fires if the
--     two lists ever drift apart. Cheap insurance:
--
--       } catch (PDOException $e) {
--           if ($e->getCode() === '23000' && str_contains($e->getMessage(), 'CHK_PROFILE_')) {
--               return ['success' => false, 'error' => 'Invalid profile value.'];
--           }
--           throw $e;
--       }
--
--     Keep the two PHP lists and the two CHECK lists in sync as a pair.
--
-- 8d. created_at/updated_at now have DEFAULT CURRENT_TIMESTAMP and ON UPDATE
--     CURRENT_TIMESTAMP, so the INSERT ... ON DUPLICATE KEY UPDATE in
--     ProfileController::update() no longer needs to pass them by hand.
--     Keep VALUES(col) in the ON DUPLICATE clause -- MySQL 8's `AS new`
--     row-alias syntax does not exist on MariaDB 10.4.
--
-- 8e. OPTIONAL, and only if you also change the UI: to turn specialty and
--     department into dropdowns, add GET /api/lookups returning
--         SELECT code, label FROM ref_specialty  ORDER BY sort_order, label
--         SELECT code, label FROM ref_department ORDER BY sort_order, label
--     and swap the <Input> at doctor/ProfilePage.tsx:96 and
--     secretary/ProfilePage.tsx:74 for a <select>. Store the LABEL, not the
--     code, so the value stays human-readable everywhere it is displayed and
--     nothing else has to change. Do NOT add a foreign key even then -- the
--     'Other' seed row exists precisely so people are not forced to lie.
--
--
-- DELIBERATELY NOT BUILT (documented so the decision is on the record)
--
--   * NO foreign key on specialty / department. See the top of section 2.
--
--   * emergency_contact stays ONE free-text VARCHAR(255). The frontend is wired
--     to a single `emergencyContact` string (patient/ProfilePage.tsx:169-176)
--     and nothing dials the number. When a real "call emergency contact"
--     feature appears, the upgrade is purely additive:
--         ALTER TABLE user_profile
--             ADD COLUMN IF NOT EXISTS emergency_contact_name         VARCHAR(120) DEFAULT NULL,
--             ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(60)  DEFAULT NULL,
--             ADD COLUMN IF NOT EXISTS emergency_contact_phone        VARCHAR(30)  DEFAULT NULL;
--     ...keeping the old column as the display fallback until the form is split.
--
--   * allergies stays TEXT. A patient_allergy child table is the "correct"
--     model, but it needs a chip picker plus array form state on the patient
--     page -- the single largest UI build available here -- to feed a chart
--     that does not exist yet. TEXT -> child table is a pure additive migration
--     later; the reverse would not be.
-- =============================================================================


-- =============================================================================
-- 9. ROLLBACK
--
--    Everything below is COMMENTED OUT. To undo this script, uncomment the
--    block and run it. Order matters: views first, then the tables that hold
--    the foreign keys, then the lookups.
--
--    WARNING: dropping user_setting destroys every settings preference. It does
--    NOT touch accounts in `user` or profiles in `user_profile`.
--    Back up first:
--      C:\xampp\mysql\bin\mysqldump.exe -u root medisecretary > medisecretary_backup.sql
-- =============================================================================
--
-- -- 9a. Views
-- DROP VIEW IF EXISTS `v_profile_stats`;
-- DROP VIEW IF EXISTS `v_user_setting`;
-- DROP VIEW IF EXISTS `v_user_profile`;
--
-- -- 9b. New tables from this script. Nothing has a foreign key onto the two
-- --     ref_ tables, so they drop cleanly.
-- DROP TABLE IF EXISTS `user_setting`;
-- DROP TABLE IF EXISTS `ref_specialty`;
-- DROP TABLE IF EXISTS `ref_department`;
--
-- -- 9c. Undo the constraints and indexes added to user_profile
-- --     (keep user_profile itself -- it predates this script)
-- ALTER TABLE `user_profile` DROP CONSTRAINT IF EXISTS `CHK_PROFILE_GENDER`;
-- ALTER TABLE `user_profile` DROP CONSTRAINT IF EXISTS `CHK_PROFILE_BLOOD_TYPE`;
-- ALTER TABLE `user_profile` DROP INDEX IF EXISTS `IDX_PROFILE_SPECIALTY`;
-- ALTER TABLE `user_profile` DROP INDEX IF EXISTS `IDX_PROFILE_DEPARTMENT`;
-- ALTER TABLE `user_profile`
--     MODIFY COLUMN `gender`     VARCHAR(20)  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
--     MODIFY COLUMN `blood_type` VARCHAR(5)   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
--     MODIFY COLUMN `created_at` DATETIME NOT NULL,
--     MODIFY COLUMN `updated_at` DATETIME NULL DEFAULT NULL;
--
-- -- 9d. Restore the old surrogate primary key on user_profile
-- ALTER TABLE `user_profile` DROP FOREIGN KEY IF EXISTS `FK_USER_PROFILE_USER`;
-- ALTER TABLE `user_profile`
--     DROP PRIMARY KEY,
--     ADD COLUMN `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY FIRST,
--     ADD UNIQUE INDEX `UNIQ_USER_PROFILE_USER` (`user_id`);
-- ALTER TABLE `user_profile` ADD CONSTRAINT `FK_USER_PROFILE_USER`
--     FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
--
-- -- 9e. Undo the `user` status constraint (leaves the six audit columns alone)
-- ALTER TABLE `user` DROP CONSTRAINT IF EXISTS `CHK_USER_STATUS`;
-- ALTER TABLE `user` MODIFY COLUMN `status` VARCHAR(20)
--     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active';
--
-- -- 9f. Re-create the view Version20260726000002 left behind, so the database
-- --     is back at that migration's shape rather than viewless.
-- CREATE OR REPLACE VIEW `v_user_profile` AS
--     SELECT u.id AS user_id, u.name, u.email, u.roles, u.is_verified, u.status,
--            u.created_at, u.last_login_at, u.password_changed_at,
--            p.phone, p.avatar_url, p.date_of_birth, p.gender, p.blood_type,
--            p.allergies, p.emergency_contact, p.specialty, p.license_number,
--            p.bio, p.clinic_name, p.clinic_address, p.department
--       FROM `user` u
--       LEFT JOIN `user_profile` p ON p.user_id = u.id;
--
-- -- 9g. Hand the schema back to Doctrine (undoes section 0). Only do this if
-- --     you are also reverting to the migration chain as the source of truth.
-- -- DELETE FROM `doctrine_migration_versions`
-- --  WHERE `version` IN ('DoctrineMigrations\\Version20260725000001',
-- --                      'DoctrineMigrations\\Version20260726000002');
--
-- -- 9h. FULL rollback of the original profile migration as well -- only if you
-- --     really want the schema back at Version20260725000001.
-- -- DROP VIEW  IF EXISTS `v_user_profile`;
-- -- DROP TABLE IF EXISTS `user_profile`;
-- -- ALTER TABLE `user` DROP INDEX IF EXISTS `IDX_USER_RESET_TOKEN`;
-- -- ALTER TABLE `user`
-- --     DROP COLUMN IF EXISTS `status`,
-- --     DROP COLUMN IF EXISTS `password_changed_at`,
-- --     DROP COLUMN IF EXISTS `password_reset_token`,
-- --     DROP COLUMN IF EXISTS `password_reset_expires_at`,
-- --     DROP COLUMN IF EXISTS `updated_at`,
-- --     DROP COLUMN IF EXISTS `last_login_at`;
-- =============================================================================
