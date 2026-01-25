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
    extractedText: text('extracted_text'), // OCR'd / full-text
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

// Prepared statement for FTS document count
export const getDocumentsFtsCountQuery = (searchQuery: string, organizationId: string) => sql`
    SELECT COUNT(*) as total
    FROM documents d
    INNER JOIN documents_fts fts ON d.id = fts.documentId
    WHERE fts MATCH ${searchQuery}
      AND d.organization_id = ${organizationId}
`;

/**
 * Creates a prepared SQL statement for FTS search results with snippets
 * @param searchQuery - The FTS search query string
 * @param organizationId - The organization ID to filter by
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 */
export const getDocumentsFtsSearchQuery = (
    searchQuery: string,
    organizationId: string,
    limit: number,
    offset: number
) => sql`
    SELECT d.id,
           d.title,
           d.file_name,
           d.document_type,
           d.status,
           d.created_at,
           d.updated_at,
           snippet(documents_fts, 2, '<mark>', '</mark>', '...', 10) as snippet,
           rank as score
    FROM documents d
    INNER JOIN documents_fts fts ON d.id = fts.documentId
    WHERE fts MATCH ${searchQuery}
      AND d.organization_id = ${organizationId}
    ORDER BY rank
    LIMIT ${limit} OFFSET ${offset}
`;

