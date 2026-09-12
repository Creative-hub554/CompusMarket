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

## Getting started (single canonical startup path)

The Docker stack is the **only** way to run champey. Secrets live in **one** file:
`docker/.env` (copy from `docker/.env.example`). Never duplicate this stack or
its `.env` — a second copy with stale secrets caused the 2026-09-09 outage.

```bash
cp docker/.env.example docker/.env   # fill in secrets (once)

# Option A — all-in Docker (recommended)
./start.bat                          # then pick "Stack"
# or: docker compose --profile monitoring up -d

# Option B — hot-reload dev (stack infra + host dev servers)
./start.bat dev
# (= docker compose up -d postgres redis meilisearch minio
#    node scripts/sync-dev-env.mjs
#    pnpm --filter backend dev  +  frontend :3000  +  admin :3001)

# After changing any secret in docker/.env:
node scripts/sync-dev-env.mjs        # propagate into app env files (and root .env)
node scripts/sync-dev-env.mjs --check  # verify (exit 1 on drift)

# Full health check + auto-repair of known failure modes:
./start.bat check                    # or: node scripts/health-check.mjs

# On-demand data snapshot (postgres + meilisearch + minio):
./start.bat backup                   # or: node scripts/backup.mjs
# -> output/backups/<YYYY-MM-DD>/, keeps BACKUP_RETENTION_DAYS (default 7) days

# Weekly dependency & vulnerability scan (SECURITY-ROTATION.md section 1):
./start.bat audit                    # or: node scripts/dependency-audit.mjs
# -> output/dependency-audit/<YYYY-MM-DD>/ (also runs Mondays 02:00 via Task
#    Scheduler "champey-dependency-audit"). Safe patch flow:
node scripts/security-patch.mjs --dry-run   # review the plan
node scripts/security-patch.mjs             # apply semver-safe fixes + build gate
```

**Canonical ports** — storefront 3000, admin 3001, backend 4000;
infra on 127.0.0.1: postgres 5432, redis 6379, meilisearch 7700, minio 9000/9001;
monitoring: Grafana 3002, Prometheus 9090, stack-health feed 9701.

**Stack health in Grafana** — `start.bat stack` (and the daily 08:00 Task Scheduler
check) runs `scripts/health-check.mjs --metrics-out`, emitting `champey_*` gauges
through a local metrics feed (`scripts/metrics-server.mjs`, 127.0.0.1:9701) that
Prometheus scrapes. The provisioned "Champey Platform" dashboard shows a
"Stack health (auto-repair)" timeline plus a staleness stat; Grafana alerts on
`champey_stack_healthy == 0` and a stale feed.

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
- **Dependency security** — the weekly scan (`start.bat audit`, Task Scheduler Mondays 02:00)
  runs `pnpm audit` + `pnpm outdated`, writes dated reports and an append-only history CSV to
  `output/dependency-audit/`, and exits 1 when high/critical advisories exist. Semver-safe fixes
  are applied by `scripts/security-patch.mjs` (pnpm audit --fix + overrides, build gate, scoped
  git-restore rollback); semver-major fixes are deferred to the quarterly review per
  [SECURITY-ROTATION.md](./SECURITY-ROTATION.md) §1.
- **Backups** — run `./start.bat backup` for an on-demand snapshot to `output/backups/`
  (pg_dump custom format, Meilisearch dump, MinIO bucket tarball, per-run manifest; keeps the
  newest `BACKUP_RETENTION_DAYS` day folders). The prod `backup` profile additionally runs
  `docker/backup/backup.sh` on a cron (`BACKUP_CRON`, default daily 03:00 UTC) writing logical
  Postgres dumps, a MinIO mirror, and a Meilisearch dump to a retained volume (default 7 days).
- **Error alerting** — Sentry is wired into the backend, storefront, and admin; set `SENTRY_DSN`
  (and `NEXT_PUBLIC_SENTRY_DSN` for browser errors). Grafana alerts notify `OPS_EMAIL` /
  `OPS_WEBHOOK_URL`.
