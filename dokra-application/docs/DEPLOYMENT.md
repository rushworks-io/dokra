# Deployment Guide

Dokra deploys to **Cloudflare Pages + Workers** using Nuxt 4 with Nitro preset `cloudflare_module`.

---

## Prerequisites

- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI: `npm i -g wrangler`
- GitHub account + repo

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/rushworks-io/dokra.git
cd dokra
pnpm install
```

### 2. Environment Variables

Create `.env` (never commit to repo):

```env
# Auth
BETTER_AUTH_SECRET=your-random-secret-key (generate with: openssl rand -hex 32)
BETTER_AUTH_URL=http://localhost:3000
```

Get Cloudflare credentials:
1. Go to **cloudflare.com** → Login
2. Account → API Tokens
3. Create Token: "Edit Cloudflare Workers"
4. Copy `CLOUDFLARE_API_TOKEN` and account ID

### 3. Setup Local D1 Database

```bash
# Create local D1 database
wrangler d1 create dokra-db --local

# Apply migrations to local DB
pnpm db:migrate
```

### 4. Run Dev Server

```bash
pnpm dev
```

Opens `http://localhost:3000`. Hot reload enabled.

---

## Database Management

### Local Development

```bash
# Apply latest migrations
pnpm db:migrate

# Open Drizzle Studio (local DB browser)
pnpm db:studio
```

### Production

```bash
# Create new migration after schema change
pnpm db:generate

# Review generated SQL in /server/db/migrations/

# Apply to production D1
pnpm db:migrate:prod
```

---

## Cloudflare Resources Setup

### Create D1 Database

```bash
wrangler d1 create dokra-db
```

Returns database ID. Add to `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "dokra-db",
      "database_id": "8da5548e-9f06-4d96-b665-65001f5f6982"
    }
  ]
}
```

### Create R2 Bucket

```bash
wrangler r2 bucket create dokra-files
```

Add to `wrangler.jsonc`:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "dokra-files",
      "preview_bucket_name": "dokra-files-preview"
    }
  ]
}
```

#### R2 bucket and CORS notes

Configure R2 bucket bindings in `wrangler.jsonc`. Example:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "dokra-files",
      "preview_bucket_name": "dokra-files-preview"
    }
  ]
}
```

Local development / emulation:

Use `wrangler dev` or Miniflare to emulate R2 and expose the binding name (`R2`) to the runtime.

Run frontend + worker locally:

```bash
pnpm dev          # frontend
wrangler dev      # worker with R2 binding available locally
```

Server file responses include `Cache-Control: private, max-age=3600` by default. Adjust CDN rules only if you intentionally want longer shared caching.

### Create KV Namespace (optional, for caching)

```bash
wrangler kv:namespace create dokra-cache
wrangler kv:namespace create dokra-cache --preview
```

Add binding to `wrangler.jsonc`.

---

## GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install

      - run: pnpm test:run

      - run: pnpm build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        if: github.ref == 'refs/heads/main'
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: dokra
          directory: .output/public
          wranglerVersion: '4'
```

Add secrets to GitHub repo settings:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## Build & Deploy Manually

### Build

```bash
pnpm build
```

Generates:
- `.output/server/index.mjs` — Worker entry point
- `.output/public/` — Static assets

### Deploy

```bash
wrangler deploy
```

Deploys to Cloudflare Pages + Workers automatically.

---

## Environment Variables in Production

Set in **Cloudflare Dashboard** → Pages → dokra → Settings → Environment Variables:

```
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=https://dokra.example.com
BETTER_AUTH_TRUST_HOST=true
```

Or via Wrangler:

```bash
wrangler secret put BETTER_AUTH_SECRET
```

---

## Custom Domain

1. Go to **Cloudflare Dashboard** → Pages → dokra → Custom domain
2. Add your domain (e.g., dokra.example.com)
3. Update nameservers to Cloudflare if needed

---

## Monitoring & Logs

### View Deployment Logs

```bash
wrangler tail
```

Real-time logs from Worker.

### View D1 Queries

In Cloudflare Dashboard → D1 → dokra-db → Logs

---

## Troubleshooting

### D1 Connection Error

```
Error: Database not found
```

**Fix**: Ensure `CLOUDFLARE_DATABASE_ID` env var matches wrangler.jsonc.

### R2 Auth Error

```
Error: Access Denied
```

**Fix**: Check Cloudflare API token has R2 permissions. Regenerate if needed.

### Build Fails: "Cannot find module"

```bash
pnpm install
pnpm build
```

Clear node_modules if persists:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Local D1 Not Found

```bash
# Recreate local DB
rm -rf .wrangler/state/
pnpm db:migrate
```

---

## Rollback

### Rollback Deployment

Go to **Cloudflare Dashboard** → Pages → dokra → Deployments → Choose previous version → Rollback.

### Rollback Database

D1 doesn't support automated rollback. Manually revert schema:

```bash
# Create new migration reversing changes
pnpm db:generate

# Review & modify migration if needed
vim server/db/migrations/XXXX_revert.sql

# Apply
pnpm db:migrate:prod
```

---

## Performance & Scaling

### Caching Strategy

```typescript
// In route handler
return new Response(data, {
  headers: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400'
  }
});
```

### Database Query Optimization

- Use indexes (see DATABASE-SCHEMA.md)
- Paginate large result sets
- Pre-aggregate stats for dashboards

### File Upload Limits

D1: max 1GB per database  
R2: unlimited storage (pay-as-you-go)  
Workers: max 30s execution time

---

## Cost Estimation (Cloudflare Pricing as of Jan 2026)

- **Pages**: Free (includes 500 builds/month)
- **Workers**: Free (includes 100,000 requests/day)
- **D1**: Free tier (up to 5 databases, 3GB storage)
- **R2**: $0.015/GB stored + $0.06/M API requests
- **Queues**: $0.50/M operations (if used)

For typical small-to-medium use, stays in free tier.
