-- Remove the category column from tags table
-- SQLite doesn't support DROP COLUMN directly in older versions,
-- so we need to recreate the table

-- Drop the category index first
DROP INDEX IF EXISTS `tags_category_idx`;

-- Create new table without category column
CREATE TABLE `tags_new` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `name` text NOT NULL,
  `color` text DEFAULT '#3b82f6' NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

-- Copy data from old table to new table
INSERT INTO `tags_new` (`id`, `organization_id`, `name`, `color`, `created_at`, `updated_at`)
SELECT `id`, `organization_id`, `name`, `color`, `created_at`, `updated_at` FROM `tags`;

-- Drop old table
DROP TABLE `tags`;

-- Rename new table to original name
ALTER TABLE `tags_new` RENAME TO `tags`;

-- Recreate indexes
CREATE INDEX `tags_org_idx` ON `tags` (`organization_id`);
CREATE INDEX `tags_name_idx` ON `tags` (`name`);
CREATE INDEX `tags_org_name_idx` ON `tags` (`organization_id`, `name`);
