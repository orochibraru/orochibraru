PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`project` text NOT NULL,
	`name` text NOT NULL,
	`channel` text DEFAULT 'latest' NOT NULL,
	`source_sha` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `project`(`repo`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `image`;--> statement-breakpoint
ALTER TABLE `__new_image` RENAME TO `image`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `image_project_channel_name_unique` ON `image` (`project`,`channel`,`name`);--> statement-breakpoint
-- the old rows had no URL to keep: reconcile sees every docs channel as stale and syncs them back
UPDATE `docs_version` SET `sha` = '';
