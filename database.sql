CREATE DATABASE IF NOT EXISTS bible_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bible_system;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  reference VARCHAR(200) NOT NULL,
  verse_text TEXT NOT NULL,
  translation VARCHAR(60) NOT NULL DEFAULT 'WEB',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_reference (user_id, reference),
  KEY favorites_user_created (user_id, created_at),
  CONSTRAINT favorites_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS search_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  query VARCHAR(250) NOT NULL,
  preview VARCHAR(500) NULL,
  type ENUM('reference','keyword') NOT NULL DEFAULT 'reference',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY history_user_created (user_id, created_at),
  CONSTRAINT history_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
