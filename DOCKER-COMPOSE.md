# Docker Compose Setup Guide

## Quick Start

### 1. Populate secrets

Copy the template env files and fill in strong, unique values:

```bash
# Infrastructure secrets (PostgreSQL, MinIO, Redis, Meilisearch)
cp docker/.env.example docker/.env
# Edit docker/.env and set:
#   POSTGRES_PASSWORD=<strong-password>
#   MINIO_ROOT_USER=admin
#   MINIO_ROOT_PASSWORD=<strong-password>
#   REDIS_PASSWORD=<strong-password>
#   MEILI_MASTER_KEY=<strong-key>

# Application secrets (auth, API keys, URLs)
cp .env.example .env
# Edit .env and set:
#   AUTH_SECRET=<32+ char random string>
#   JWT_SECRET=<32+ char random string>
#   NEXTAUTH_SECRET=<32+ char random string>
#   OPENAI_API_KEY=<your-key> (or OPENROUTER_API_KEY)
#   MINIO_ACCESS_KEY=<same as MINIO_ROOT_USER>
#   MINIO_SECRET_KEY=<same as MINIO_ROOT_PASSWORD>
```

### 2. Build and start the full stack

The canonical project composition lives in the root `compose.yaml`
(auto-detected by `docker compose`). For a debug overlay with Node.js
inspectors attached, use `compose.debug.yaml`.

```bash
docker compose up --build --pull always
```

This brings up:
- **PostgreSQL** (port 127.0.0.1:5432)
- **MinIO** (port 127.0.0.1:9000, console 9001)
- **Redis** (port 127.0.0.1:6379)
- **Meilisearch** (port 127.0.0.1:7700)
- **NestJS backend** (port 4000)
- **Next.js frontend** (port 3000)
- **Next.js admin** (port 3001)

All three services depend on healthy infra, so they wait for database/cache/search to be ready.

On first boot a one-off **`backend-db-init`** container automatically applies the Prisma schema (`prisma db push`) and runs the idempotent demo seed (`prisma db seed`) before the backend starts, so the stack works out-of-the-box on a fresh PostgreSQL volume. The seed creates the admin user plus demo categories/products:

- **Admin login**: `SEED_ADMIN_EMAIL` (default `admin@example.com`), `SEED_ADMIN_PASSWORD` (default `change-me`)

The seed is upsert-based, so it is safe to re-run on every boot. Set `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` to change the initial admin credentials.

### 3. Access the apps

- Frontend: http://localhost:3000
- Admin: http://localhost:3001
- Backend API: http://localhost:4000/api
- MinIO Console: http://localhost:9001

### 4. Initial admin (automatic in Docker)

In Docker the schema + seed are applied automatically by the `backend-db-init` container
on first boot, so no manual step is needed. Log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

For local (non-Docker) dev, run the seed manually:
```bash
pnpm --filter @theo/database exec prisma db seed
```

## Build Details

### Multi-stage Dockerfiles

- **Backend** (`apps/backend/Dockerfile`): Node.js 20 → Turbo prune → NestJS build → Alpine runtime
- **Frontend** (`apps/frontend/Dockerfile`): Node.js 20 → Turbo prune → Next.js build (standalone output) → Alpine runtime
- **Admin** (`apps/admin/Dockerfile`): Node.js 20 → Turbo prune → Next.js build (standalone output) → Alpine runtime

Each Dockerfile uses `turbo prune --docker` to extract only required workspace packages, ensuring minimal layer sizes and fast rebuilds after code changes.

### Environment Variables at Build vs. Runtime

**Build-time only** (via ARG in Dockerfile):
- `NEXT_PUBLIC_API_URL` (frontend)
- `NEXT_PUBLIC_SITE_URL` (frontend)

**Runtime** (loaded from `compose.yaml` `environment`, sourcing the root `.env`):
- `DATABASE_URL` (backend, frontend, admin)
- `AUTH_SECRET`, `JWT_SECRET`, `NEXTAUTH_SECRET`
- `REDIS_URL`, `MEILI_HOST`, `MEILI_API_KEY`
- `MINIO_*` credentials
- All `NEXT_PUBLIC_*` vars (frontend/admin)

Runtime secrets override .env files via the compose file's `env_file` directive.

## Port Bindings

| Service | Port | Binding |
|---------|------|---------|
| PostgreSQL | 5432 | 127.0.0.1 (local dev only) |
| MinIO | 9000 | 127.0.0.1 (local dev only) |
| MinIO Console | 9001 | 127.0.0.1 (local dev only) |
| Redis | 6379 | 127.0.0.1 (local dev only) |
| Meilisearch | 7700 | 127.0.0.1 (local dev only) |
| Backend | 4000 | 0.0.0.0 (accessible) |
| Frontend | 3000 | 0.0.0.0 (accessible) |
| Admin | 3001 | 0.0.0.0 (accessible) |

Infra services are intentionally bound to 127.0.0.1 for security in dev. For production, use network policies or a reverse proxy (e.g., nginx).

## Troubleshooting

### Backend fails to start: "database connection refused"
- Ensure PostgreSQL is healthy: `docker compose ps`
- Check logs: `docker compose logs postgres`
- Verify `DATABASE_URL` in `compose.yaml` matches `POSTGRES_USER`/`POSTGRES_PASSWORD`

### Frontend shows "API unreachable"
- Verify backend is healthy and listening on 4000: `docker compose logs backend`
- Ensure `NEXT_PUBLIC_API_URL` is set to `http://localhost:4000` or the backend's actual URL
- Check CORS settings in backend (`CORS_ORIGIN` env)

### MinIO credentials rejected
- Ensure `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` in `docker/.env` match `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` in `.env`
- Regenerate MinIO credentials and restart: `docker compose restart minio`

### Rebuild a single service
```bash
docker compose up --build backend     # rebuild only backend
docker compose up --build --no-deps frontend  # rebuild only frontend (skip dependencies)
```

### Clean up volumes and start fresh
```bash
docker compose down -v     # remove all volumes
docker compose up --build  # rebuild and restart
```

## Next Steps

- Set up CI/CD to build and push images to a registry
- Add a reverse proxy (nginx) in front of the three apps for production routing
- Configure PostgreSQL replication/backup strategy
- Set up monitoring/logging (Docker logging driver, Prometheus, etc.)
