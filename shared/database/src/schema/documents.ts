import {sqliteTable, text, integer, index} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';

export const documents = sqliteTable('documents', {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull(),
    title: text('title').notNull(),
    r2Key: text('r2_key').notNull().unique(), // Path in R2
    fileName: text('file_name').notNull(), // Original filename for display
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),
    uploadedBy: text('uploaded_by').notNull(), // User ID who uploaded
    encryptedOcrContent: text('encrypted_ocr_content'), // AES-GCM encrypted raw text, Base64 encoded
    ocrIv: text('ocr_iv'), // IV for OCR encryption
    ocrTag: text('ocr_tag'), // Auth tag for OCR encryption
    documentType: text('document_type'), // Gemma-classified: invoice, contract, etc.
    status: text('status').notNull().default('inbox'), // inbox, verified, archived, ocr_pending, processing, ocr_failed
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
    index('documents_status_idx').on(table.status),
    index('documents_due_date_idx').on(table.dueDate),
    index('documents_created_idx').on(table.createdAt),
    index('documents_r2_key_idx').on(table.r2Key),
    index('documents_uploaded_by_idx').on(table.uploadedBy),
]);

export const documentsFts = sqliteTable('documents_fts', {
    documentId: text('documentId'),
    content: text('content'),
    rank: integer('rank'),
});


