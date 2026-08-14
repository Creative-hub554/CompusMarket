# AGENTS.md

Pnpm + Turborepo monorepo. Three apps (`apps/frontend`, `apps/admin`, `apps/backend`) and three packages (`packages/config`, `packages/database`, `packages/ui`).

## Commands

```bash
pnpm install                           # install all deps
pnpm --filter @theo/database exec prisma generate   # regenerate client after schema changes
pnpm dev                               # turbo dev (all apps)
pnpm --filter backend dev              # NestJS API :4000
pnpm --filter frontend dev             # Next.js :3000
pnpm --filter admin dev --port 3001    # Next.js admin :3001

# Per-package (run from the package directory)
npx vitest run                         # unit tests
npx tsc --noEmit                       # typecheck
npx eslint .                           # lint
```

Node and pnpm are **not always in PATH** on this Windows machine. If commands fail, prepend:
```powershell
$env:PATH = "C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm" + ";$env:PATH"
```

The user's actual dev launcher is `start.bat` (run from the repo root): **Admin Mode** = frontend `:3000`, admin `:3001`, backend `:4000`; **Normal Mode** = `:3002`/`:3003`/`:4001`; custom ports available. Ports can also be overridden via `config.bat` (e.g. `STATIC_IP`). If a running app isn't on the default port, check `config.bat` first.

## Monorepo layout

| Directory     | Purpose                                             |
|---------------|-----------------------------------------------------|
| `apps/backend`| NestJS API. Source in `src/`, tests `*.spec.ts`     |
| `apps/frontend`| Next.js 15 public site + dashboard. Tests `*.test.{ts,tsx}` |
| `apps/admin`  | Next.js 15 admin dashboard                          |
| `packages/database` | Prisma schema, `@theo/database` client + shared enums/constants |
| `packages/ui` | Shared components, `@theo/ui`                       |
| `packages/config` | Placeholder package (strict `tsconfig.json` only). Not referenced by any app. Each app defines its own `tsconfig.json` and `eslint.config.mjs` (ESLint 9 flat config) |

Workspace import alias: `@theo/database` (from `packages/database`), `@theo/ui` (from `packages/ui`).

Backend modules in `apps/backend/src/` cover more than commerce: `auth`, `products`, `orders`, `cart`, `categories`, `search`, `upload`, `warranties`, plus `articles`, `resumes`, `ai`, `chat`, `notes`, `flashcards`, `quizzes`, `diagrams`, `documents`, `health`. Frontend pages live in `apps/frontend/src/app/`, admin pages in `apps/admin/src/app/admin/`.

## Test conventions

- **Backend**: `vitest`, `*.spec.ts` in `src/`, run with `npx vitest run`. Exclude `*.e2e-spec.ts`.
- **Frontend**: `vitest` + `@testing-library/react`, jsdom env, `*.test.{ts,tsx}`.
- Shared package: `packages/database/src/index.spec.ts` tests exported constants.

**Mock pattern (backend services):** use `vi.mock("module", () => ({...}))` before imports, mock Prisma via `{ provide: PrismaService, useValue: mockObject }` in the testing module, and call `vi.clearAllMocks()` in `beforeEach`.

## Environment

- `.env` files live per-app (`apps/backend/.env`, `apps/frontend/.env`, `apps/admin/.env`) and are gitignored.
- Root `.env.example` has the full list. Copy to `apps/<app>/.env.local` or `apps/<app>/.env`.
- **Database**: SQLite local (`file:./prisma/dev.db`), PostgreSQL in production (set `DATABASE_URL`).
- **Meilisearch**: `http://localhost:7700`, master key `masterKey`. Start locally: `meilisearch.exe --master-key masterKey` or `docker compose -f docker/compose.yml up -d` (copy `docker/.env.example` to `docker/.env` first — compose reads secrets from it; all ports are bound to `127.0.0.1`).
- **MinIO**: port 9000 (console :9001).
- **Redis**: `REDIS_URL=redis://localhost:6379` (runs via `docker/compose.yml`, which also provides PostgreSQL, MinIO, and Meilisearch).
- **Docker services are optional for dev**: the three node apps run on SQLite alone. If Docker is down, search auto-falls back to Prisma (`search.service.ts`), but uploads via MinIO will fail if `MINIO_ACCESS_KEY` is unset (`minio.service.ts`).
- Prisma schema lives at `packages/database/prisma/schema.prisma`. After editing it, run `pnpm --filter @theo/database exec prisma generate` then `pnpm --filter @theo/database db:push` for local dev.

## Code style

- Double quotes for imports and strings.
- Semicolons required.
- 2-space indent.
- TypeScript strict mode in every package (per-package `tsconfig.json`; no shared base config).

## Git workflow

- Conventional Commits (`fix:`, `feat:`, etc.).
- Branches: `feature/*`, `fix/*`, `refactor/*`.
- PRs require build passing and lint clean.

## Stale docs

- `README.md` and `CLAUDE.md` are **outdated/corrupted** (UTF-16 encoded; README still says "ComputMarket", CLAUDE.md is an HTTP-response dump). Do not trust them. The source of truth is this file and `project-guideline.md`.

## Do not modify

- **Do not make changes unless explicitly asked.** `.opencode/` contains opencode global/plugin config (`node_modules`, `package.json`) — leave it alone.
