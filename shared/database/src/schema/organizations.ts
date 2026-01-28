import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  encryptedKek: text('encrypted_kek'),     // Org KEK encrypted by System Secret
  kekIv: text('kek_iv'),                   // IV for org KEK encryption
  kekTag: text('kek_tag'),                 // Auth tag
  kekCreatedAt: text('kek_created_at'),    // Track key age
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('organizations_owner_idx').on(table.ownerId),
]);

