CREATE TABLE `docs_version` (
	`project` text NOT NULL,
	`channel` text DEFAULT 'latest' NOT NULL,
	`ref` text NOT NULL,
	`sha` text NOT NULL,
	`config` text,
	PRIMARY KEY(`project`, `channel`),
	FOREIGN KEY (`project`) REFERENCES `project`(`repo`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX `image_project_name_unique`;--> statement-breakpoint
ALTER TABLE `image` ADD `channel` text DEFAULT 'latest' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `image_project_channel_name_unique` ON `image` (`project`,`channel`,`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guide` (
	`project` text NOT NULL,
	`channel` text DEFAULT 'latest' NOT NULL,
	`slug` text NOT NULL,
	`markdown` text NOT NULL,
	`source_path` text NOT NULL,
	`sha` text NOT NULL,
	PRIMARY KEY(`project`, `channel`, `slug`),
	FOREIGN KEY (`project`) REFERENCES `project`(`repo`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guide`("project", "slug", "markdown", "source_path", "sha") SELECT "project", "slug", "markdown", "source_path", "sha" FROM `guide`;--> statement-breakpoint
DROP TABLE `guide`;--> statement-breakpoint
ALTER TABLE `__new_guide` RENAME TO `guide`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
INSERT INTO `docs_version`("project", "channel", "ref", "sha", "config") SELECT "repo", 'latest', coalesce("default_branch", 'main'), "docs_synced_sha", "docs_config" FROM `project` WHERE "docs_synced_sha" IS NOT NULL;--> statement-breakpoint
ALTER TABLE `project` DROP COLUMN `docs_config`;--> statement-breakpoint
ALTER TABLE `project` DROP COLUMN `docs_synced_sha`;