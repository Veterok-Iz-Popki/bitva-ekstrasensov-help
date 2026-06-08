CREATE TABLE `admin_users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `applications` (
  `id` varchar(36) NOT NULL,
  `lastName` varchar(255) NOT NULL DEFAULT '',
  `firstName` varchar(255) NOT NULL DEFAULT '',
  `patronymic` varchar(255) NOT NULL DEFAULT '',
  `name` varchar(500) DEFAULT '',
  `phone` varchar(100) NOT NULL DEFAULT '',
  `age` varchar(50) DEFAULT '',
  `city` varchar(255) DEFAULT '',
  `problem` text DEFAULT NULL,
  `psychic_slug` varchar(255) DEFAULT '',
  `psychic_name` varchar(255) DEFAULT '',
  `status` varchar(50) DEFAULT 'new',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `contact_messages` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) DEFAULT '',
  `email` varchar(255) DEFAULT '',
  `message` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'new',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `faq` (
  `id` varchar(36) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `gallery_photos` (
  `id` varchar(36) NOT NULL,
  `image_url` text DEFAULT '',
  `title` varchar(255) DEFAULT '',
  `description` text DEFAULT '',
  `alt_text` varchar(500) DEFAULT '',
  `order` int(11) DEFAULT 0,
  `is_published` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `gallery_videos` (
  `id` varchar(36) NOT NULL,
  `video_url` text DEFAULT '',
  `title` varchar(255) DEFAULT '',
  `description` text DEFAULT '',
  `thumbnail_url` text DEFAULT '',
  `order` int(11) DEFAULT 0,
  `is_published` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `processing_status` varchar(20) DEFAULT 'idle',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `pages` (
  `id` varchar(36) NOT NULL,
  `page_slug` varchar(255) NOT NULL,
  `blocks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`blocks`)),
  `updated_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `page_slug` (`page_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `participants` (
  `id` varchar(36) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT '',
  `description` text DEFAULT NULL,
  `full_description` text DEFAULT NULL,
  `photo_url` text DEFAULT '',
  `specializations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specializations`)),
  `is_active` tinyint(1) DEFAULT 1,
  `order` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `reviews` (
  `id` varchar(36) NOT NULL,
  `participant_slug` varchar(255) DEFAULT '',
  `author_name` varchar(255) NOT NULL,
  `author_city` varchar(255) DEFAULT '',
  `text` text DEFAULT NULL,
  `rating` int(11) DEFAULT 5,
  `is_published` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_participant_slug` (`participant_slug`),
  KEY `idx_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `seo_settings` (
  `id` varchar(36) NOT NULL,
  `page_slug` varchar(255) NOT NULL,
  `title` varchar(500) DEFAULT '',
  `description` text DEFAULT '',
  `keywords` text DEFAULT '',
  `h1` varchar(500) DEFAULT '',
  `og_title` varchar(500) DEFAULT '',
  `og_description` text DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `page_slug` (`page_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `site_settings` (
  `id` varchar(50) NOT NULL DEFAULT 'site_settings',
  `email` varchar(255) DEFAULT '',
  `phone` varchar(100) DEFAULT '',
  `address` text DEFAULT '',
  `notification_email` varchar(255) DEFAULT '',
  `working_hours` varchar(255) DEFAULT '',
  `copyright_text` varchar(500) DEFAULT '',
  `email_notifications_enabled` tinyint(1) DEFAULT 1,
  `logo_url` text DEFAULT '',
  `logo_alt` varchar(255) DEFAULT 'Битва Экстрасенсов',
  `logo_height_desktop` int(11) DEFAULT 56,
  `logo_height_mobile` int(11) DEFAULT 48,
  `seo_indexing_enabled` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
