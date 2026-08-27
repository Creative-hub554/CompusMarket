# AGENTS.md

Pnpm + Turborepo monorepo. Three apps (`apps/frontend`, `apps/admin`, `apps/backend`) and two packages (`packages/database`, `packages/ui`).

## Commands

```bash
pnpm install                           # install all deps
pnpm --filter @theo/database exec prisma generate   # regenerate client after schema changes
pnpm --filter @theo/database exec prisma db push    # apply schema to local SQLite
pnpm --filter @theo/database exec prisma db seed    # idempotent demo data (admin/categories/products/group/job)
pnpm dev                               # turbo dev (all apps)
pnpm --filter backend dev              # NestJS API :4000
pnpm --filter frontend dev             # Next.js :3000
pnpm --filter admin dev --port 3001    # Next.js admin :3001
```

# Per-package (run from the package directory)

```bash
npx vitest run                         # unit tests (backend excludes *.e2e-spec.ts)
npx vitest run --config vitest.e2e.config.ts   # backend e2e specs (separate config, 30s timeout)
npx vitest run src/auth/auth.service.spec.ts   # backend: single test file (from apps/backend)
npx vitest run src/components/Button.test.tsx  # frontend: single test file (from apps/frontend)
npx tsc --noEmit                       # typecheck
npx eslint .                           # lint
```

**Order matters after Prisma schema edits**: stop running dev servers first (they hold the query-engine DLL and `prisma generate` fails with EPERM), then `generate`, then `db push`.

Node and pnpm are **not always in PATH** on Windows. If commands fail, prepend PowerShell:
```powershell
$env:PATH = "C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm" + ";$env:PATH"
```

The dev launcher is `start.bat` (repo root): **Admin Mode** = frontend `:3000`, admin `:3001`, backend `:4000`; **Normal Mode** = `:3002`/`:3003`/`:4001`; custom ports available via `start.bat` options 2/3. Ports can also be overridden via `config.bat` (loaded from `start.bat`).

## Zombie dev processes (Windows gotcha)

Repeated launches leave orphaned `nest --watch` / Next watchers alive; a stale watcher re-grabs `:4000` on recompile causing `EADDRINUSE` even when the port looked free. Killing the port owner is not enough (parents respawn children). Kill by command line instead:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "nest start|pnpm.*dev" -and $_.CommandLine -notmatch "\.opencode" } | ForEach-Object { taskkill /PID $_.ProcessId /T /F }
```

Never blanket-kill `node.exe` — `.opencode/` tooling runs on node.

## Monorepo layout

| Directory     | Purpose                                             |
|---------------|-----------------------------------------------------|
| `apps/backend`| NestJS API. Source in `src/`, tests `*.spec.ts`. Global prefix `/api`; port = `PORT` env ?? 4000; loads its own `.env` via dotenv |
| `apps/frontend`| Next.js 15 public site. Tests `*.test.{ts,tsx}`    |
| `apps/admin`  | Next.js 15 admin dashboard (no i18n)                |
| `packages/database` | Prisma schema, `@theo/database` client + shared enums/constants |
| `packages/ui` | Shared components (`Button`, `Card`, `Badge`, `Input`), `@theo/ui` — source-exported, no build step |

Workspace aliases: `@theo/database`, `@theo/ui`; both Next apps also alias `@` → `./src`.

Backend modules: `auth`, `products`, `orders`, `cart`, `categories`, `search`, `upload`, `warranties`, `articles`, `resumes`, `jobs`, `groups`, `ai`, `notes`, `flashcards`, `quizzes`, `diagrams`, `documents`, `health`, `social` (posts/follows/stories/notifications). Chat is thread-based (`threads.service.ts` + Socket.IO `chat.gateway.ts`) — there is no `Conversation` model. Group chat = one `Thread` per group (`Thread.groupId @unique`, participants mirror membership); group posts fan out `GROUP_POST` notifications from `groups.service`. Chat stickers (`sticker:emoji` content prefix) and slash commands (`/shrug`, `/me`, …) are client-side conventions in `messages/[id]` — the backend stores them as plain content.

## Frontend i18n (critical conventions)

- **All pages live under `apps/frontend/src/app/[locale]/`** (plus root-level `api/`, `robots.ts`, `sitemap.ts`, `manifest.ts`). `routing.ts`: locales `en`/`km`, default `km`, `localePrefix: "always"` — every URL is prefixed (`/km/...`, `/en/...`).
- **Client components must import `Link`, `useRouter` from `@/i18n/navigation`** (NOT `next/link` / `next/navigation`), otherwise navigation bypasses locale prefixes and bounces through middleware redirects.
- New UI text goes in **both** `apps/frontend/messages/en.json` and `km.json`.
- **Vitest**: `next-intl` must stay in `server.deps.inline` (`vitest.config.ts`) or its ESM import of `next/navigation` fails to resolve under pnpm. Tests rendering pages that use the i18n `Link` should `vi.mock("@/i18n/navigation")` with an anchor stub.
- Brand strings are single-sourced in `apps/frontend/src/lib/site.ts` (`SITE_NAME`, `getSiteUrl()` from `NEXT_PUBLIC_SITE_URL`) — used by metadata, JSON-LD, sitemap.
- Tailwind v4 is CSS-first: no `tailwind.config`; tokens live in `@theme` in `src/app/globals.css`, which also `@source`s `packages/ui/src`. Shared primitives (`.btn-primary`, `.card-hover`, `.page-title`, `.input-field`, …) are hand-written utilities in that file — restyling them propagates site-wide.
- **km.json fallback**: some new keys (market, jobs, nav) were NOT added to `km.json` to avoid garbling Khmer. They fall back to `en` via `next-intl`. This is a known follow-up — add Khmer translations when ready.

## Auth architecture

- Frontend NextAuth (credentials → Prisma bcrypt) mints backend-compatible JWTs (`sub`/`email`/`role`, 1h) signed with the shared `AUTH_SECRET`; backend `JwtStrategy` reads those claims. `useAuthedFetch` silently re-mints via `session.update()` on a 401.
- Refresh tokens: hashed in the `RefreshToken` table, rotated on `/auth/refresh` with reuse detection (presenting a revoked token revokes the user's whole token family).
- Shared env helpers live in `apps/backend/src/common/config.ts` (`getAuthSecret`, `getCorsOrigins`) — use them instead of reading env directly.
- Rate limiting is a fixed-window guard backed by Redis (`REDIS_URL`) with in-memory fallback (`common/rate-limit.guard.ts`).

## Seller vs admin write paths

- **Sellers never call NestJS mutations directly.** They go through Next.js route handlers `apps/frontend/src/app/api/seller/*`, which check `getToken`, require an APPROVED `SellerProfile`, and enforce product ownership before touching Prisma.
- NestJS `PATCH /products/:id` is `ADMIN`/`INVENTORY_MANAGER` only. `GET /products/promos` is public (shoppable-video promos: `Product.videoUrl`/`videoActive`).

## Frontend auth proxy

Writes go through `apps/frontend/src/app/api/[...proxy]/route.ts` which re-signs the JWT from the NextAuth session. `ALLOWED_PREFIXES` includes: `/api/ai`, `/api/resumes`, `/api/notes`, `/api/flashcards`, `/api/quizzes`, `/api/diagrams`, `/api/documents`, `/api/articles`, `/api/threads`, `/api/posts`, `/api/groups`, `/api/feed`, `/api/profiles`, `/api/users`, `/api/suggestions`, `/api/stories`, `/api/notifications`, `/api/support`, `/api/warranties`, `/api/upload`, `/api/search`, `/api/categories`, `/api/products`, `/api/orders`, `/api/jobs`, `/api/cart`, `/api/health`. When adding a new NestJS module, add its prefix here too.

## Real-time notifications

Shared `EventEmitter` singleton at `apps/backend/src/realtime/notification.events.ts` decouples social module notification creation from WebSocket delivery. Event constant: `NOTIFICATION_CREATED = "created"`. The `ChatGateway.onModuleInit` subscribes to this emitter and broadcasts to connected clients. **Critical**: call `notificationEvents.removeAllListeners(NOTIFICATION_CREATED)` before `.on(...)` in `onModuleInit` to avoid stacking duplicate listeners under HMR hot-reload.

## Test conventions

- **Backend**: `vitest`, `*.spec.ts` in `src/`, `npx vitest run`. Exclude `*.e2e-spec.ts` (separate config, 30s timeout).
- **Frontend**: `vitest` + `@testing-library/react`, jsdom, `*.test.{ts,tsx}`.
- Mock pattern (backend): `vi.mock("module", () => ({...}))` before imports, Prisma via `{ provide: PrismaService, useValue: mockObject }`, `vi.clearAllMocks()` in `beforeEach`.

## Environment

- `.env` files are per-app (`apps/backend/.env`, `apps/frontend/.env`, `apps/admin/.env`), gitignored; root `.env.example` has the full list.
- **Database**: `DATABASE_URL` (per-app `.env`) selects the engine; local default `file:./prisma/dev.db`, CI uses `file:./dev.db`. PostgreSQL in production.
- **Meilisearch**: `http://localhost:7700`, master key `masterKey` (`meilisearch.exe --master-key masterKey` or `docker compose -f docker/compose.yml up -d`; copy `docker/.env.example` to `docker/.env` first — compose reads secrets from it; ports bound to `127.0.0.1`).
- **MinIO**: :9000 (console :9001). **Redis**: `redis://localhost:6379`.
- **Docker services are optional for dev**: the node apps run on SQLite alone; search falls back to Prisma when Meilisearch is down, but MinIO uploads fail without `MINIO_ACCESS_KEY`.

## Code style

- Double quotes, semicolons, 2-space indent, TypeScript strict everywhere (per-package tsconfig, no shared base).
- PowerShell gotcha: bracket route paths (`app/[locale]`, `[id]`) need `-LiteralPath` with `Get-Content`/`Set-Content`.

## Git workflow

- Conventional Commits (`fix:`, `feat:`); branches `feature/*`, `fix/*`, `refactor/*`.
- CI (`.github/workflows/ci.yml`, pnpm 9 + Node 20): `prisma generate` → `pnpm build` → lint → `turbo run test` on PRs and pushes to `main`/`develop`. Set dummy `AUTH_SECRET`/`JWT_SECRET`/`DATABASE_URL=file:./dev.db` when running locally.
- Remote: `github.com/Creative-hub554/CompusMarket`. On this machine plain `git push` fails (blank `credential.helper` in `~/.gitconfig` disables the system credential manager) — use `git -c credential.helper=manager push`.
- Never force-push without explicit user confirmation; `origin/main` has history that was rewritten once already.

## Docs

- `README.md` (rewritten) and `project-guideline.md` are the prose references; this file wins on conflicts. `CLAUDE.md` was deleted — don't look for it.

## Do not modify

- **Do not make changes unless explicitly asked.** `.opencode/` contains opencode global/plugin config (`node_modules`, `package.json`) — leave it alone.