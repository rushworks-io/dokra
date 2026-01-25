# Document Management System – Complete Project Guide

**Project**: Open-source, self-hosted document archiving platform  
**Tech Stack**: Nuxt 4, Cloudflare (Workers/Pages/D1/R2/Queues), Drizzle ORM, BetterAuth, Tailwind CSS v4 + DaisyUI v5  
**LLM**: Gemma 3–270M for document classification and metadata extraction  
**Status**: Phase 1 MVP (Document upload + search + auth + basic tagging) — ~70% complete

---

## Table of Contents

1. [Quick Links](#quick-links)
2. [Project Vision](#project-vision)
3. [Architecture Overview](#architecture-overview)
4. [Tech Stack Details](#tech-stack-details)
5. [Implementation Status](#implementation-status)
6. [Database Schema](#database-schema)
7. [Phase Roadmap](#phase-roadmap)
8. [Feature Prioritization Matrix](#feature-prioritization-matrix)
9. [Cloudflare Infrastructure](#cloudflare-infrastructure)
10. [Development Workflow](#development-workflow)
11. [Testing Strategy](#testing-strategy)

---

## Quick Links

**📖 Essential Documentation**:

- [API Reference](./API-REFERENCE.md) — All endpoints, request/response formats, error handling
- [Database Schema](./DATABASE-SCHEMA.md) — Tables, relationships, indexes, migrations
- [Deployment Guide](./DEPLOYMENT.md) — Setup Cloudflare, local dev, production deploy
- [Development Guide](./DEVELOPMENT-GUIDE.md) — Project structure, composables, patterns, contributing
- [Testing Guide](./testing.md) — Running tests, unit/integration/e2e setup
- [App Style Guide](./app-style-guide.md) — UI/UX principles, component behavior
- [Dashboard Layout Plan](./dashboard-layout-plan.md) — Frontend layout architecture

---

## Project Vision

Build a **privacy-first, self-hosted document archiving platform** that is:

- **Minimalist by design**: fast, simple, keyboard-friendly, get-out-of-your-way UX.
- **Powerful when needed**: extensible, automatable, supports power-user workflows and team collaboration.
- **LLM-augmented**: Gemma 3–270M for intelligent document classification, metadata extraction, and suggestions.
- **Fully Cloudflare-native**: no external infrastructure except optional self-hosted on Cloudflare Pages/Workers.

**Core user jobs to solve**:

1. **Ingest** documents from multiple sources (upload, email, CLI, folder watch).
2. **Organize** with minimal friction (tags, metadata, smart folders).
3. **Search** with confidence (full-text + semantic + filters).
4. **Act** on documents (reminders, bulk operations, rule-based automation).
5. **Share** within orgs/teams securely.

---

## Implementation Status

### Phase 1 MVP: ~70% Complete

| Component             | Status         | Notes                                                                    |
|-----------------------|----------------|--------------------------------------------------------------------------|
| **Infrastructure**    | ✅ Done         | Nuxt 4 + Nitro on Cloudflare, D1 + R2 setup, Drizzle ORM configured      |
| **Authentication**    | ✅ Done         | BetterAuth email/password login, session management, org-scoped access   |
| **Core DB Schema**    | ✅ Done         | organizations, documents, files, tags, document_tags tables + migrations |
| **Document Upload**   | ✅ Done         | Multipart file upload to R2, metadata stored in D1                       |
| **Document List API** | ✅ Done         | GET /api/documents with filters (search, type, status, tags)             |
| **Search**            | ⚙️ In Progress | Full-text search on `extractedText`, frontend composable ready           |
| **Tagging**           | ✅ Done         | Tag CRUD + document_tags join table, API endpoints                       |
| **Frontend UI**       | ⚙️ In Progress | Dashboard layout, document table, search bar, sidebar — mostly styled    |
| **Tests**             | ⚙️ Partial     | Unit test structure in place, need more endpoint + composable coverage   |

### Not Yet Started (Phase 2+)

- Email ingestion + folder watch
- OCR pipeline (Cloudflare Queues)
- Gemma classification integration
- Reminder system + notifications
- Multi-user roles + fine-grained ACLs
- Rule engine for automation
- CLI agent

---

```
┌─────────────────────────────────────────────────────────────────┐
│                      Nuxt 4 Frontend (SSR)                       │
│           Tailwind CSS v4 + DaisyUI v5 Components                │
│        Running on Cloudflare Workers/Pages (Nitro preset)        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
        ▼                      ▼
┌──────────────────┐   ┌─────────────────┐
│  Nitro API       │   │  BetterAuth     │
│  (Server Routes) │   │  (Sessions)     │
└────────┬─────────┘   └────────┬────────┘
         │                      │
    ┌────┴──────────────────────┴────┐
    │                                 │
    ▼                                 ▼
┌──────────────────┐      ┌──────────────────────┐
│ Cloudflare D1    │      │ Cloudflare R2        │
│ (Metadata via    │      │ (Document Storage)   │
│  Drizzle ORM)    │      └──────────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Cloudflare Queues + Durable Objects     │
│  (Background jobs, reminders, workers)   │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Gemma 3–270M Classification Workers     │
│  (Document type, metadata extraction)    │
└──────────────────────────────────────────┘
```

**Key principles**:

- All state in D1 (via Drizzle); files in R2.
- Background processing via Cloudflare Queues; no external job runners.
- LLM calls from within Workers (edge latency friendly) or maybe on user device (since its a small model).

---

## Tech Stack Details

### Frontend & SSR

| Technology          | Purpose               | Notes                                             |
|---------------------|-----------------------|---------------------------------------------------|
| **Nuxt 4**          | Full-stack framework. |
| **Tailwind CSS v4** | Styling               | Modern utility-first CSS.                         |
| **DaisyUI v5**      | Component library     | Pre-built, accessible, theme-friendly components. |
| **nuxt-test-utils** | Testing               | Component and integration testing for SPA flows.  |
| **TypeScript**      | Language              | Type safety across frontend and backend.          |

### Backend & Database

| Technology        | Purpose              | Notes                                                                          |
|-------------------|----------------------|--------------------------------------------------------------------------------|
| **Nitro**         | Server runtime       | Handles API routes, middleware, server composables.                            |
| **BetterAuth**    | Authentication       | Email/password + OAuth (Google, Apple). Session management via secure cookies. |
| **Drizzle ORM**   | Database abstraction | Type-safe queries; schema migrations; Cloudflare D1 driver.                    |
| **Cloudflare D1** | Relational DB        | SQLite-compatible serverless SQL; single request per query.                    |

### Storage & Files

| Technology        | Purpose      | Notes                                                    |
|-------------------|--------------|----------------------------------------------------------|
| **Cloudflare R2** | Blob storage | Document originals and derived files (PDFs, OCR'd text). |

> Note: The project now uses a server-side streaming proxy for all file retrievals (no browser presigned URLs). The server exposes `/api/files/proxy/[id]`, `/api/documents/[id]/view`, and `/api/documents/[id]/download`. Proxy responses include `Cache-Control: private, max-age=3600`. The frontend uses native PDF embedding for inline viewing; `pdfjs-dist` has been removed from the default viewer to reduce bundle size.

### Background Jobs & Scheduling

| Technology            | Purpose                   | Notes                                           |
|-----------------------|---------------------------|-------------------------------------------------|
| **Cloudflare Queues** | Job queue                 | Decouple document processing from API requests. |
| **Durable Objects**   | Stateful workers + alarms | Reminder sweeps and periodic job scheduling.    |
| **Cron Triggers**     | Scheduled tasks           | Optional; use for daily reminder scans.         |

### LLM & Classification

| Technology            | Purpose                 | Notes                                                                                       |
|-----------------------|-------------------------|---------------------------------------------------------------------------------------------|
| **Gemma 3–270M**      | Document classification | Run locally on Cloudflare Workers or external GPU; classify type, priority, correspondents. |
| **Ollama** (optional) | Local inference         | For self-hosted + dev environments.                                                         |

### Testing & Tooling

| Technology          | Purpose                  | Notes                                        |
|---------------------|--------------------------|----------------------------------------------|
| **nuxt-test-utils** | Unit & integration tests | Test components, server routes, composables. |
| **Vitest**          | Test runner              | Fast, ESM-native testing.                    |
| **GitHub Actions**  | CI/CD                    | Lint, test, and deploy on push.              |

---

## Database Schema

### Core Tables (Drizzle Schema)

```typescript
// organizations.ts
export const organizations = sqliteTable('organizations', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// users.ts
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    email: text('email').unique().notNull(),
    name: text('name'),
    role: text('role').default('user'), // 'owner', 'member', 'viewer'
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// organizations_users.ts (join table for multi-user organizations)
export const organizationUsers = sqliteTable('organization_users', {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').default('member'), // 'owner', 'member', 'viewer'
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// documents.ts
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
    tags: text('tags'), // JSON array or comma-separated
    metadata: text('metadata'), // JSON custom fields
    processedAt: text('processed_at'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// tags.ts
export const tags = sqliteTable('tags', {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    color: text('color').default('blue'), // For UI
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// jobs.ts (processing pipeline)
export const jobs = sqliteTable('jobs', {
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull(),
    type: text('type').notNull(), // 'ocr', 'classify', 'extract_metadata'
    status: text('status').default('pending'), // pending, processing, done, failed
    result: text('result'), // JSON result or error
    retries: integer('retries').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// reminders.ts (for Phase 4)
export const reminders = sqliteTable('reminders', {
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull(),
    organizationId: text('organization_id').notNull(),
    userId: text('user_id'),
    reminderType: text('reminder_type'), // 'due_soon', 'overdue', 'custom'
    scheduledFor: text('scheduled_for').notNull(), // ISO datetime
    sent: integer('sent').default(0),
    channel: text('channel').default('email'), // email, push, in-app
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// search_cache.ts (optional, for performance)
export const searchCache = sqliteTable('search_cache', {
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull(),
    searchVector: text('search_vector'), // Simplified; for later vector search
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
```

### Schema Design Notes

- **Denormalization**: `extractedText` and `metadata` stored as text/JSON on documents for fast queries.
- **Auditing**: `createdAt`, `updatedAt` on all tables; consider adding `deletedAt` for soft deletes.
- **Relationships**: Foreign keys via text IDs (Drizzle ORM relations); no enforcement at SQL layer for simplicity.
- **Phase 4 readiness**: `reminders`, `dueDate`, `reminderDaysBeforeDue` columns present from the start.

---

## Phase Roadmap

### Phase 1: MVP (Core Foundation)

**Goal**: Minimalist, searchable document archive with org scoping and basic auth.

**Key features**:

- Central document archive: upload PDF/images.
- Organizations (personal/family/work) with owner/member roles.
- Full-text search over OCR'd content.
- Basic tagging and metadata (title, date, type).
- Responsive UI with keyboard shortcuts.
- Drizzle ORM schema + D1 database.
- BetterAuth for email/password login.
- Optional: lightweight Gemma classification for document type.

**Out of scope**:

- Multi-user orgs (role-based) – basic single-owner for now.
- Email ingestion, folder watch, batch operations.
- Due dates and reminders.
- Advanced metadata or contacts.

---

### Phase 2: Robust Ingestion & Background Processing

**Goal**: Reliable multi-source document ingest and asynchronous processing pipeline.

**Key features**:

- Email ingestion: per-org inbox address → auto-import attachments.
- Folder watch via CLI agent that hits REST API.
- Cloudflare Queues for OCR, PDF/A conversion, Gemma classification.
- Inbox view: unprocessed docs for user confirmation.
- Job tracking: see processing status in UI.
- Multi-tenant job scheduling (org-level queue priorities).
- Gemma 3–270M for document type and priority classification.

**Database additions**:

- `jobs` table with status tracking.
- Enhancements to `documents` for classification results.

---

### Phase 3: Smart Organization

**Goal**: Rich metadata, power-user workflows, saved searches.

**Key features**:

- Custom metadata fields per org (e.g., invoice number, customer, policy ID).
- Contacts/correspondents: link docs to people or companies.
- Saved searches and smart folders (search + filter combos).
- Batch tagging, metadata editing, bulk delete.
- Gemma extraction of structured fields (invoice total, due date, sender).
- Advanced search query language (optional; basic filtering first).

**Database additions**:

- `contacts` table.
- `metadata_schemas` table (custom field definitions per org).
- `saved_searches` table.

---

### Phase 4: Automation, Reminders & Multi-user

**Goal**: Team collaboration, reminders, rule-based automation.

**Key features**:

- Due dates and reminders per document.
    - Configurable reminder windows (e.g., "remind 7 days before due").
    - Reminder sweep job via Durable Objects + Queues or Cron Workers (no external cron).
    - Email notifications for due-soon and overdue docs.
    - UI views: "Due Soon", "Overdue", "Done".
- Rule engine: if type = invoice → tag "Tax", assign to org "Business".
- Multi-user roles in shared orgs (owner, member, viewer) with fine-grained folder ACLs.
- Public REST API + personal access tokens.
- Weak active learning: suggest tags/rules based on user corrections.

**Database additions**:

- `reminders` table (scheduling + notification tracking).
- `rules` table (automation rules).
- `api_tokens` table (API key management).
- Enhancements to `organization_users` for fine-grained roles.

---

## Cloudflare Infrastructure

### Services in Use

| Service             | Purpose                   | Config Notes                             |
|---------------------|---------------------------|------------------------------------------|
| **Workers**         | Nuxt app + API            | Nitro preset `cloudflare`.               |
| **Pages**           | Static hosting            | Optional for static assets.              |
| **D1**              | SQL database              | Drizzle ORM driver.                      |
| **R2**              | Object storage            | Document originals + derivatives.        |
| **Queues**          | Job processing            | OCR, classification, reminders.          |
| **Durable Objects** | Stateful workers + alarms | Reminder sweeps, job scheduling.         |
| **KV**              | Key-value cache           | Optional: search cache, session tokens.  |
| **Email Routing**   | Email forwarding          | Catch doc-archive emails → your service. |

### Deployment Architecture

```
User Upload
    ↓
Nuxt (Workers) → Validate + Store in R2 → Enqueue OCR job
    ↓
Cloudflare Queues → Worker pulls job
    ↓
OCR Worker (tesseract/sharp) → Extract text → Update D1
    ↓
Enqueue Gemma classification job
    ↓
Gemma Worker → Classify → Update D1
    ↓
Durable Object alarm (daily) → Query D1 for due dates
    ↓
Enqueue reminder notifications
    ↓
Email Worker → Send email (via Mailchannels or similar)
```

---

## Development Workflow

### Local Setup

1. **Clone repo** and install dependencies:
   ```bash
   npm install
   ```

2. **Set up D1 locally**:
   ```bash
   npx wrangler d1 create doc-archive --local
   npx drizzle-kit generate:sqlite
   npx drizzle-kit migrate:sqlite --config drizzle.config.ts
   ```

3. **Run dev server**:
   ```bash
   npm run dev
   ```
   Nuxt + Nitro will start on `http://localhost:3000`.

4. **Drizzle Studio** (for local DB inspection):
   ```bash
   npx drizzle-kit studio
   ```

### Branch Strategy

- `main`: production-ready code.
- `develop`: staging/integration branch for phases.
- `feature/*`: individual issues/features.
- `bugfix/*`: bug fixes.

### Code Organization (_draft_)

```
project/
├── server/
│   ├── api/
│   │   ├── documents/
│   │   ├── auth/
│   │   ├── organizations/
│   │   └── ...
│   ├── db/
│   │   ├── schema.ts (Drizzle schema)
│   │   └── migrations/
│   ├── jobs/
│   │   ├── ocr-worker.ts
│   │   ├── classify-worker.ts
│   │   └── reminder-worker.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── rateLimit.ts
│   └── utils/
│       ├── auth.ts
│       ├── r2.ts
│       └── queue.ts
├── app/
│   ├── components/
│   │   ├── DocumentUpload.vue
│   │   ├── SearchBar.vue
│   │   └── ...
│   ├── pages/
│   │   ├── documents/
│   │   ├── inbox/
│   │   └── ...
│   ├── composables/
│   ├── utils/
│   └── app.vue
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── drizzle.config.ts
├── nuxt.config.ts
└── wrangler.toml
```

### Commit Conventions

Use conventional commits for clarity:

```
feat: add document upload UI
fix: correct OCR job retry logic
chore: update dependencies
docs: update deployment guide
test: add unit tests for search filter
ci: add GitHub Actions workflow
```

---

## Testing Strategy

### Unit Tests (Vitest + nuxt-test-utils)

- **Server routes**: test API endpoints (upload, search, tagging).
- **Database queries**: mock Drizzle ORM; test query builders.
- **Composables**: test reactive state and API calls.
- **Components / Pages**: test UI interactions.

```typescript
// Example: test search endpoint
describe('/api/documents/search', () => {
    it('returns documents matching query', async () => {
        const {$fetch} = await useTestServer();
        const result = await $fetch('/api/documents/search', {
            query: {q: 'invoice'}
        });
        expect(result.documents).toHaveLength(3);
    });
});
```

### Integration Tests

- **Upload flow**: upload file → OCR job enqueued → extract visible in UI.
- **Search + filters**: tag document → search by tag → result correct.
- **Auth**: login → create org → upload in that org → verify scoping.
