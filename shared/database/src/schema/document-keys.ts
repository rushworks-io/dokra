import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { documents } from './documents';

export const documentKeys = sqliteTable('document_keys', {
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    encryptedDek: text('encrypted_dek').notNull(),   // DEK encrypted with Org KEK
    dekIv: text('dek_iv').notNull(),
    dekTag: text('dek_tag').notNull(),
    // File encryption metadata (IV and tag used for encrypting the actual file content)
    fileIv: text('file_iv'),
    fileTag: text('file_tag'),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index('doc_keys_org_idx').on(table.organizationId),
    index('doc_keys_doc_idx').on(table.documentId),
]);
