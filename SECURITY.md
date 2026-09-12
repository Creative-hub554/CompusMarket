# Security — Credential Rotation Log

> Do **not** commit actual secrets here. This file records **when** and **why**
> credentials were rotated, following `SECURITY-ROTATION.md`.

## Credential Rotation Log

### Database Credentials (theo user, local Docker stack)

- **Last rotated:** 2026-09-09
- **Next rotation:** 2026-12-15 (semi-annual per SECURITY-ROTATION.md §3)
- **Change:** New 40-character password generated and applied via
  `ALTER USER theo WITH PASSWORD ...`; `POSTGRES_PASSWORD` and `DATABASE_URL`
  (percent-encoded) updated in `docker/.env`; full stack force-recreated so
  every container picked up the new credentials.
- **Verification:** SCRAM auth from a separate container succeeded with the new
  password (`select 1` → `1`) and **failed** with the old password (P1000 /
  `password authentication failed`); `backend-db-init` exited 0; backend
  `/api/health/ready` reports `db: up, redis: up`.
- **Notes:** Rotation was required (not routine) — the previous password had
  appeared in an agent transcript during a debugging session. All `docker/.env.bak-*`
  backup files were permanently deleted as part of this rotation. Repeatable
  procedure kept at `docker/rotate-db-password.mjs` (updates `docker/.env` only;
  print no secrets; delete any staging backups after verification).

### Auth Secrets

- **Last rotated:** not yet recorded
- **Next rotation:** quarterly per SECURITY-ROTATION.md
- **Change:** —
- **Notes:** `AUTH_SECRET` / `JWT_SECRET` / `NEXTAUTH_SECRET` exist in
  `docker/.env`; rotate them on the quarterly cadence.

### Third-Party Keys (OpenAI, OpenRouter, MinIO, Meilisearch)

- **Last rotated:** not yet recorded
- **Next rotation:** quarterly per SECURITY-ROTATION.md §4
- **Change:** —
- **Notes:** —

### Dependency Security Patch
- **Applied:** 2026-09-10
- **Change:** 8 semver-safe fixes via pnpm audit --fix (+overrides); advisories 18 -> 0
- **Deferred (majors):** none
- **Verification:** pnpm build gate passed; pending: full test suite + stack recreate

### Dependency Security Patch
- **Applied:** 2026-09-10
- **Change:** 8 semver-safe fixes via pnpm audit --fix (+overrides); advisories 18 -> 0
- **Deferred (majors):** none
- **Verification:** pnpm build gate passed; pending: full test suite + stack recreate

> Note: the 2026-09-10 entries above were drill runs proving the apply/rollback flows (18->0 advisories, build gate pass; induced gate failure -> exit 1 + git-restore). The patch diff was restored to HEAD afterward pending human review per SECURITY-ROTATION.md; re-run `node scripts/security-patch.mjs` to apply for real.
