CREATE TABLE `deleted_post` (
	`slug` text PRIMARY KEY NOT NULL,
	`deleted_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
