CREATE TABLE `future_books` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `future_invites` (
	`hash` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`slot` integer DEFAULT 2 NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `future_books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `future_invite_book` ON `future_invites` (`book_id`);--> statement-breakpoint
CREATE TABLE `future_members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`slot` integer NOT NULL,
	`display_name` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `future_books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `future_member_slot` ON `future_members` (`book_id`,`slot`);--> statement-breakpoint
CREATE INDEX `future_member_book` ON `future_members` (`book_id`);