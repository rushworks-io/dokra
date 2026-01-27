# Dokra Monorepo Setup Guide

This guide will help you understand and work with the Dokra monorepo structure.

## Overview

The Dokra project is organized as a pnpm monorepo with the following structure:

```
dokra/
├── package.json                 # Root package with monorepo scripts
├── pnpm-workspace.yaml          # pnpm workspace configuration
├── .npmrc                       # pnpm settings
├── dokra-application/           # Main Nuxt 4 application
│   ├── package.json
│   ├── nuxt.config.ts
│   ├── drizzle.config.ts        # Points to shared database
│   ├── app/                     # Frontend code
│   └── server/                  # Backend API routes
├── workers/                     # Cloudflare Workers
│   └── dokra-ocr-consumer/      # OCR processing worker
│       ├── package.json
│       ├── ocr-consumer.ts
│       └── wrangler.jsonc
└── shared/                      # Shared packages
    └── database/                # Shared database package
        ├── package.json
        ├── drizzle.config.ts
        ├── tsconfig.json
        ├── migrations/          # Database migrations
        └── src/
            ├── index.ts         # Main exports
            ├── utils.ts         # DB utilities
            └── schema/          # Drizzle schemas
```

## Key Changes from Previous Structure

### Before (Single Package)
- Database schema was in `dokra-application/server/db/schema/`
- Each worker duplicated schema definitions
- Migrations were in `dokra-application/server/db/migrations/`

### After (Monorepo)
- Database schema is in `shared/database/src/schema/`
- All packages import from `@dokra/database`
- Migrations are in `shared/database/migrations/`
- Single source of truth for database structure

## Package References

### @dokra/database

The shared database package exports:

```typescript
// Import everything
import { documents, tags, useDatabase } from '@dokra/database';

// Import specific modules
import { documents, organizations } from '@dokra/database/schema';
import { useDatabase, generateId } from '@dokra/database/utils';
```

### How It Works

1. **Workspace Protocol**: Packages use `"@dokra/database": "workspace:*"` in their `package.json`
2. **Path Aliases**: TypeScript and bundlers resolve via path mappings:
   - Nuxt: Configured in `nuxt.config.ts` with `alias` option
   - Workers: Configured in `tsconfig.json` with `paths` option
3. **No Build Step**: The shared package is consumed directly (no compilation needed)

## Development Workflow

### Installing Dependencies

```bash
# From root - installs for all packages
pnpm install

# From specific package
cd dokra-application
pnpm install
```

### Running Commands

```bash
# From root
pnpm dev                    # Start main app
pnpm test                   # Test all packages
pnpm db:generate            # Generate migrations
pnpm db:migrate             # Apply migrations locally
pnpm deploy:all             # Deploy everything

# From dokra-application
cd dokra-application
pnpm dev
pnpm build

# From worker
cd workers/dokra-ocr-consumer
pnpm deploy
```

### Database Migrations

Migrations are now centralized in `shared/database/migrations/`:

```bash
# Generate new migration (from root or shared/database)
pnpm db:generate

# Apply migrations (from root)
pnpm db:migrate              # Local
pnpm db:migrate:prod         # Production

# Apply from dokra-application (uses --migration-folder flag)
cd dokra-application
pnpm db:migrate
```

### Adding Schema Changes

1. Edit schema files in `shared/database/src/schema/`
2. Generate migration: `pnpm db:generate` (from root or shared/database)
3. Review generated SQL in `shared/database/migrations/`
4. Apply migration: `pnpm db:migrate`

### Adding a New Shared Package

1. Create folder: `shared/my-package/`
2. Add `package.json` with `"name": "@dokra/my-package"`
3. The workspace glob `shared/*` will auto-detect it
4. Add as dependency in other packages: `"@dokra/my-package": "workspace:*"`

## Import Path Resolution

### In dokra-application

Nuxt is configured to resolve `@dokra/database` via aliases:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  alias: {
    '@dokra/database': '../shared/database/src',
    '@dokra/database/*': '../shared/database/src/*',
  },
  nitro: {
    alias: {
      '@dokra/database': '../shared/database/src',
      '@dokra/database/*': '../shared/database/src/*',
    }
  }
})
```

### In Workers

Workers use TypeScript path mapping:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@dokra/database": ["../../shared/database/src"],
      "@dokra/database/*": ["../../shared/database/src/*"]
    }
  }
}
```

## Deployment

### Application

```bash
pnpm deploy:app
# or
cd dokra-application
pnpm deploy
```

### Worker

```bash
pnpm deploy:worker
# or
cd workers/dokra-ocr-consumer
pnpm deploy
```

### Everything

```bash
pnpm deploy:all
```

## Troubleshooting

### Module not found errors

If you see `Cannot find module '@dokra/database'`:

1. Ensure `pnpm install` was run from root
2. Check that aliases are configured in `nuxt.config.ts` or `tsconfig.json`
3. Restart your IDE/dev server

### TypeScript errors

1. Check that `shared/database/tsconfig.json` is valid
2. Ensure `@cloudflare/workers-types` is installed in shared package
3. Restart TypeScript server in your IDE

### Migration errors

If migrations fail:

1. Ensure you're using the correct `--migration-folder` flag
2. Check that `shared/database/migrations/` contains your migrations
3. Verify D1 database name in wrangler config matches

## Benefits of This Structure

1. **Single Source of Truth**: Database schema defined once
2. **Type Safety**: Shared types across all packages
3. **Easy Maintenance**: Update schema in one place
4. **Scalability**: Easy to add new workers or services
5. **Consistency**: All packages use the same database utilities

## Next Steps

- Consider adding shared utilities package for common functions
- Add shared types package for TypeScript definitions
- Set up Turborepo or Nx for better build caching (optional)
- Add workspace-wide linting and formatting configuration
