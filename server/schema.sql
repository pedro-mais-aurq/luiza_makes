CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`duration` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`service` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`unread` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_date` ON `appointments` (`date`);--> statement-breakpoint
CREATE INDEX `idx_appointments_phone` ON `appointments` (`phone`);--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `occupancy` (
	`date` text NOT NULL,
	`minute` integer NOT NULL,
	`appointment_id` text NOT NULL,
	PRIMARY KEY(`date`, `minute`),
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX idx_sessions_expires ON sessions(expires);
