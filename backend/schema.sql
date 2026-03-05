-- MariaDB schema for psychic_battle
USE psychic_battle;

CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(36) PRIMARY KEY,
  lastName VARCHAR(255) NOT NULL DEFAULT '',
  firstName VARCHAR(255) NOT NULL DEFAULT '',
  patronymic VARCHAR(255) NOT NULL DEFAULT '',
  name VARCHAR(500) DEFAULT '',
  phone VARCHAR(100) NOT NULL DEFAULT '',
  age VARCHAR(50) DEFAULT '',
  city VARCHAR(255) DEFAULT '',
  problem TEXT,
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS participants (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) DEFAULT '',
  description TEXT,
  full_description TEXT,
  photo_url TEXT DEFAULT '',
  specializations JSON,
  is_active BOOLEAN DEFAULT TRUE,
  `order` INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY,
  participant_slug VARCHAR(255) DEFAULT '',
  author_name VARCHAR(255) NOT NULL,
  author_city VARCHAR(255) DEFAULT '',
  text TEXT,
  rating INT DEFAULT 5,
  is_published BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_participant_slug (participant_slug),
  INDEX idx_published (is_published)
);

CREATE TABLE IF NOT EXISTS faq (
  id VARCHAR(36) PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  `order` INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pages (
  id VARCHAR(36) PRIMARY KEY,
  page_slug VARCHAR(255) NOT NULL UNIQUE,
  blocks JSON,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_settings (
  id VARCHAR(36) PRIMARY KEY,
  page_slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500) DEFAULT '',
  description TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  h1 VARCHAR(500) DEFAULT '',
  og_title VARCHAR(500) DEFAULT '',
  og_description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS site_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'site_settings',
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(100) DEFAULT '',
  address TEXT DEFAULT '',
  notification_email VARCHAR(255) DEFAULT '',
  working_hours VARCHAR(255) DEFAULT '',
  copyright_text VARCHAR(500) DEFAULT '',
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  logo_url TEXT DEFAULT '',
  logo_alt VARCHAR(255) DEFAULT 'Битва Экстрасенсов',
  logo_height_desktop INT DEFAULT 56,
  logo_height_mobile INT DEFAULT 48
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id VARCHAR(36) PRIMARY KEY,
  image_url TEXT DEFAULT '',
  title VARCHAR(255) DEFAULT '',
  description TEXT DEFAULT '',
  alt_text VARCHAR(500) DEFAULT '',
  `order` INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery_videos (
  id VARCHAR(36) PRIMARY KEY,
  video_url TEXT DEFAULT '',
  title VARCHAR(255) DEFAULT '',
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  `order` INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  message TEXT,
  status VARCHAR(50) DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
