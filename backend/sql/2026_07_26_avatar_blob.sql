-- =============================================================================
-- MedSecretary — Avatar storage (bytes in MariaDB, never on disk)
-- File: backend/sql/2026_07_26_avatar_blob.sql
-- Database: medisecretary
-- Run:  mysql -u root medisecretary < 2026_07_26_avatar_blob.sql
--
-- Depends on: 2026_07_26_profile_and_password.sql
--
-- WHY THE BYTES ARE IN THE DATABASE AND NOT ON DISK
--   backend/router.php does `file_exists(__DIR__ . $uri)` -> `return false`,
--   which hands the request to `php -S`, which EXECUTES .php files. The URI is
--   urldecode()d with no normalisation. Any attacker-influenced file written
--   anywhere reachable under backend/ is therefore a potential RCE, and
--   backend/api/.htaccess does nothing because `php -S` ignores .htaccess.
--   Because AvatarController never calls move_uploaded_file(), no such file
--   exists, so that branch is unreachable for uploaded content. That is a
--   property of the architecture rather than of a filter someone must maintain.
--
-- OPERATIONAL PRECONDITION — READ BEFORE DEPLOYING
--   Measured on this host: @@max_allowed_packet = 1048576 (1 MiB), MariaDB
--   10.4.32. The application enforces a HARD 512 KiB (524288 byte) cap in PHP.
--   That cap must stay at roughly 50% of max_allowed_packet, because the limit
--   applies in BOTH directions (the write packet AND the result row) and
--   Database.php holds a STATIC PDO singleton — a 2006 "server has gone away"
--   poisons every later query in the same request. IF max_allowed_packet IS EVER
--   LOWERED, LOWER THE PHP CAP TOO (AvatarController::MAX_IMAGE_BYTES).
--
--   Backups: mysqldump HEX-ENCODES BLOBs (2x size). Use --hex-blob and restore
--   with a matching --max-allowed-packet. For a fast text-only backup:
--       mysqldump --ignore-table=medisecretary.user_avatar medisecretary
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. `user_avatar` — 1:1 with `user`, holds the sanitised image bytes.
--
--    DELIBERATELY A SEPARATE TABLE FROM user_profile: ProfileController::show()
--    runs `SELECT * FROM v_user_profile`, so a blob column reachable from that
--    view would drag the whole image over the wire and into PHP memory on EVERY
--    profile page load, and json_encode() would choke on the binary.
-- -----------------------------------------------------------------------------
CREATE TABLE `user_avatar` (
    `user_id`     INT               NOT NULL,

    -- Server-derived ONLY: exactly 'image/png' or 'image/jpeg'. Never taken from
    -- $_FILES['type'] or a filename extension. Used solely as a lookup key into a
    -- hardcoded map when emitting Content-Type, so it can never reach a header
    -- verbatim.
    `mime`        VARCHAR(20)       NOT NULL,

    -- Size of the SANITISED (re-serialised) bytes actually stored below, not of
    -- the upload. App cap 524288; the CHECK is a backstop, not the control.
    `byte_size`   INT UNSIGNED      NOT NULL,

    -- Agreed on by the pure-PHP container parser AND getimagesizefromstring().
    -- Decompression-bomb bound: a 40 KB PNG can declare 30000x30000, so this is a
    -- genuinely separate control from byte_size. We never decompress, so the bomb
    -- would land on the VIEWER's browser.
    `width`       SMALLINT UNSIGNED NOT NULL,
    `height`      SMALLINT UNSIGNED NOT NULL,

    -- sha256 of the sanitised bytes: ETag source + integrity check.
    `sha256`      CHAR(64)          NOT NULL,

    -- 128-bit CSPRNG capability, bin2hex(random_bytes(16)). Exists because an
    -- <img src> CANNOT send an Authorization header, and a numeric /avatar/{id}
    -- URL would be enumerable — walk 1..N and harvest every face in a medical
    -- system. ROTATED ON EVERY UPLOAD, which gives free cache-busting AND revokes
    -- any previously leaked URL.
    `access_key`  CHAR(32)          NOT NULL,

    -- MEDIUMBLOB (16 MiB ceiling), NOT BLOB (64 KiB is too small for a 512x512
    -- PNG-24 with alpha) and NOT LONGBLOB (which would advertise 4 GB that the
    -- packet limit can never honour, inviting someone to "fix" a failure by
    -- raising max_allowed_packet). InnoDB DYNAMIC row format stores any blob over
    -- ~8 KB entirely off-page with a 20-byte pointer in the clustered index, so
    -- metadata-only reads never touch the image pages.
    `data`        MEDIUMBLOB        NOT NULL,

    `created_at`  DATETIME          NOT NULL,
    `updated_at`  DATETIME          DEFAULT NULL,

    PRIMARY KEY (`user_id`),
    -- The serve path looks up by key alone, so this index is load-bearing for
    -- both performance and the uniform-404 timing property.
    UNIQUE INDEX `UNIQ_USER_AVATAR_KEY` (`access_key`),
    -- Right-to-erasure for free: deleting a user physically destroys the image.
    -- No orphan sweeper, no fsck, no two-artifact backup skew.
    CONSTRAINT `FK_USER_AVATAR_USER`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- CHECK constraints are enforced from MariaDB 10.2.1+, so these are live on 10.4.
-- They are a SECOND line of defence only: the real limits are enforced in PHP
-- before any packet is sent to the server (see the max_allowed_packet note above).
ALTER TABLE `user_avatar`
    ADD CONSTRAINT `CHK_USER_AVATAR_SIZE`
        CHECK (`byte_size` > 100 AND `byte_size` <= 524288),
    ADD CONSTRAINT `CHK_USER_AVATAR_DIMS`
        CHECK (`width` BETWEEN 16 AND 2048 AND `height` BETWEEN 16 AND 2048),
    ADD CONSTRAINT `CHK_USER_AVATAR_MIME`
        CHECK (`mime` IN ('image/png', 'image/jpeg'));


-- -----------------------------------------------------------------------------
-- 2. `user_avatar_rate` — upload throttle counters.
--
--    A SEPARATE TABLE ON PURPOSE. If these counters lived in user_avatar they
--    would be destroyed by the delete endpoint, and a delete-then-upload loop
--    would reset the limit — i.e. no limit at all. This table is only removed by
--    the ON DELETE CASCADE from `user`.
--
--    Why throttle at all: each upload writes up to 512 KiB into InnoDB and, under
--    ROW-format binlog, a second copy into the binlog. Unlimited re-uploads are a
--    cheap write-amplification DoS.
-- -----------------------------------------------------------------------------
CREATE TABLE `user_avatar_rate` (
    `user_id`           INT               NOT NULL,
    `window_started_at` DATETIME          NOT NULL,
    `upload_count`      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `last_upload_at`    DATETIME          DEFAULT NULL,

    PRIMARY KEY (`user_id`),
    CONSTRAINT `FK_USER_AVATAR_RATE_USER`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 3. Retire `user_profile`.`avatar_url`.
--
--    The database must NEVER hold a string that can become an <img src>. The
--    column becomes vestigial: nothing reads it and nothing writes a value to it.
--    ProfileController::presentProfile() now SYNTHESISES the URL from the opaque
--    access_key at response time, so a poisoned row cannot produce an arbitrary
--    or `javascript:` image source. The column is retained (rather than dropped)
--    only so this migration stays reversible.
--
--    Before today a client could POST /api/profile/update
--    {"avatarUrl":"http://evil/pixel.gif"} and control a value the UI renders as
--    an image source — a tracking-pixel / mixed-content / spoofing primitive,
--    and with the forgeable token_<id> auth, on ANOTHER user's profile.
-- -----------------------------------------------------------------------------
UPDATE `user_profile` SET `avatar_url` = NULL WHERE `avatar_url` IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 4. Extend the profile view with the avatar KEY and MIME — and nothing else.
--
--    ⚠️ NEVER ADD `a`.`data` TO THIS VIEW. ProfileController::show() runs
--       `SELECT * FROM v_user_profile`, so a blob here would be fetched on every
--       single profile load. Only `access_key` and `mime` are exposed; every
--       other read of user_avatar uses an explicit narrow column list.
--
--    `avatar_url` is intentionally REMOVED from the view so no code can
--    accidentally start reading it again.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_user_profile` AS
SELECT
    u.`id`                AS user_id,
    u.`name`,
    u.`email`,
    u.`roles`,
    u.`is_verified`,
    u.`status`,
    u.`created_at`,
    u.`last_login_at`,
    u.`password_changed_at`,
    p.`phone`,
    a.`access_key`        AS avatar_key,
    a.`mime`              AS avatar_mime,
    p.`date_of_birth`,
    p.`gender`,
    p.`blood_type`,
    p.`allergies`,
    p.`emergency_contact`,
    p.`specialty`,
    p.`license_number`,
    p.`bio`,
    p.`clinic_name`,
    p.`clinic_address`,
    p.`department`
FROM `user` u
LEFT JOIN `user_profile` p ON p.`user_id` = u.`id`
LEFT JOIN `user_avatar`  a ON a.`user_id` = u.`id`;


-- =============================================================================
-- ACCOMPANYING CODE CHANGES THAT ARE PART OF THIS MIGRATION'S CONTRACT
-- =============================================================================
-- 1. ProfileController::PROFILE_FIELDS — DELETE the 'avatarUrl' => 'avatar_url'
--    entry, and delete the now-dead avatar_url branch in validateProfileFields().
--    avatar_url becomes strictly server-managed.
-- 2. src/services/profile.ts — drop "avatarUrl" from the ProfileUpdate Pick<>.
-- 3. ProfileController::presentProfile() — read $row['avatar_key'] and emit
--    'avatarUrl' => "/profile/avatar/{$key}" after re-validating ^[0-9a-f]{32}$.
--    The frontend UserProfile.avatarUrl type is unchanged (string | null).
-- 4. backend/router.php — ship the realpath containment patch with this feature.
-- 5. php.ini — set upload_max_filesize=1M and post_max_size=2M. At the current
--    40M/40M, PHP writes up to 40 MB to the temp directory before a single line
--    of validation runs. A .user.ini is not reliably honoured by `php -S`.


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS `user_avatar_rate`;
-- DROP TABLE IF EXISTS `user_avatar`;
-- (then re-create v_user_profile from 2026_07_26_profile_and_password.sql, and
--  restore the 'avatarUrl' entry in PROFILE_FIELDS only if you accept the
--  client-controlled-image-source issue described in section 3.)
