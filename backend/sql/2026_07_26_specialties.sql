-- =============================================================================
-- Admin-managed medical specialties
--
-- Doctors pick their specialty from a list the Admin curates; they can no longer
-- type free text. Deleting a specialty that doctors use is BLOCKED at the FK
-- level (ON DELETE RESTRICT); the Admin deactivates it instead, which hides it
-- from the doctor dropdown while existing doctors keep their value.
--
-- Target: MariaDB 10.4.32
-- Run:  mysql -u root medisecretary < 2026_07_26_specialties.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The catalogue
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `specialty` (
    `id`          INT AUTO_INCREMENT NOT NULL,
    `name`        VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
    `sort_order`  INT          NOT NULL DEFAULT 0,
    `created_at`  DATETIME     NOT NULL,
    `updated_at`  DATETIME     DEFAULT NULL,
    PRIMARY KEY (`id`),
    -- Case-insensitive under utf8mb4_unicode_ci, so "Cardiology" and
    -- "cardiology" collide — which is what an admin would expect.
    UNIQUE INDEX `UNIQ_SPECIALTY_NAME` (`name`),
    INDEX `IDX_SPECIALTY_ACTIVE` (`is_active`, `sort_order`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 2. Seed a starting list (skipped on re-run thanks to the unique name)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `specialty` (`name`, `description`, `sort_order`, `created_at`) VALUES
    ('Cardiology',        'Heart and blood vessels',                 10, NOW()),
    ('Dermatology',       'Skin, hair and nails',                    20, NOW()),
    ('Pediatrics',        'Infants, children and adolescents',       30, NOW()),
    ('General Practice',  'Primary and family care',                 40, NOW()),
    ('Neurology',         'Brain, spinal cord and nerves',           50, NOW()),
    ('Orthopedics',       'Bones, joints and muscles',               60, NOW()),
    ('Gynecology',        'Female reproductive health',              70, NOW()),
    ('Ophthalmology',     'Eyes and vision',                         80, NOW()),
    ('Psychiatry',        'Mental health',                           90, NOW()),
    ('Radiology',         'Medical imaging',                        100, NOW());


-- -----------------------------------------------------------------------------
-- 3. Link doctors to the catalogue
--
-- `specialty_id` becomes the source of truth. The legacy free-text `specialty`
-- column is kept (not dropped) so nothing is destroyed and a rollback is trivial;
-- it is simply no longer read or written by the application.
-- -----------------------------------------------------------------------------
ALTER TABLE `user_profile`
    ADD COLUMN IF NOT EXISTS `specialty_id` INT DEFAULT NULL AFTER `specialty`;

-- Best-effort carry-over for any free text that already matches a seeded name.
UPDATE `user_profile` p
  JOIN `specialty` s ON s.`name` = p.`specialty`
   SET p.`specialty_id` = s.`id`
 WHERE p.`specialty_id` IS NULL;

-- RESTRICT is what makes "delete is blocked while in use" true at the database
-- level, not just in PHP — so a stray DELETE cannot orphan a doctor either.
ALTER TABLE `user_profile`
    ADD CONSTRAINT `FK_USER_PROFILE_SPECIALTY`
    FOREIGN KEY (`specialty_id`) REFERENCES `specialty` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- 4. Expose the joined name through the profile view
--    `specialty` keeps its meaning for the frontend (a display string), but now
--    comes from the catalogue instead of free text.
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
    p.`avatar_url`,
    p.`date_of_birth`,
    p.`gender`,
    p.`blood_type`,
    p.`allergies`,
    p.`emergency_contact`,
    p.`specialty_id`,
    s.`name`              AS specialty,
    s.`is_active`         AS specialty_is_active,
    p.`license_number`,
    p.`bio`,
    p.`clinic_name`,
    p.`clinic_address`,
    p.`department`
FROM `user` u
LEFT JOIN `user_profile` p ON p.`user_id` = u.`id`
LEFT JOIN `specialty`    s ON s.`id`      = p.`specialty_id`;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE `user_profile` DROP FOREIGN KEY `FK_USER_PROFILE_SPECIALTY`;
-- ALTER TABLE `user_profile` DROP COLUMN `specialty_id`;
-- DROP TABLE IF EXISTS `specialty`;
-- Then re-run 2026_07_26_revert_to_url_avatar.sql to restore the previous view.
