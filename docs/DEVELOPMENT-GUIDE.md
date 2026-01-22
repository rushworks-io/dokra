# Development Guide

Essential info for contributing to Dokra or extending functionality.

---

## Project Structure

```
dokra/
├── app/                          # Nuxt frontend (Vue 3)
│   ├── components/               # Reusable Vue components
│   │   ├── AppHeader.vue         # Top nav bar
│   │   ├── AppSidebar.vue        # Left nav sidebar
│   │   ├── AppSearch.vue         # Search input
│   │   ├── DocumentTable.vue     # Document list table
│   │   ├── DocumentUpload.vue    # File upload
│   │   └── ...
│   ├── composables/              # Reusable logic (Vue composables)
│   │   ├── useAuth.ts            # Auth state & methods
│   │   ├── useSearch.ts          # Search state & pagination
│   │   └── ...
│   ├── pages/                    # Route-based pages (file = route)
│   │   ├── index.vue             # / (home/login redirect)
│   │   ├── dashboard.vue         # /dashboard (main UI)
│   │   ├── login.vue             # /login
│   │   ├── documents/
│   │   │   ├── index.vue         # /documents (list)
│   │   │   └── [id].vue          # /documents/:id (detail)
│   │   ├── tags/
│   │   ├── settings/
│   │   └── ...
│   ├── layouts/                  # Layout templates
│   │   └── app.vue               # Main app layout
│   ├── middleware/               # Route guards
│   │   ├── auth.ts               # Require authenticated user
│   │   └── guest.ts              # Require unauthenticated user
│   ├── utils/
│   │   └── auth-client.ts        # BetterAuth client
│   └── assets/
│       └── css/main.css          # Global styles
│
├── server/                       # Nitro backend
│   ├── api/                      # API endpoints (HTTP routes)
│   │   ├── documents/
│   │   │   ├── index.get.ts      # GET /api/documents
│   │   │   ├── index.post.ts     # POST /api/documents
│   │   │   ├── [id]/
│   │   │   │   ├── index.delete.ts
│   │   │   │   ├── download.get.ts
│   │   │   │   └── ...
│   │   ├── files/
│   │   ├── tags/
│   │   ├── organization/
│   │   ├── users/
│   │   ├── search.get.ts
│   │   └── auth/ (BetterAuth routes)
│   │
│   ├── db/
│   │   ├── schema/               # Drizzle ORM table definitions
│   │   │   ├── documents.ts
│   │   │   ├── organizations.ts
│   │   │   ├── tags.ts
│   │   │   ├── files.ts
│   │   │   ├── document-tags.ts
│   │   │   ├── organization-users.ts
│   │   │   └── auth.ts           # BetterAuth managed
│   │   └── migrations/           # Auto-generated migration SQL files
│   │
│   ├── middleware/               # Nuxt middleware (server-side)
│   │   ├── auth.ts               # Attach auth to context
│   │   └── org-context.ts        # Attach org to context
│   │
│   ├── utils/
│   │   ├── db.ts                 # Database helpers
│   │   ├── auth.ts               # Auth helpers
│   │   ├── storage.ts            # R2 file operations
│   │   ├── require-auth.ts       # Auth guard for endpoints
│   │   └── require-org-access.ts # Org access validation
│   │
│   └── env.d.ts                  # Type definitions for env
│
├── types/                        # Shared TypeScript types
│   ├── document.ts
│   ├── organization.ts
│   ├── tag.ts
│   ├── user.ts
│   ├── auth.ts
│   ├── session.ts
│   └── ...
│
├── docs/                         # Documentation
│   ├── agent-overview.md
│   ├── API-REFERENCE.md
│   ├── DATABASE-SCHEMA.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT-GUIDE.md
│   ├── app-style-guide.md
│   ├── dashboard-layout-plan.md
│   └── testing.md
│
├── test/
│   ├── unit/                     # Node.js unit tests
│   ├── e2e/                      # End-to-end tests
│   └── nuxt/                     # Nuxt runtime tests
│
├── public/                       # Static assets (favicon, robots.txt)
├── nuxt.config.ts                # Nuxt config (SSR, modules, etc.)
├── wrangler.jsonc                # Cloudflare config (D1, R2, Queues)
├── tsconfig.json                 # TypeScript config
├── vitest.config.ts              # Test runner config
├── drizzle.config.ts             # Drizzle ORM config (migrations)
└── package.json                  # Dependencies & scripts
```

---

## Adding a New Feature

### 1. Plan Schema Changes (if needed)

Edit `/server/db/schema/{entity}.ts`:

```typescript
// server/db/schema/invoices.ts
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  documentId: text('document_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  amount: text('amount').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('invoices_org_idx').on(table.organizationId),
]);
```

Export in `/server/db/schema/index.ts`:

```typescript
export { invoices } from './invoices';
```

### 2. Generate Migration

```bash
pnpm db:generate
```

Review generated SQL in `/server/db/migrations/XXXX_*.sql`. Modify if needed.

### 3. Create Types

Add to `/types/invoice.ts`:

```typescript
export interface Invoice {
  id: string;
  organizationId: string;
  documentId: string;
  invoiceNumber: string;
  amount: string;
  createdAt: string;
}
```

Export in `/types/index.ts`:

```typescript
export * from './invoice';
```

### 4. Create API Endpoints

Create `/server/api/invoices/`:

```typescript
// server/api/invoices/index.get.ts
export default defineEventHandler(async (event) => {
  const { organizationId } = getQuery(event);
  requireAuth(event);
  
  const db = useDatabase(event.context.cloudflare.env.DB);
  const results = await db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));
    
  return { invoices: results };
});
```

### 5. Create Frontend Components

Add to `/app/components/InvoiceList.vue`:

```vue
<script setup lang="ts">
import type { Invoice } from '~~/types';

defineProps<{
  invoices: Invoice[];
}>();

const { $fetch } = useNuxtApp();
const invoices = ref<Invoice[]>([]);

onMounted(async () => {
  invoices.value = await $fetch('/api/invoices', {
    query: { organizationId: useRoute().query.org }
  });
});
</script>

<template>
  <table>
    <tr v-for="invoice in invoices" :key="invoice.id">
      <td>{{ invoice.invoiceNumber }}</td>
      <td>{{ invoice.amount }}</td>
    </tr>
  </table>
</template>
```

### 6. Add Page Route

Create `/app/pages/invoices/index.vue`:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});
</script>

<template>
  <InvoiceList />
</template>
```

### 7. Test

Create `/test/unit/invoices.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('invoices', () => {
  it('should fetch invoices', () => {
    // Test logic
  });
});
```

Run: `pnpm test:unit`

---

## Common Patterns

### Using Composables

```typescript
// Composable: composables/useInvoices.ts
export function useInvoices() {
  const invoices = ref([]);
  const isLoading = ref(false);
  
  async function fetchInvoices(orgId: string) {
    isLoading.value = true;
    try {
      const data = await $fetch('/api/invoices', {
        query: { organizationId: orgId }
      });
      invoices.value = data.invoices;
    } finally {
      isLoading.value = false;
    }
  }
  
  return { invoices, isLoading, fetchInvoices };
}
```

In component:

```vue
<script setup>
const { invoices, fetchInvoices } = useInvoices();
</script>
```

### Database Queries

```typescript
import { eq, and, desc } from 'drizzle-orm';
import { useDatabase } from '~/server/utils/db';

const db = useDatabase(event.context.cloudflare.env.DB);

// Single row
const doc = await db
  .select()
  .from(documents)
  .where(eq(documents.id, docId))
  .limit(1);

// Multiple with filters
const docs = await db
  .select()
  .from(documents)
  .where(
    and(
      eq(documents.organizationId, orgId),
      eq(documents.status, 'inbox')
    )
  )
  .orderBy(desc(documents.createdAt))
  .limit(50);

// Join
const docsWithTags = await db
  .select()
  .from(documents)
  .leftJoin(documentTags, eq(documents.id, documentTags.documentId))
  .leftJoin(tags, eq(documentTags.tagId, tags.id))
  .where(eq(documents.id, docId));

// Insert
const newDoc = await db
  .insert(documents)
  .values({
    id: generateId(),
    organizationId: orgId,
    title: 'New Doc',
    // ...
  })
  .returning();

// Update
await db
  .update(documents)
  .set({ status: 'verified', updatedAt: getCurrentTimestamp() })
  .where(eq(documents.id, docId));

// Delete (soft)
await db
  .update(documents)
  .set({ status: 'deleted' })
  .where(eq(documents.id, docId));
```

### Authentication Check

```typescript
// In endpoint
import { requireAuth } from '~/server/utils/require-auth';

export default defineEventHandler(async (event) => {
  const session = requireAuth(event);
  
  console.log(session.user.id);
  console.log(session.user.email);
  
  // Endpoint is now guarded; unauthenticated requests return 401
});
```

### File Upload

```typescript
// Form
<form @submit.prevent="uploadFile">
  <input type="file" ref="fileInput" />
  <button type="submit">Upload</button>
</form>

// Handler
async function uploadFile() {
  const file = fileInput.value.files?.[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('organizationId', organizationId.value);
  
  const result = await $fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  });
  
  console.log(result.downloadUrl);
}
```

### Error Handling

```typescript
// API endpoint
if (!organizationId) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    message: 'Organization ID required'
  });
}

// Frontend
try {
  await $fetch('/api/documents');
} catch (err) {
  if (err.statusCode === 401) {
    await navigateTo('/login');
  } else {
    console.error(err.message);
  }
}
```

---

## Key Libraries & Utilities

### Auth

- **BetterAuth**: Full-stack authentication
- `useAuth()` composable: Get session, sign in/out
- `requireAuth()` utility: Guard API endpoints

### Database

- **Drizzle ORM**: Type-safe query builder
- `useDatabase()`: Get DB instance in endpoints
- Auto-generated migrations

### Storage

- **Cloudflare R2**: File storage
- `getR2Bucket()`: Get R2 client
- `uploadFile()`: Upload to R2
- File keys: `{orgId}/{docId}/{fileName}`

### Frontend

- **Nuxt 4**: Full-stack framework
- **Vue 3**: Reactive components
- **Tailwind CSS v4**: Styling
- **DaisyUI v5**: Component library

### State Management

- **useAuth()**: Auth state
- **useSearch()**: Search state + recent searches (localStorage)
- **useFetch()**: Server-state fetching with caching

---

## Debugging

### Client-Side

```typescript
// Log in component
console.log('Current org:', useRoute().query.org);

// Watch reactive refs
const user = ref(null);
watch(() => user.value, (newVal) => {
  console.log('User changed:', newVal);
});
```

### Server-Side

```typescript
// In endpoint
console.log('Request headers:', event.node.req.headers);
console.log('Query params:', getQuery(event));
console.log('Body:', await readBody(event));
```

View logs:

```bash
wrangler tail
```

---

## Environment Variables

In `.env`:

```env
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3000
```

Access in endpoints:

```typescript
const secret = event.context.cloudflare.env.BETTER_AUTH_SECRET;
```

Access on client (only public vars):

```typescript
const runtimeConfig = useRuntimeConfig();
const apiUrl = runtimeConfig.public.BETTER_AUTH_URL;
```

---

## Linting & Formatting

```bash
# Run lint (if configured)
# pnpm lint

# Format with Prettier (if configured)
# pnpm format
```

---

## Version Bumping

Update `package.json` version, then:

```bash
pnpm install
git commit -am "chore: bump version"
git tag v1.0.1
git push --tags
```

---

## Performance Tips

1. **Pagination**: Always use limit/offset for large result sets
2. **Caching**: Use `getCachedData` in `useFetch()` to prevent refetches
3. **Indexes**: Add DB indexes for frequently filtered columns
4. **Lazy Loading**: Use `<Suspense>` or `lazy:` prefix for component imports
5. **Image Optimization**: Use `<NuxtImg>` with responsive sizes

---

## Contributing

1. Fork repo
2. Create feature branch: `git checkout -b feat/my-feature`
3. Make changes + write tests
4. Run tests: `pnpm test:run`
5. Commit: `git commit -am "feat: add my feature"`
6. Push & open PR

