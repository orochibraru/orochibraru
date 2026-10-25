CREATE TABLE `sync_job` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo` text NOT NULL,
	`sha` text,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`changed` integer DEFAULT 0 NOT NULL,
	`error` text,
	`queued_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`run_after` integer,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_job_one_queued` ON `sync_job` (`repo`) WHERE "sync_job"."status" = 'queued';