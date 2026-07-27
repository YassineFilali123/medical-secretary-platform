<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260726000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user_profile table and password/security columns to user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user`
            ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT \'active\' AFTER `is_verified`,
            ADD COLUMN `password_changed_at` DATETIME DEFAULT NULL AFTER `password`,
            ADD COLUMN `password_reset_token` VARCHAR(64) DEFAULT NULL AFTER `password_changed_at`,
            ADD COLUMN `password_reset_expires_at` DATETIME DEFAULT NULL AFTER `password_reset_token`,
            ADD COLUMN `updated_at` DATETIME DEFAULT NULL AFTER `created_at`,
            ADD COLUMN `last_login_at` DATETIME DEFAULT NULL AFTER `updated_at`');

        $this->addSql('ALTER TABLE `user` ADD INDEX `IDX_USER_RESET_TOKEN` (`password_reset_token`)');

        $this->addSql('UPDATE `user` SET `password_changed_at` = `created_at` WHERE `password_changed_at` IS NULL');

        $this->addSql('CREATE TABLE `user_profile` (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            phone VARCHAR(30) DEFAULT NULL,
            avatar_url VARCHAR(255) DEFAULT NULL,
            date_of_birth DATE DEFAULT NULL,
            gender VARCHAR(20) DEFAULT NULL,
            blood_type VARCHAR(5) DEFAULT NULL,
            allergies TEXT NULL,
            emergency_contact VARCHAR(255) DEFAULT NULL,
            specialty VARCHAR(120) DEFAULT NULL,
            license_number VARCHAR(60) DEFAULT NULL,
            bio TEXT NULL,
            clinic_name VARCHAR(180) DEFAULT NULL,
            clinic_address VARCHAR(255) DEFAULT NULL,
            department VARCHAR(120) DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME DEFAULT NULL,
            UNIQUE INDEX UNIQ_USER_PROFILE_USER (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE `user_profile`
            ADD CONSTRAINT FK_USER_PROFILE_USER
            FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');

        // Every existing user gets an empty profile row
        $this->addSql('INSERT INTO `user_profile` (user_id, created_at)
            SELECT u.id, NOW()
              FROM `user` u
              LEFT JOIN `user_profile` p ON p.user_id = u.id
             WHERE p.id IS NULL');

        // Convenience view used by ProfileController::show()
        $this->addSql('CREATE OR REPLACE VIEW `v_user_profile` AS
            SELECT u.id AS user_id, u.name, u.email, u.roles, u.is_verified, u.status,
                   u.created_at, u.last_login_at, u.password_changed_at,
                   p.phone, p.avatar_url, p.date_of_birth, p.gender, p.blood_type,
                   p.allergies, p.emergency_contact, p.specialty, p.license_number,
                   p.bio, p.clinic_name, p.clinic_address, p.department
              FROM `user` u
              LEFT JOIN `user_profile` p ON p.user_id = u.id');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP VIEW IF EXISTS `v_user_profile`');
        $this->addSql('DROP TABLE `user_profile`');
        $this->addSql('ALTER TABLE `user` DROP INDEX `IDX_USER_RESET_TOKEN`');
        $this->addSql('ALTER TABLE `user`
            DROP COLUMN `status`,
            DROP COLUMN `password_changed_at`,
            DROP COLUMN `password_reset_token`,
            DROP COLUMN `password_reset_expires_at`,
            DROP COLUMN `updated_at`,
            DROP COLUMN `last_login_at`');
    }
}
