# KHMERONLINESHOP

Smart commerce & community platform for Cambodia: storefront, seller marketplace, social feed, and AI assistant.

## Stack

- **Monorepo:** pnpm + Turborepo
- **Apps**
  - `apps/frontend` — Next.js 15 storefront (App Router, next-intl en/km)
  - `apps/admin` — Next.js 15 admin panel
  - `apps/backend` — NestJS 11 API (port 4000, prefix `/api`)
- **Packages** — `packages/database` (Prisma; SQLite dev / PostgreSQL prod), `packages/ui`, `packages/config`
- **Infra (docker/)** — MinIO (file storage), Meilisearch, Redis, nginx, plus composition files (see Production ops)

## Getting started

```bash
pnpm install
cp .env.example apps/backend/.env   # fill in secrets
pnpm dev                            # turbo dev
```

See [AGENTS.md](./AGENTS.md) for architecture details, test conventions, and environment setup.

## Production ops

A complete Docker Compose production stack is provided at `docker/compose.prod.yml`
(secrets in `docker/.env`, copied from `docker/.env.example`).

```bash
# Full platform (Postgres, MinIO, Redis, Meilisearch + backend, frontend, admin, nginx)
docker compose -f docker/compose.prod.yml up -d

# + monitoring (Prometheus, Grafana, node + postgres exporters)
docker compose -f docker/compose.prod.yml --profile monitoring up -d

# + nightly backups (Postgres / MinIO / Meilisearch)
docker compose -f docker/compose.prod.yml --profile backup up -d
```

- **Health checks** — `GET /api/health` (all services), `/api/health/ready` (DB+Redis gate),
  `/api/health/live` (liveness), and `GET /healthz` on the storefront/admin for container probes.
- **Monitoring** — backend exposes Prometheus metrics at `GET /api/metrics` (enable via
  `METRICS_ENABLED=true`). Prometheus scrapes the backend, host, and Postgres; Grafana ships a
  pre-provisioned dashboard (`docker/grafana/provisioning/dashboards/champey.json`) and alert
  rules (see `docker/prometheus/alerts.yml`).
- **Backups** — the `backup` profile runs `docker/backup/backup.sh` on a cron
  (`BACKUP_CRON`, default daily 03:00 UTC) writing logical Postgres dumps, a MinIO mirror, and a
  Meilisearch dump to a retained volume (default 7 days).
- **Error alerting** — Sentry is wired into the backend, storefront, and admin; set `SENTRY_DSN`
  (and `NEXT_PUBLIC_SENTRY_DSN` for browser errors). Grafana alerts notify `OPS_EMAIL` /
  `OPS_WEBHOOK_URL`.
