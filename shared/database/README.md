# @dokra/database

Shared database schema, migrations, and utilities for the Dokra monorepo.

## Overview

This package contains:
- **Drizzle ORM schema definitions** for all database tables
- **Database migrations** (SQLite/D1)
- **Utility functions** for database operations

Used by:
- `dokra-application` - Main Nuxt application
- `dokra-ocr-consumer` - Background OCR worker

## Usage

### Import Schema

```typescript
import { documents, organizations, tags } from '@dokra/database/schema';
import { useDatabase } from '@dokra/database/utils';
```

### Use Database Helper

```typescript
const db = useDatabase(env.DB);
const allDocs = await db.select().from(documents);
```

## Schema

- **organizations** - Organization/workspace data
- **organizationUsers** - User membership in organizations
- **documents** - Document metadata
- **tags** - Tag definitions
- **documentTags** - Document-tag relationships
- **files** - File metadata and R2 references
- **auth tables** - BetterAuth tables (users, sessions, etc.)

## Migrations

Migrations are stored in `./migrations/` and managed with Drizzle Kit.

### Generate Migration

```bash
pnpm db:generate
```

### Apply Migrations

```bash
# Local
wrangler d1 migrations apply dokra-db --local --migration-folder=../shared/database/migrations

# Production
wrangler d1 migrations apply dokra-db --remote --migration-folder=../shared/database/migrations
```

## Development

This is a TypeScript package with no build step - it's consumed directly by other packages via path aliases.
