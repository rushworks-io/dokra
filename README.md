# Dokra

> A modern document management system built with Nuxt 4 and Cloudflare.

Dokra is an intelligent document management system that helps you organize, search, and manage your documents with ease. Built on Cloudflare's edge infrastructure, it combines powerful OCR, AI-powered classification, and an intuitive interface to make document archiving effortless.

## 📁 Monorepo Structure

This is a monorepo managed with pnpm workspaces:

```
dokra/
├── dokra-application/    # Main Nuxt 4 application
├── workers/              # Cloudflare Workers
│   └── dokra-ocr-consumer/  # OCR processing worker
└── shared/               # Shared packages
    └── database/         # Shared Drizzle database schema & utilities
```

### Packages

- **`dokra-application`** - The main Nuxt 4 web application with server API routes
- **`@dokra/database`** - Shared database schema, migrations, and utilities used by both the app and workers
- **`dokra-ocr-consumer`** - Background worker for processing OCR jobs via Cloudflare Queues

## ✨ Features (work in progress)

- 📁 **Smart Document Organization** - Organize documents with tags, folders, and custom metadata
- 🔍 **Full-Text Search** - Search across document content with OCR text extraction
- 🤖 **AI Classification** - Automatic document type detection and metadata extraction using LLMs
- 📧 **Email Ingestion** - Forward documents via email for automatic import
- 👥 **Multi-Organization** - Support for personal, family, and work document collections
- ☁️ **Cloud-Native** - Built entirely on Cloudflare infrastructure (Workers, R2, D1)
- 🔒 **Self-Hosted** - Full control over your data
- 🚀 **Fast & Scalable** - Edge-optimized for speed and reliability

## 🏗️ Tech Stack

- **Frontend**: Nuxt 4 + Vue 3
- **Styling**: Tailwind CSS v4 + DaisyUI v5
- **Backend**: Cloudflare Workers (Nitro)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth**: BetterAuth
- **AI/ML**: Gemma 3-270M for classification
- **Job Queue**: Cloudflare Queues + Durable Objects

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/ruskworks/dokra.git
cd dokra

# Install dependencies for all packages
pnpm install

# Set up environment variables
cp dokra-application/.env.example dokra-application/.env
# Edit .env with your configuration

# Run development server (from root)
pnpm dev

# Or run from the application directory
cd dokra-application
pnpm dev
```

### Cloudflare Setup

```bash
# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create dokra-db

# Create R2 bucket
wrangler r2 bucket create dokra-files

# Run database migrations (from root)
pnpm db:migrate

# Or from application directory
cd dokra-application
pnpm db:migrate
```

## 🛠️ Development Commands

From the root directory:

```bash
# Development
pnpm dev                    # Start Nuxt dev server
pnpm test                   # Run tests in all packages

# Database
pnpm db:generate            # Generate new migrations
pnpm db:migrate             # Apply migrations locally
pnpm db:migrate:prod        # Apply migrations to production
pnpm db:studio              # Open Drizzle Studio

# Deployment
pnpm deploy:app             # Deploy main application
pnpm deploy:worker          # Deploy OCR worker
pnpm deploy:all             # Deploy everything
```

## 📖 Documentation

Detailed documentation is coming soon. For now, check out:

- [GitHub Issues](https://github.com/ruskworks/dokra/issues) - Development roadmap and tasks

## 🗺️ Roadmap

Dokra is being developed in phases:

- **Phase 1** - MVP foundation (upload, tagging, search, viewer) -> (current Phase)
- **Phase 2** - OCR processing and email ingestion
- **Phase 3** - Advanced metadata and power-user features
- **Phase 4** - Automation, multi-user support, and production readiness

See our [GitHub Issues](https://github.com/ruskworks/dokra/issues) for detailed progress.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License (to be determined)

---

**Note**: This project is currently in active development. Expect breaking changes until v1.0 release.