-- =============================================================================
-- Revert the avatar feature to URL-only.
--
-- An earlier upload-based design added `user_avatar` / `user_avatar_rate` and
-- rebuilt `v_user_profile` to expose `avatar_key` + `avatar_mime` from that
-- table. The product decision is that a profile picture is a link the user
-- pastes, so the authoritative column is `user_profile.avatar_url` again.
--
-- Run:  mysql -u root medisecretary < 2026_07_26_revert_to_url_avatar.sql
-- =============================================================================

-- 1. Point the view back at user_profile.avatar_url ---------------------------
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
    p.`specialty`,
    p.`license_number`,
    p.`bio`,
    p.`clinic_name`,
    p.`clinic_address`,
    p.`department`
FROM `user` u
LEFT JOIN `user_profile` p ON p.`user_id` = u.`id`;

-- 2. Drop the upload-only tables ----------------------------------------------
-- Both are empty; no avatar was ever uploaded. Order matters only if FKs exist.
DROP TABLE IF EXISTS `user_avatar_rate`;
DROP TABLE IF EXISTS `user_avatar`;


-- =============================================================================
-- ROLLBACK: re-run 2026_07_26_profile_and_password.sql to restore the base view.
-- The upload tables are intentionally not recreated here.
-- =============================================================================
