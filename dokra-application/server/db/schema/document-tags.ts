import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const documentTags = sqliteTable('document_tags', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  documentId: text('document_id').notNull(),
  tagId: text('tag_id').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('document_tags_org_idx').on(table.organizationId),
  index('document_tags_document_idx').on(table.documentId),
  index('document_tags_tag_idx').on(table.tagId),
]);
