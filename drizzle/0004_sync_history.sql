CREATE TABLE `sync_change` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`path` text NOT NULL,
	`kind` text NOT NULL,
	`diff` text,
	FOREIGN KEY (`run_id`) REFERENCES `sync_run`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `sync_run` ADD `channel` text;