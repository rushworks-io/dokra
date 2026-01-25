# Dokra Documentation Index

Welcome to Dokra — a self-hosted, privacy-first document management system on Cloudflare.

---

## 📚 Documentation Structure

### For Quick Start
1. **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Get running locally in 5 min, then deploy to production
2. **[DEVELOPMENT-GUIDE.md](./DEVELOPMENT-GUIDE.md)** — Project structure, key patterns, adding features

### For Understanding the System
3. **[agent-overview.md](./agent-overview.md)** — High-level architecture, phases, roadmap (START HERE for big picture)
4. **[DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)** — Table definitions, relationships, query patterns
5. **[API-REFERENCE.md](./API-REFERENCE.md)** — All HTTP endpoints + request/response examples

### For Building UI
6. **[app-style-guide.md](./app-style-guide.md)** — Design principles, component behavior, tone
7. **[dashboard-layout-plan.md](./dashboard-layout-plan.md)** — Frontend architecture (header, sidebar, pages)

### For Testing & QA
8. **[testing.md](./testing.md)** — How to write and run tests (unit, integration, e2e)

---

## 🎯 Quick Navigation by Role

### I'm a **Backend Developer**
1. Read: [Database Schema](./DATABASE-SCHEMA.md) — understand tables + relationships
2. Read: [API Reference](./API-REFERENCE.md) — existing endpoints + patterns
3. Follow: [Development Guide](./DEVELOPMENT-GUIDE.md) — "Adding a New Feature" section
4. Reference: [Deployment Guide](./DEPLOYMENT.md) for local D1 + testing

### I'm a **Frontend Developer**
1. Read: [App Style Guide](./app-style-guide.md) — design + component rules
2. Read: [Dashboard Layout Plan](./dashboard-layout-plan.md) — page structure
3. Follow: [Development Guide](./DEVELOPMENT-GUIDE.md) — composables + common patterns
4. Reference: [API Reference](./API-REFERENCE.md) for endpoints to call

### I'm **DevOps / Setting Up Deployment**
1. Start: [Deployment Guide](./DEPLOYMENT.md) — full setup workflow
2. Reference: [agent-overview.md](./agent-overview.md) — Cloudflare Services section

### I'm **Contributing or Onboarding**
1. Read: [agent-overview.md](./agent-overview.md) — understand the vision + phase roadmap
2. Skim: [Database Schema](./DATABASE-SCHEMA.md) — learn data model
3. Follow: [Development Guide](./DEVELOPMENT-GUIDE.md) — setup + guidelines
4. Read: [Testing Guide](./testing.md) — ensure quality

---

## 🔗 Key Concepts at a Glance

### Architecture
- **Frontend**: Nuxt 4 + Vue 3 + Tailwind CSS v4 + DaisyUI v5
- **Backend**: Nitro (Cloudflare Workers) + BetterAuth
- **Database**: Drizzle ORM + Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Jobs**: Cloudflare Queues (async processing)

### R2 & File Access (Important)
Files are served through a server-side streaming proxy. See `API-REFERENCE.md` for the new endpoints: `/api/files/proxy/[id]`, `/api/documents/[id]/view`, and `/api/documents/[id]/download`. Responses include `Cache-Control: private, max-age=3600` and the server centralizes access control for file streaming.

### Current Phase (Phase 2 MVP)
- ✅ Document upload + storage
- ✅ Text search (basic)
- ✅ Tagging system
- ✅ Multi-org support
- ✅ Email/password auth
- ⚙️ Frontend UI (in progress)
- ️⚙️ OCR pipeline (in progress)
- ❌ Email ingestion (Phase 2)
- ❌ Reminders (Phase 4)

### File Locations Quick Ref
| What | Where |
|------|-------|
| API endpoints | `/server/api/` |
| Database tables | `/server/db/schema/` |
| React components | `/app/components/` |
| Pages/routes | `/app/pages/` |
| Composables | `/app/composables/` |
| Types | `/types/` |
| Tests | `/test/unit/` |
| Migrations | `/server/db/migrations/` |

---

## ❓ Common Questions

**Q: Where do I start if I want to add a new feature?**  
A: Read [Development Guide](./DEVELOPMENT-GUIDE.md) → "Adding a New Feature" section. Covers schema → API → UI.

**Q: How do I run tests?**  
A: See [Testing Guide](./testing.md). TL;DR: `pnpm test:run`

**Q: What's the database schema?**  
A: See [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md). All tables + relationships documented.

**Q: How do I deploy to production?**  
A: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) → "Build & Deploy Manually" section.

**Q: What are the API endpoints?**  
A: See [API-REFERENCE.md](./API-REFERENCE.md). All documented with examples.

**Q: When will feature X be available?**  
A: Check [agent-overview.md](./agent-overview.md) → "Phase Roadmap" section.

**Q: Getting errors or stuck?**  
A: Check troubleshooting tips in [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) and [DEVELOPMENT-GUIDE.md](./DEVELOPMENT-GUIDE.md#debugging).

---

## 📝 Documentation Conventions

- **Code blocks** use actual syntax (TypeScript, SQL, etc.)
- **Tables** summarize key info; links point to detailed docs
- **Examples** are copy-paste ready (test them locally first!)
- **Links** use relative paths (./file.md) for portability

---

## 🐛 Report Issues

Found a doc error or unclear explanation? Open an issue or submit a PR with clarifications.

---

## 📖 Additional Resources

- **Nuxt 4**: https://nuxt.com
- **Cloudflare Workers**: https://developers.cloudflare.com/workers
- **Drizzle ORM**: https://orm.drizzle.team
- **BetterAuth**: https://www.better-auth.com
- **Tailwind CSS v4**: https://tailwindcss.com
- **DaisyUI v5**: https://daisyui.com

---

**Last Updated**: January 20, 2026  
**Phase**: 1 MVP (~70% complete)  
**Questions?** Check the relevant doc above or open an issue.
