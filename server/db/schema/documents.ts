import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  title: text('title').notNull(),
  r2Key: text('r2_key').notNull(), // Path in R2
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  extractedText: text('extracted_text'), // OCR'd / full-text
  documentType: text('document_type'), // Gemma-classified: invoice, contract, etc.
  dueDate: text('due_date'), // ISO date
  reminderDaysBeforeDue: integer('reminder_days_before_due').default(7),
  tags: text('tags'), // JSON array
  metadata: text('metadata'), // JSON custom fields
  processedAt: text('processed_at'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('documents_org_idx').on(table.organizationId),
  index('documents_type_idx').on(table.documentType),
  index('documents_due_date_idx').on(table.dueDate),
  index('documents_created_idx').on(table.createdAt),
]);

