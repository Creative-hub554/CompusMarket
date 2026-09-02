# Docker Setup Guide — Khmer Online Shop by Theo

Complete guide to building, running, and deploying the Turborepo monorepo project with Docker.

## Project Architecture

This is a **Turborepo monorepo** with optimized Docker builds using `turbo prune`:

```
┌─────────────────────────────────────────────────────────────────┐
│              Docker Compose Full Stack (compose.yaml)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend (Next.js)     Admin (Next.js)     Backend (NestJS)    │
│  :3000                  :3001                :4000               │
│    ↓                       ↓                     ↓               │
│  apps/frontend ←← apps/admin ←───→ apps/backend ←─→ API        │
│       ↓                 ↓              ↓         ↓               │
│       └─────────────────┴─────────────┴─────────┘               │
│                         │                                        │
│  ┌──────────┬───────────┼───────────┬──────────┐               │
│  ▼          ▼           ▼           ▼          ▼               │
│ PostgreSQL Redis  Meilisearch  MinIO  Shared packages           │
│ (DB)      (Cache) (Search)    (S3)   (@theo/database, @theo/ui)│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Prerequisites

```bash
# Required
- Docker Desktop 4.20+ (with Docker Compose v2)
- 8GB RAM minimum (recommend 16GB)
- 20GB free disk space for images and volumes

# Optional
- OpenAI API key (for AI features)
- OpenRouter API key (fallback AI provider)
```

### 2. Environment Setup

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# Critical to change:
# - POSTGRES_PASSWORD
# - REDIS_PASSWORD
# - MINIO_ROOT_PASSWORD
# - AUTH_SECRET (32+ characters)
# - JWT_SECRET (32+ characters)
```

### 3. Build & Start

```bash
# Build all images (first time, ~5-10 min)
docker compose build

# Start full stack
docker compose up -d

# Or single command
docker compose up -d --build

# View logs
docker compose logs -f

# Watch specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f admin
```

### 4. Access Services

| Service          | URL                        | Credentials               |
|------------------|----------------------------|---------------------------|
| Frontend         | http://localhost:3000      | Use in-app registration   |
| Admin Dashboard  | http://localhost:3001      | Created at seed/signup    |
| Backend API      | http://localhost:4000      | JWT token required        |
| MinIO Console    | http://localhost:9001      | minioadmin / {password}   |
| Meilisearch UI   | http://localhost:7700      | No auth (dev mode)        |

### 5. Database Setup

```bash
# Prisma migrations auto-run at backend startup
# To manually run migrations:
docker compose exec backend pnpm db:migrate

# Seed database (if script exists)
docker compose exec backend pnpm db:seed

# Reset database (⚠️ destroys data)
docker compose exec backend pnpm db:reset
```

## Building Workflow

### Build All Services

```bash
# Using compose (pulls app-specific Dockerfiles)
docker compose build

# Shows progress with service dependencies
```

### Build Individual Services

```bash
# Backend only
docker compose build backend

# Frontend only
docker compose build frontend

# Admin only
docker compose build admin

# Infrastructure only
docker compose build postgres redis minio meilisearch
```

### Manual Builds (app-specific Dockerfiles)

Each app has its own optimized Dockerfile using `turbo prune`:

```bash
# Backend
docker build -f apps/backend/Dockerfile -t my-repo/backend:latest .

# Frontend
docker build -f apps/frontend/Dockerfile -t my-repo/frontend:latest .

# Admin
docker build -f apps/admin/Dockerfile -t my-repo/admin:latest .
```

**Why `turbo prune`?**
- Installs only dependencies each service needs
- Eliminates unused packages from install layer
- Improves caching and layer reuse
- Reduces final image size significantly

## Docker Compose File Structure

`compose.yaml` defines 7 services:

### Infrastructure Services (always running)

1. **postgres** — PostgreSQL 15
   - Database for all apps
   - Volume: `pgdata`
   - Health: `pg_isready`

2. **redis** — Redis 7
   - Session cache, real-time data
   - Password protected (requires auth)
   - Volume: `redis_data`

3. **minio** — MinIO (S3 compatible)
   - File storage (uploads, images, documents)
   - Console at :9001
   - Volume: `minio_data`

4. **meilisearch** — Meilisearch v1.6
   - Full-text search engine
   - Used by backend for product search
   - Volume: `meili_data`

### Application Services

5. **backend** — NestJS API (port 4000)
   - REST API endpoints
   - WebSocket server (real-time updates)
   - Health check: `GET /api/health/live`

6. **frontend** — Next.js Storefront (port 3000)
   - User-facing e-commerce UI
   - Client-side routing with Next.js
   - Depends on: backend (healthy)

7. **admin** — Next.js Admin Dashboard (port 3001)
   - Admin management UI
   - Charts, analytics, user management
   - Depends on: backend (healthy)

## Environment Variables Reference

See `.env.example` for all variables. Key ones:

```env
# Database
POSTGRES_PASSWORD=secure_password_change_this
DATABASE_URL=postgresql://theo:${POSTGRES_PASSWORD}@postgres:5432/theo_platform

# Cache & Search
REDIS_PASSWORD=secure_password_change_this
MEILI_MASTER_KEY=secure_key_change_this

# Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=secure_password_change_this
MINIO_BUCKET=khmeronlineshopbytheo

# Authentication
AUTH_SECRET=32_characters_minimum_secure_random_string
JWT_SECRET=32_characters_minimum_secure_random_string

# Frontend URLs
NEXT_PUBLIC_API_URL=http://localhost:4000       (from browser)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Seeding (first run)
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me

# AI Features (optional)
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=...

# Monitoring
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
SENTRY_DSN=  (optional error tracking)
METRICS_ENABLED=true
```

## Troubleshooting

### Services won't start

```bash
# 1. Check compose file is valid
docker compose config --quiet

# 2. View all service status
docker compose ps

# 3. Check service logs
docker compose logs backend
docker compose logs postgres
docker compose logs redis

# 4. Common issues:
# - Ports in use: Change in compose.yaml
# - Insufficient memory: Increase Docker Desktop RAM
# - Database not ready: Wait 15s after postgres starts
```

### Backend fails to connect to database

```bash
# Check DATABASE_URL is correct in .env
# Format: postgresql://user:password@postgres:5432/dbname
# Note: Use "postgres" (service name) not "localhost"

# Test connection
docker compose exec postgres psql -U theo -d theo_platform -c "SELECT 1"

# View backend logs
docker compose logs backend --tail=50
```

### Frontend can't connect to backend

```bash
# Check NEXT_PUBLIC_API_URL in .env
# From browser (host machine): http://localhost:4000
# From within container: http://backend:4000

# Verify backend is healthy
docker compose ps
# Should show "healthy" status

# Check backend is responding
curl http://localhost:4000/api/health/live
```

### MinIO/S3 upload errors

```bash
# Verify MinIO is running
docker compose ps minio

# Check MinIO logs
docker compose logs minio

# Access MinIO console: http://localhost:9001
# Login: minioadmin / {MINIO_ROOT_PASSWORD}

# Verify bucket exists (backend creates it automatically)
# Or create manually via console
```

### Search not working (Meilisearch)

```bash
# Check Meilisearch is running
docker compose ps meilisearch

# Check health
curl http://localhost:7700/health

# View logs
docker compose logs meilisearch

# Meilisearch UI: http://localhost:7700
```

### High memory/disk usage

```bash
# View disk usage
docker system df

# Remove unused layers/volumes (⚠️ careful)
docker system prune -a --volumes

# Rebuild without cache
docker compose build --no-cache
```

## Running Individual Commands

```bash
# Run tests in backend
docker compose exec backend pnpm test

# Run linting
docker compose exec backend pnpm lint
docker compose exec frontend pnpm lint

# Generate Prisma client
docker compose exec backend pnpm db:generate

# Access database shell
docker compose exec postgres psql -U theo -d theo_platform

# Access Redis
docker compose exec redis redis-cli -a ${REDIS_PASSWORD}

# View Next.js output
docker compose logs frontend
```

## Development Workflow

### Hot Reload Setup (Optional)

For development with live code changes, create `compose.override.yaml`:

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    volumes:
      - ./apps/backend/src:/app/apps/backend/src
    environment:
      NODE_ENV: development
    command: pnpm --filter backend dev

  frontend:
    volumes:
      - ./apps/frontend/src:/app/apps/frontend/src
    environment:
      NODE_ENV: development
    command: pnpm --filter frontend dev

  admin:
    volumes:
      - ./apps/admin/src:/app/apps/admin/src
    environment:
      NODE_ENV: development
    command: pnpm --filter admin dev
```

Then run:
```bash
docker compose -f compose.yaml -f compose.override.yaml up -d
```

### Local Development (Recommended)

For best DX during development, run locally with `pnpm dev`:

```bash
# Terminal 1: Backend
pnpm --filter backend dev

# Terminal 2: Frontend
pnpm --filter frontend dev

# Terminal 3: Admin (optional)
pnpm --filter admin dev

# Still need docker for infrastructure:
docker compose up postgres redis minio meilisearch

# Or start everything in Docker, but dev locally
```

## Cleanup & Reset

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v

# Stop and remove images too
docker compose down -v --rmi all

# Remove only stopped containers
docker container prune

# Full system cleanup (⚠️ removes all Docker data)
docker system prune -a --volumes
```

## Production Deployment

For production, see additional resources:

1. **Environment Security**
   - Use `.env` files with restricted permissions
   - Or use Docker secrets / environment management
   - Never commit `.env` to git

2. **Image Optimization**
   - Pin base image versions (node:20.11-alpine)
   - Scan for vulnerabilities: `docker scout cves`
   - Use multi-stage builds (already done)

3. **Resource Limits**
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

4. **Persistent Storage**
   - Use managed database (RDS, Supabase)
   - Use S3 instead of MinIO
   - Use managed Redis/cache
   - Use managed search (Algolia, Elasticsearch)

5. **Monitoring & Logging**
   - Sentry integration (configured)
   - Prometheus metrics (enabled)
   - Structured logging
   - Health check endpoints

6. **Reverse Proxy**
   - Add Nginx/Caddy in front
   - SSL/TLS termination
   - Load balancing

See `docker/compose.prod.yml` for production-specific configuration.

## Further Reading

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment/docker)
- [NestJS Deployment](https://docs.nestjs.com/deployment)
- [Turborepo Docker Best Practices](https://turbo.build/repo/docs/handbook/deploying-with-docker)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
