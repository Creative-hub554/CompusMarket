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

## Monorepo layout

| Directory     | Purpose                                             |
|---------------|-----------------------------------------------------|
| `apps/backend`| NestJS API. Source in `src/`, tests `*.spec.ts`     |
| `apps/frontend`| Next.js 15 public site + dashboard. Tests `*.test.{ts,tsx}` |
| `apps/admin`  | Next.js 15 admin dashboard                          |
| `packages/database` | Prisma schema, `@theo/database` client + shared enums/constants |
| `packages/ui` | Shared components, `@theo/ui`                       |
| `packages/config` | Shared TS/ESLint configs                        |

Workspace import alias: `@theo/database` (from `packages/database`), `@theo/ui` (from `packages/ui`).

## Test conventions

- **Backend**: `vitest`, `*.spec.ts` in `src/`, run with `npx vitest run`. Exclude `*.e2e-spec.ts`.
- **Frontend**: `vitest` + `@testing-library/react`, jsdom env, `*.test.{ts,tsx}`.
- Shared package: `packages/database/src/index.spec.ts` tests exported constants.

**Mock pattern (backend services):** use `vi.mock("module", () => ({...}))` before imports, mock Prisma via `{ provide: PrismaService, useValue: mockObject }` in the testing module, and call `vi.clearAllMocks()` in `beforeEach`.

## Environment

- `.env` files live per-app (`apps/backend/.env`, `apps/frontend/.env`, `apps/admin/.env`) and are gitignored.
- Root `.env.example` has the full list. Copy to `apps/<app>/.env.local` or `apps/<app>/.env`.
- **Database**: SQLite local (`file:./prisma/dev.db`), PostgreSQL in production (set `DATABASE_URL`).
- **Meilisearch**: `http://localhost:7700`, master key `masterKey`. Start locally: `meilisearch.exe --master-key masterKey` or `docker compose -f docker/compose.yml up -d`.
- **MinIO**: port 9000 (console :9001).
- Prisma schema lives at `packages/database/prisma/schema.prisma`. After editing it, run `pnpm --filter @theo/database exec prisma generate` then `pnpm --filter @theo/database db:push` for local dev.

## Code style

- Double quotes for imports and strings.
- Semicolons required.
- 2-space indent.
- TypeScript strict mode (`packages/config/tsconfig.json`).

## Git workflow

- Conventional Commits (`fix:`, `feat:`, etc.).
- Branches: `feature/*`, `fix/*`, `refactor/*`.
- PRs require build passing and lint clean.

## Do not modify

- See `.opencode/project-rules.md`: **Do not make changes unless explicitly asked.**
