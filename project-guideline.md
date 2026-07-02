# Theo Platform - Project Guideline

## Architecture Overview

```
theo-platform/
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
- **ORM**: Prisma v6 with PostgreSQL
- **Models**: User, Account, Session, Category, Product
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

## Phase 2: Commerce Platform

### Product Management
- CRUD endpoints in NestJS (`/api/products`)
- Image upload to MinIO bucket
- QR code generation per product
- Search via Meilisearch

### Shop Features
- Product listing with faceted search
- Shopping cart (React context/Zustand)
- Order processing with status tracking
- Wishlist persistence

### Inventory System
- Stock level management
- Barcode/QR generation
- Supplier tracking
- Inventory reports (Prisma aggregations)

## Phase 3: Community Platform

### Resume Builder
- PDF export using `@react-pdf/renderer`
- Multiple ATS-friendly templates
- AI writing assistance (OpenAI)
- Khmer/English language support

### Career Resources
- Markdown-based CMS
- Tagging system (interview, cv, jobs)
- Search integration with Meilisearch

## Phase 4: AI Integration

### Commerce AI
- Product description generation
- Smart recommendations
- Khmer translation

### Community AI
- Resume grammar correction
- Cover letter generation
- Interview practice

## Phase 5: Deployment

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

# Start all apps (requires database)
pnpm dev
```

## Environment Variables (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `MINIO_*` - Object storage credentials
- `REDIS_URL` - Cache connection
- `MEILI_*` - Search service config
- `AUTH_SECRET` - NextAuth encryption key
- `JWT_SECRET` - Backend JWT signing key

## Git Workflow
- Branch naming: `feature/*`, `fix/*`, `refactor/*`
- Commit convention: Conventional Commits
- PRs require build passing and lint clean
