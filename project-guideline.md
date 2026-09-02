# Khmeronlineshopbytheo - Project Guideline

## Architecture Overview

```
khmeronlineshopbytheo/
├── apps/
│   ├── frontend/     Next.js 15 - Public website + User dashboard
│   ├── admin/        Next.js 15 - Admin dashboard
│   └── backend/      NestJS 11 - REST API
├── packages/
│   ├── config/       Shared ESLint, TypeScript config
│   ├── database/     Prisma ORM schema + client
│   └── ui/           Shared shadcn/ui components
├── docker/
│   ├── compose.yml   PostgreSQL, MinIO, Redis, Meilisearch
│   └── nginx/        Reverse proxy config
├── pnpm-workspace.yaml
└── turbo.json
```

## Phase 1: Foundation (COMPLETED)

### Monorepo Setup
- **Tool**: Turborepo v2 with pnpm workspaces
- **Structure**: 3 apps (frontend, admin, backend) + 3 packages (config, database, ui)
- **Key Config**:
  - `turbo.json` - Build pipeline with dependency ordering
  - `pnpm-workspace.yaml` - Workspace package definitions

### Database Layer
- **ORM**: Prisma v6 with SQLite (local) / PostgreSQL (production)
- **Models**: User, Account, Session, Category, Product, Order, OrderItem, Cart, CartItem, Review, Resume, Article, Warranty
- **Auth**: NextAuth v4 (frontend) + JWT (backend)
- **Auth**: NextAuth v4 (frontend) + JWT (backend)
- **Key Schema** (`packages/database/prisma/schema.prisma`):
  - User with Role enum (CUSTOMER, CONTENT_EDITOR, INVENTORY_MANAGER, ADMIN)
  - Product with Category relation
  - QR code field for inventory tracking

### Authentication System
- **Frontend**: NextAuth with Credentials provider
  - JWT session strategy (30-day expiry)
  - Login page at `/login`
  - Callbacks enrich session with user role
- **Backend**: Passport JWT strategy
  - Auth module with login/register endpoints
  - `@Roles()` decorator for RBAC
  - `RolesGuard` for route protection

## Phase 2: Commerce Platform (COMPLETED)

### Product Management
- CRUD endpoints in NestJS (`/api/products`)
- Image upload to MinIO bucket
- QR code generation per product
- Search via Meilisearch (auto-fallback to Prisma)
- Product auto-sync to Meilisearch on create/update/delete

### Shop Features
- Product listing with faceted search
- Shopping cart (React context/Zustand)
- Order processing with status tracking
- Warranty management per product

### Warranty Module
- **Model**: `Warranty` with status flow (ACTIVE → CLAIMED/EXPIRED/VOID)
- **Backend endpoints** (`/api/warranties`):
  - CRUD for admin/manager
  - `GET /my` – customer's warranties
  - `POST /:id/claim` – file a claim
  - `PATCH /:id/approve|reject` – admin claim management
  - `PATCH /:id/notes` – admin notes
- **Admin UI**: `/admin/warranties` with status filtering
- **Customer UI**: `/warranties` with days remaining + claim form

### Search Integration
- **Meilisearch** v1.48+ running locally on port 7700
- **SearchService** – indexes products with filterable attributes
- **Fallback**: Prisma `contains` when Meilisearch unavailable
- **Auto-sync**: Products re-indexed on create/update/delete
- **Search Bar**: Live dropdown search in nav with 300ms debounce
- **API**: `GET /api/search?q=...&categoryId=...&minPrice=...&maxPrice=...`

## Phase 3: Community Platform (COMPLETED)

### Resume Builder
- PDF export using `@react-pdf/renderer`
- Multiple ATS-friendly templates
- AI writing assistance (OpenAI or fallback)
- Khmer/English language support
- **AI Resume Assistant**: Improve summary, improve experience, generate cover letter

### Career Resources
- Markdown-based CMS
- Tagging system (interview, cv, jobs)
- Search integration with Meilisearch

## Phase 4: AI Integration (COMPLETED)

### Backend (`apps/backend/src/ai`)
- `AiService` with OpenAI GPT-4o-mini
- Graceful fallback when no API key configured
- **Endpoints**:
  - `POST /api/ai/describe-product` – generate product descriptions
  - `POST /api/ai/resume/improve-summary` – rewrite resume summary
  - `POST /api/ai/resume/improve-experience` – rewrite experience bullets
  - `POST /api/ai/resume/cover-letter` – generate full cover letter

### Admin UI
- "✨ AI Generate" button on product creation page

### Frontend UI
- `AiResumeAssistant` component in resume builder (3 modes)
- `AiProductDescription` component for admin use

### To enable real AI
Add `OPENAI_API_KEY="sk-..."` to:
- `apps/frontend/.env`
- `apps/admin/.env`
- `apps/backend/.env`

## Phase 5: Mobile & PWA (COMPLETED)

### Responsive Design
- **Nav**: Hamburger menu on mobile, full-width search drawer
- **Admin sidebar**: Slide-out drawer with overlay backdrop
- **Touch targets**: Minimum 44px tap targets, active states
- **Layout**: `p-4 sm:p-6`, `min-w-0` overflow prevention

### PWA Support
- Web manifest (`/manifest.json`) with standalone display
- Service worker (`/sw.js`) with offline caching
- Theme-color and viewport meta tags
- iOS home screen support via `apple-web-app` meta

## Phase 6: Deployment

### Docker Services
```bash
docker compose -f docker/compose.yml up -d
```

### Nginx Reverse Proxy
Routes:
- `/` -> Frontend (port 3000)
- `/admin` -> Admin (port 3001)
- `/api` -> Backend (port 4000)

### Monitoring
- Uptime Kuma for uptime checks
- Grafana + Prometheus for metrics
- Loki for log aggregation

## Development Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @theo/database exec prisma generate

# Start Meilisearch (local, no Docker)
C:\Users\theow\AppData\Local\Temp\meilisearch.exe --master-key masterKey

# Start all apps (separate terminals)
pnpm --filter backend dev          # http://localhost:4000
pnpm --filter frontend dev         # http://localhost:3000
pnpm --filter admin dev --port 3001 # http://localhost:3001
```

## Environment Variables (.env)

### Backend (`apps/backend/.env`)
- `DATABASE_URL` - PostgreSQL: `postgresql://postgres:postgres@localhost:5432/khmeronlineshop`
- `AUTH_SECRET` - NextAuth encryption key
- `JWT_SECRET` - Backend JWT signing key
- `PORT` - Server port (default 4000)
- `MEILI_HOST` - Meilisearch URL (default: `http://localhost:7700`)
- `MEILI_API_KEY` - Meilisearch master key
- `OPENAI_API_KEY` - OpenAI key for AI features (optional)

### Frontend (`apps/frontend/.env`)
- `DATABASE_URL` - PostgreSQL for direct DB access (used in API routes)
- `AUTH_SECRET` / `NEXTAUTH_SECRET` - Auth encryption key
- `AUTH_URL` / `NEXTAUTH_URL` - Public URL (default: `http://localhost:3000`)
- `OPENAI_API_KEY` - OpenAI key for AI features (optional)

### Admin (`apps/admin/.env`)
- `DATABASE_URL` - PostgreSQL for direct DB access
- `AUTH_SECRET` / `NEXTAUTH_SECRET` - Auth encryption key
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:4000/api`)
- `OPENAI_API_KEY` - OpenAI key for AI features (optional)

## Key URLs (Local Dev)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Admin | http://localhost:3001 |
| Admin Warranties | http://localhost:3001/admin/warranties |
| Backend API | http://localhost:4000/api |
| Meilisearch | http://localhost:7700 |

## Key Files

| Purpose | Path |
|---------|------|
| Prisma schema | `packages/database/prisma/schema.prisma` |
| DB constants | `packages/database/src/index.ts` |
| Backend modules | `apps/backend/src/` |
| Frontend pages | `apps/frontend/src/app/` |
| Admin pages | `apps/admin/src/app/admin/` |
| Shared UI | `packages/ui/src/` |
| Docker services | `docker/compose.yml` |

## Git Workflow
- Branch naming: `feature/*`, `fix/*`, `refactor/*`
- Commit convention: Conventional Commits
- PRs require build passing and lint clean
