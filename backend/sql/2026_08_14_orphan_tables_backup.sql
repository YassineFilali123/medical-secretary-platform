-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: medisecretary
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_message`
--

DROP TABLE IF EXISTS `ai_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `patient_user_id` int(11) NOT NULL,
  `sender` varchar(20) NOT NULL,
  `content` text NOT NULL,
  `matched_intent_id` int(11) DEFAULT NULL,
  `matched_faq_id` int(11) DEFAULT NULL,
  `confidence` decimal(4,3) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `IDX_MSG_CONVERSATION` (`conversation_id`),
  KEY `IDX_MSG_PATIENT` (`patient_user_id`),
  KEY `IDX_MSG_CREATED` (`created_at`),
  KEY `FK_MSG_INTENT` (`matched_intent_id`),
  KEY `FK_MSG_FAQ` (`matched_faq_id`),
  CONSTRAINT `FK_MSG_CONVERSATION` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_MSG_FAQ` FOREIGN KEY (`matched_faq_id`) REFERENCES `faq` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_MSG_INTENT` FOREIGN KEY (`matched_intent_id`) REFERENCES `ai_intent` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_MSG_PATIENT` FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `CHK_MSG_SENDER` CHECK (`sender` in ('patient','ai')),
  CONSTRAINT `CHK_MSG_CONFIDENCE` CHECK (`confidence` is null or `confidence` between 0 and 1)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_message`
--

LOCK TABLES `ai_message` WRITE;
/*!40000 ALTER TABLE `ai_message` DISABLE KEYS */;
INSERT INTO `ai_message` VALUES (1,1,14,'patient','I need an appointment.',NULL,NULL,NULL,'2026-08-11 09:00:00'),(2,1,14,'ai','Which doctor would you like to see?',NULL,NULL,NULL,'2026-08-11 09:00:05'),(3,1,14,'patient','Dr. Ahmed.',NULL,NULL,NULL,'2026-08-11 09:01:00'),(4,1,14,'ai','Here are the available appointments...',NULL,NULL,NULL,'2026-08-11 09:01:05'),(5,2,21,'patient','I have been feeling dizzy lately.',NULL,NULL,NULL,'2026-08-11 10:00:00'),(6,2,21,'ai','I understand. Please describe when the dizziness started and whether you are on any medication.',NULL,NULL,NULL,'2026-08-11 10:00:10'),(7,2,21,'patient','It started 3 days ago after my new prescription.',NULL,NULL,NULL,'2026-08-11 10:20:00'),(8,3,22,'patient','I would like to cancel an appointment.',NULL,NULL,NULL,'2026-08-10 14:00:00'),(9,3,22,'ai','Here are your upcoming appointments. Select the one you would like to cancel.',NULL,NULL,NULL,'2026-08-10 14:00:05');
/*!40000 ALTER TABLE `ai_message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_conversation`
--

DROP TABLE IF EXISTS `ai_conversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ai_conversation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_user_id` int(11) NOT NULL,
  `last_intent_id` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `title` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_CONV_PATIENT` (`patient_user_id`),
  KEY `IDX_CONV_STATUS` (`status`),
  KEY `IDX_CONV_CREATED` (`created_at`),
  KEY `FK_CONV_INTENT` (`last_intent_id`),
  CONSTRAINT `FK_CONV_INTENT` FOREIGN KEY (`last_intent_id`) REFERENCES `ai_intent` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_CONV_PATIENT` FOREIGN KEY (`patient_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `CHK_CONV_STATUS` CHECK (`status` in ('open','closed','abandoned'))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_conversation`
--

LOCK TABLES `ai_conversation` WRITE;
/*!40000 ALTER TABLE `ai_conversation` DISABLE KEYS */;
INSERT INTO `ai_conversation` VALUES (1,14,NULL,'closed','Appointment booking','2026-08-11 09:00:00','2026-08-11 09:15:00','2026-08-11 09:15:00'),(2,21,NULL,'open','General inquiry','2026-08-11 10:00:00','2026-08-11 10:20:00',NULL),(3,22,NULL,'abandoned','Cancelled flow','2026-08-10 14:00:00','2026-08-10 14:30:00','2026-08-10 14:30:00');
/*!40000 ALTER TABLE `ai_conversation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `follow_up_availability_slot`
--

DROP TABLE IF EXISTS `follow_up_availability_slot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `follow_up_availability_slot` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `follow_up_recommendation_id` int(11) NOT NULL,
  `available_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_recurring` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `IDX_FUAVAIL_FOLLOWUP` (`follow_up_recommendation_id`),
  KEY `IDX_FUAVAIL_DATE` (`available_date`),
  CONSTRAINT `FK_FUAVAIL_FOLLOWUP` FOREIGN KEY (`follow_up_recommendation_id`) REFERENCES `follow_up_recommendation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `follow_up_availability_slot`
--

LOCK TABLES `follow_up_availability_slot` WRITE;
/*!40000 ALTER TABLE `follow_up_availability_slot` DISABLE KEYS */;
/*!40000 ALTER TABLE `follow_up_availability_slot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_avatar_rate`
--

DROP TABLE IF EXISTS `user_avatar_rate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_avatar_rate` (
  `user_id` int(11) NOT NULL,
  `window_started_at` datetime NOT NULL,
  `upload_count` smallint(5) unsigned NOT NULL DEFAULT 0,
  `last_upload_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `FK_USER_AVATAR_RATE_USER` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_avatar_rate`
--

LOCK TABLES `user_avatar_rate` WRITE;
/*!40000 ALTER TABLE `user_avatar_rate` DISABLE KEYS */;
INSERT INTO `user_avatar_rate` VALUES (9,'2026-07-26 14:15:46',1,'2026-07-26 14:15:46');
/*!40000 ALTER TABLE `user_avatar_rate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_avatar`
--

DROP TABLE IF EXISTS `user_avatar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_avatar` (
  `user_id` int(11) NOT NULL,
  `mime` varchar(20) NOT NULL,
  `byte_size` int(10) unsigned NOT NULL,
  `width` smallint(5) unsigned NOT NULL,
  `height` smallint(5) unsigned NOT NULL,
  `sha256` char(64) NOT NULL,
  `access_key` char(32) NOT NULL,
  `data` mediumblob NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `UNIQ_USER_AVATAR_KEY` (`access_key`),
  CONSTRAINT `FK_USER_AVATAR_USER` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `CHK_USER_AVATAR_SIZE` CHECK (`byte_size` > 100 and `byte_size` <= 524288),
  CONSTRAINT `CHK_USER_AVATAR_DIMS` CHECK (`width` between 16 and 2048 and `height` between 16 and 2048),
  CONSTRAINT `CHK_USER_AVATAR_MIME` CHECK (`mime` in ('image/png','image/jpeg'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_avatar`
--

LOCK TABLES `user_avatar` WRITE;
/*!40000 ALTER TABLE `user_avatar` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_avatar` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14  1:25:31
