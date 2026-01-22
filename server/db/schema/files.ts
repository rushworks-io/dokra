import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Files table for tracking uploaded files in R2 storage.
 * Stores metadata about files including their R2 keys, sizes, and types.
 */
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  documentId: text('document_id'), // Optional link to a document

  // File metadata
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),

  // R2 storage info
  r2Key: text('r2_key').notNull().unique(),
  r2Bucket: text('r2_bucket').notNull().default('dokra-files'),

  // Upload tracking
  uploadedBy: text('uploaded_by').notNull(), // User ID who uploaded
  uploadedAt: text('uploaded_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),

  // Status tracking
  status: text('status').notNull().default('active'), // active, deleted, processing

  // Timestamps
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('files_org_idx').on(table.organizationId),
  index('files_document_idx').on(table.documentId),
  index('files_r2_key_idx').on(table.r2Key),
  index('files_uploaded_by_idx').on(table.uploadedBy),
  index('files_status_idx').on(table.status),
]);

