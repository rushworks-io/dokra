# Database Schema

Dokra uses **Drizzle ORM** with **Cloudflare D1** (SQLite). Schema files in `/server/db/schema/`.

---

## Core Tables

### organizations
Tenants/workspaces. Each org is a document collection with own members, tags, docs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key (uuid) |
| `name` | text | Org name |
| `ownerId` | text | User ID of owner (FK → users.id) |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |

**Indexes**: `owner_id`

---

### organization_users
Membership table. Links users to orgs with roles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key (uuid) |
| `organizationId` | text | FK → organizations.id |
| `userId` | text | FK → users.id |
| `role` | text | owner, admin, member, viewer |
| `createdAt` | text | ISO timestamp |

**Indexes**: `org_id`, `user_id`, composite `(org_id, user_id)`

---

### documents
Main document records. Metadata + references to R2 storage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key (uuid) |
| `organizationId` | text | FK → organizations.id |
| `title` | text | Display name |
| `r2Key` | text | Path in R2 bucket (unique) |
| `fileName` | text | Original filename |
| `mimeType` | text | MIME type (application/pdf, etc.) |
| `fileSize` | integer | Bytes |
| `uploadedBy` | text | FK → users.id |
| `extractedText` | text | OCR or parsed full text (for search) |
| `documentType` | text | Classified type: invoice, contract, receipt, etc. |
| `status` | text | inbox, verified, archived (default: inbox) |
| `dueDate` | text | ISO date (nullable) |
| `reminderDaysBeforeDue` | integer | Days before due to send reminder (default: 7) |
| `tags` | text | Deprecated field (use document_tags join table) |
| `metadata` | text | JSON custom fields |
| `processedAt` | text | When AI classification ran |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |

**Indexes**: `org_id`, `type`, `status`, `due_date`, `created`, `r2_key`, `uploaded_by`

**Why separate `title` and `fileName`?** Title is user-facing and editable; fileName is original for display/export.

---

### documents (Status Lifecycle)

```
inbox (default on upload)
  ↓
verified (user confirmed)
  ↓
archived (no longer active)
  ↓
[deleted - soft delete via status flag]
```

---

### files
Tracks individual file uploads (can be multiple per document via re-uploads).

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key (uuid) |
| `organizationId` | text | FK → organizations.id |
| `documentId` | text | FK → documents.id (nullable, standalone upload) |
| `fileName` | text | Generated/sanitized name |
| `originalName` | text | Original uploaded name |
| `mimeType` | text | MIME type |
| `fileSize` | integer | Bytes |
| `r2Key` | text | Path in R2 (unique) |
| `r2Bucket` | text | Bucket name (default: dokra-files) |
| `uploadedBy` | text | FK → users.id |
| `uploadedAt` | text | ISO timestamp |
| `status` | text | active, deleted, processing (default: active) |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |

**Indexes**: `org_id`, `document_id`, `r2_key`, `uploaded_by`, `status`

---

### tags
Organization-scoped tags for document categorization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key (uuid) |
| `organizationId` | text | FK → organizations.id |
| `name` | text | Tag label (e.g., "Invoice") |
| `color` | text | Hex color (default: #3b82f6) |
| `createdAt` | text | ISO timestamp |
| `updatedAt` | text | ISO timestamp |

**Indexes**: `org_id`, `name`, composite `(org_id, name)` for fast unique name checks

---

### document_tags
Join table: many-to-many link between documents and tags.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key (uuid) |
| `documentId` | text | FK → documents.id |
| `tagId` | text | FK → tags.id |
| `createdAt` | text | ISO timestamp |

**Indexes**: `document_id`, `tag_id`, composite `(document_id, tag_id)`

---

### BetterAuth Tables

BetterAuth manages these automatically (via `/server/db/schema/auth.ts`):

- **users**: User accounts (id, email, name, image, emailVerified, createdAt, updatedAt)
- **sessions**: Active sessions (id, userId, expiresAt, token, createdAt, updatedAt)
- **accounts**: OAuth provider links (id, userId, accountId, providerId, accessToken, refreshToken, accessTokenExpiresAt, createdAt, updatedAt)
- **verifications**: Email verification tokens (id, identifier, value, expiresAt)

---

## Key Relationships

```
organizations (1) ──────→ (M) organization_users → (M) users
                              ↓
                        documents
                            ↓
                      document_tags (many-to-many)
                            ↓
                           tags

files
  ↓
  └──→ (optional) documents
       └──→ organizations
```

---

## Migrations

Migrations live in `/server/db/migrations/` and are auto-generated by Drizzle Kit.

```bash
pnpm db:generate    # Generate migrations from schema changes
pnpm db:migrate     # Apply to local D1
pnpm db:migrate:prod  # Apply to production D1
```

**Migration Timeline**:
- `0000_moaning_cardiac.sql`: Initial schema (orgs, org_users, documents, tags)
- `0001_yummy_blacklash.sql`: Add files table
- `0002_tiresome_excalibur.sql`: Add document_tags join table
- `0003_remove-slug.sql`: Remove slug field from documents
- `0004_add-document-status.sql`: Add status enum to documents
- `0005_add-uploaded-by-to-documents.sql`: Add uploadedBy FK
- `0006_add-tags-junction.sql`: Formalize tag relationships
- `0007_remove-tags-category.sql`: Clean up old tag fields

---

## Performance Considerations

### Indexing Strategy
- **Org queries**: Index `org_id` on all tables (filter by tenant)
- **Search**: Index `created_at` for recent documents; `extractedText` for full-text search
- **Status filters**: Index `status` for quick inbox/archived lookups
- **User tracking**: Index `uploaded_by` for user-specific dashboards

### Query Patterns
```typescript
// List org documents with filters
SELECT * FROM documents 
WHERE organization_id = ? 
  AND status = ? 
ORDER BY created_at DESC 
LIMIT 50;

// Get document with tags
SELECT d.*, array_agg(t.name) 
FROM documents d
LEFT JOIN document_tags dt ON d.id = dt.document_id
LEFT JOIN tags t ON dt.tag_id = t.id
WHERE d.id = ?;

// Search + filter by tag
SELECT d.* FROM documents d
WHERE d.organization_id = ?
  AND (d.title LIKE ? OR d.extracted_text LIKE ?)
  AND d.id IN (SELECT dt.document_id FROM document_tags dt WHERE dt.tag_id IN (...))
LIMIT 25;
```

### Scaling Notes
- D1 is serverless SQLite; no connection pooling. Each request is isolated.
- Keep `extractedText` indexed for fast full-text search (or migrate to external search index later).
- For very large orgs, consider archiving old documents or pagination.
- R2 file keys use org+doc structure for easy namespace separation: `{orgId}/{docId}/{fileName}`.

---

## Type System

Drizzle generates TypeScript from schema. Import types:

```typescript
import type { documents, tags, organizations } from '~/server/db/schema';

// Inference
type Document = typeof documents.$inferSelect;
type NewDocument = typeof documents.$inferInsert;
```

See `/types/` for custom types (e.g., `Document`, `Tag`, `Organization`).

