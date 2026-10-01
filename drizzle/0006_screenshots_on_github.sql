CREATE TABLE `projects_page` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`tag` text NOT NULL,
	`heading` text NOT NULL,
	`accent` text NOT NULL,
	`intro` text NOT NULL,
	`others` text NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sha256` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`project` text,
	`name` text,
	`channel` text DEFAULT 'latest' NOT NULL,
	`source_sha` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `project`(`repo`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_image`("id", "sha256", "width", "height", "alt", "source", "project", "name", "channel", "source_sha", "created_at") SELECT "id", "sha256", "width", "height", "alt", "source", "project", "name", "channel", "source_sha", "created_at" FROM `image`;--> statement-breakpoint
DROP TABLE `image`;--> statement-breakpoint
ALTER TABLE `__new_image` RENAME TO `image`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `image_project_channel_name_unique` ON `image` (`project`,`channel`,`name`);--> statement-breakpoint
UPDATE `image` SET `sha256` = NULL WHERE `source` = 'sync';
