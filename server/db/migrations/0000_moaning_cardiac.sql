CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`r2_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text,
	`file_size` integer,
	`extracted_text` text,
	`document_type` text,
	`due_date` text,
	`reminder_days_before_due` integer DEFAULT 7,
	`tags` text,
	`metadata` text,
	`processed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_org_idx` ON `documents` (`organization_id`);--> statement-breakpoint
CREATE INDEX `documents_type_idx` ON `documents` (`document_type`);--> statement-breakpoint
CREATE INDEX `documents_due_date_idx` ON `documents` (`due_date`);--> statement-breakpoint
CREATE INDEX `documents_created_idx` ON `documents` (`created_at`);--> statement-breakpoint
CREATE TABLE `organization_users` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `org_users_org_idx` ON `organization_users` (`organization_id`);--> statement-breakpoint
CREATE INDEX `org_users_user_idx` ON `organization_users` (`user_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `organizations_slug_idx` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `organizations_owner_idx` ON `organizations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'blue',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tags_org_idx` ON `tags` (`organization_id`);--> statement-breakpoint
CREATE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);