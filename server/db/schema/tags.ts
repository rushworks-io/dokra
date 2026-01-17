import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  color: text('color').default('#3b82f6').notNull(),
  category: text('category').default('general').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('tags_org_idx').on(table.organizationId),
  index('tags_name_idx').on(table.name),
  index('tags_category_idx').on(table.category),
  index('tags_org_name_idx').on(table.organizationId, table.name),
]);
