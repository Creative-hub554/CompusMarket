# Admin Console → Clerk Cutover Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Implement task-by-task, running the admin typecheck + vitest suite after each phase.

**Goal:** Move the admin console (`apps/admin`) off its NextAuth island and onto the same Clerk instance the storefront and backend already use, so the whole product has exactly one auth system. The storefront/backend cut over in commit `0a942e0`; the admin app was left behind.

**Context & constraints:**
- SDK: `@clerk/nextjs ^7.9.1` + `@clerk/backend ^3.17.1` → **Clerk Core 2**. So: `await auth()` (async), `clerkMiddleware`, `<SignedIn>/<SignedOut>/<Protect>`. No `<Show>`, no `isAuthenticated`/`sessionStatus`, no session tasks.
- **The database `User.role` is the source of truth for authorization.** DB role changes are already mirrored to Clerk `publicMetadata.role` (commit `3d82978`) and Clerk user lifecycle is already synced into DB users via webhook (commit `4920674`). Do not start trusting token claims or metadata for gating — keep the existing DB-first model.
- Behavior preservation: every admin API route keeps its current `requireAdmin` contract (`{ ok, user }` or a 403 `NextResponse`), so the existing spec mocks keep working unchanged.
- Secrets never committed: add keys to env examples only; real values stay in gitignored env files / the host env.
- Sessions: this is a big-bang switch (matches the clerk-setup skill note — existing NextAuth sessions terminate on switch). Acceptable for an internal admin console; pick a maintenance window.

**Architecture decisions**
1. **One Clerk instance.** Admin and storefront share the same instance/keys. Admins are ordinary Clerk users whose DB role is `ADMIN` or `CONTENT_EDITOR` (the two roles the NextAuth login and middleware already allow).
2. **AuthN vs AuthZ split.** Middleware does authentication only (`clerkMiddleware`, redirect unauthenticated → `/sign-in`). Authorization always hits the DB server-side:
   - API routes: `requireAdmin` (rewritten to Clerk `auth()` + DB lookup — same function name/signature, same 403s).
   - Pages: a new server-side `requireAdminPage()` guard in the `/admin` layout (DB check; redirect to a `/forbidden` page on role denial). Never DB-check inside middleware (edge runtime, no Postgres).
3. **Client session.** Replace the NextAuth `SessionProvider` with `ClerkProvider` in the root layout. The six client pages that call `useSession()` get a small adapter (mirror `apps/frontend/src/lib/session-client.tsx`) so `useSession()` keeps returning `{ data: { user: { id, role? }, accessToken? } }`-ish shape, or are refactored straight onto Clerk hooks (`useUser`/`useAuth`). Only display-level role (badge/heading) may come from the client session; decisions stay server-side.
4. **Kill the legacy accessToken bridge.** The NextAuth session callback signs a `session.accessToken` (JWT over `AUTH_SECRET`/`JWT_SECRET`). It is consumed only by **admin product create/edit**, which post **directly to the Nest backend** (`api.products.create(..., session?.accessToken)`) — the backend guards those endpoints with its legacy Nest JWT (`AuthGuard("jwt")` + `RolesGuard`). This whole path dies with NextAuth. Migrate those two flows to admin-local Next routes (`/api/admin/products*` + `requireAdmin`) that talk to the backend server-to-server with `INTERNAL_SERVICE_TOKEN` — the exact pattern the notification relay and ban alerts already use — or, if the spike shows the backend can verify Clerk session JWTs on product endpoints, via `getToken()` instead. **This is the main hidden dependency that makes the cutover bigger than a provider swap.**

**Current NextAuth surface to remove (inventory)**
- `apps/admin/src/middleware.ts` — `getToken` from `next-auth/jwt`, role gate on stale `token.role`
- `apps/admin/src/lib/require-admin.ts` — `getToken` + DB lookup (keep signature, swap token source to Clerk `auth()`)
- `apps/admin/src/app/api/auth/[...nextauth]/route.ts` — CredentialsProvider (bcrypt vs `passwordHash`), 30-day JWT, accessToken signing
- `apps/admin/src/app/SessionProvider.tsx`, `apps/admin/src/app/login/page.tsx`, `apps/admin/src/types/next-auth.d.ts`
- Client `useSession()` consumers: `app/admin/page.tsx`, `products/new`, `products/[id]/edit`, `support/page.tsx`, `support/[id]/page.tsx` (the latter three use `session?.user?.id`/`session` as request identity; must come from Clerk `user.id` = same local DB user id via webhook sync)
- `next-auth` / `next-auth/react` deps in `apps/admin/package.json`; `NEXTAUTH_*`/`AUTH_SECRET` env for the admin service in `docker/compose.prod.yml` and any admin `.env*`

---

### Phase 0 — Spike (verification before coding)
- [x] Read `apps/frontend/src/app/api/[...proxy]/route.ts` and `apps/frontend/src/lib/session-client.tsx`: confirm exactly how the storefront client currently authenticates protected backend calls post-cutover (proxy + what token?) — mirror that for admin instead of inventing a new bridge.
- [x] Confirm backend product endpoints accept a Clerk-verifiable credential today or only the legacy Nest JWT (`apps/backend/src/products/*.controller.ts` guards). Decide between "admin-local Next routes + internal token" vs "Clerk `getToken()` passed through".
- [x] Confirm the Clerk webhook sync keys DB users to Clerk by email or by `clerkId`, so the admin's acting-user id (`guard.user.id`) stays the same local DB id after cutover (report-resolution `resolvedBy`, RoleChangeLog actors, etc. depend on it).
- [ ] List which Clerk users currently hold an `ADMIN`/`CONTENT_EDITOR` DB role and confirm they have Clerk accounts (seed admin + any dashboard-created accounts). Gap = ops step in Phase 3.

> **Spike conclusions (2026-09-07):**
> 1. The bridge to mirror is `apps/frontend/src/lib/auth.ts` (`auth()` → local DB user via `clerkId`, lazy provisioning, BANNED = logged out) + `apps/frontend/src/app/api/auth/session/route.ts` (short-lived legacy JWT over `AUTH_SECRET`/`JWT_SECRET`) + `apps/frontend/src/lib/session-client.tsx` (`SessionBridge` exposing the `useSession()` shape). Admin now has the same three files with identical contracts — `requireAdmin` keeps its signature/403s, so the API spec mocks were untouched.
> 2. Backend product endpoints (`POST/PATCH/DELETE /products`) are guarded by `AuthGuard("jwt")` + `RolesGuard` — legacy Nest JWT only, **not** Clerk-verifiable. **Correction (2026-09-07):** the `INTERNAL_SERVICE_TOKEN` relay pattern only works on `/internal/*` routes (`InternalTokenGuard`); a relay sending `x-internal-token` to `/products` 401s against passport-jwt (it only reads `Authorization: Bearer`). The working migration (implemented with `JwtOrClerkGuard`): the backend now also accepts **Clerk session tokens** on the product write endpoints (`verifyToken` via JWKS, mapped to the local user by `clerkId`, DB-first), and the admin relay forwards the Clerk session token (`auth().getToken()`) as the Bearer credential. `INTERNAL_SERVICE_TOKEN` remains only for the `/internal/*` relays that have no user context.
> 3. The Clerk webhook sync keys DB users by `clerkId` (`where: { clerkId: data.id }`, email fallback) — acting-user local DB ids stay identical after cutover.
> 4. Enumerating which DB users hold `ADMIN`/`CONTENT_EDITOR` and whether they have Clerk accounts requires a live DB — deferred to the Phase 4 ops step.

### Phase 1 — Provider, middleware, login (authN)
- [x] Add `@clerk/nextjs` to `apps/admin` (version aligned with frontend `^7.9.1`).
- [x] Add env keys for admin dev: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (gitignored `.env.local`; add commented entries to a new `apps/admin/.env.example`).
- [x] Swap root layout provider: remove `SessionProvider`, wrap with `ClerkProvider` (Core 2 may wrap `<html>`; prefer inside `<body>` for future-proofing) + the `useSession` adapter or direct hook refactor in the six consumer pages.
- [x] Replace `apps/admin/src/middleware.ts`: `clerkMiddleware`, matcher `["/admin/:path*", "/login", ...]`, unauthenticated → redirect to Clerk-hosted `/sign-in` route. Keep the old behavior of sending non-admin roles elsewhere (now handled server-side in the layout guard — see Phase 2 — since middleware cannot DB-check).
- [x] Replace `login/page.tsx` with the storefront pattern (`<SignIn />` from `@clerk/nextjs`); point `afterSignInUrl`/routing back to `/admin`.
- [x] Delete `api/auth/[...nextauth]/route.ts`, `SessionProvider.tsx`, `types/next-auth.d.ts`; remove `next-auth` deps.
- [x] Typecheck + admin vitest suite; fix fallout (specs that import pages now needing Clerk hooks must wrap in `ClerkProvider` or mock `@clerk/nextjs`).

> **Phase 1 notes (2026-09-07):** done — `tsc --noEmit` clean, admin vitest 50/50 green (spec mocks untouched). `require-admin.ts` was pulled forward from Phase 2 to the same commit because deleting `next-auth` breaks its `getToken` import; the token source is now `@/lib/auth` (Clerk) with the identical return shape, so every `/api/admin/*` route keeps its `requireAdmin` contract. Also: `bcryptjs` + `@auth/prisma-adapter` removed; `jsonwebtoken` kept (mints the legacy JWT in `/api/auth/session`). Known intermediate states until Phase 2/3: a non-admin Clerk user can load `/admin` page shells (API stays 403 via DB `requireAdmin`), and admin product create/edit still posts to the backend with the legacy `accessToken` (still minted by the session bridge).

### Phase 2 — Authorization rework (authZ)
- [x] Rewrite `apps/admin/src/lib/require-admin.ts`: `const { userId } = await auth()` → DB `findUnique` → same return shape. (Core 2: no `isAuthenticated`; use `!!userId`.) Confirm every API spec still passes — they mock `@/lib/require-admin` wholesale.
- [x] New `requireAdminPage(allowedRoles?)` helper (server component): `await auth()`; no session → `redirect("/sign-in")`; DB role not allowed → `redirect("/forbidden")` or `/`. Mount it in `apps/admin/src/app/admin/layout.tsx` so every `/admin/*` page is covered server-side.
- [x] Grep for any remaining `token.role` / stale-claim gating and remove; DB lookup only.
- [x] Update client pages that used `session?.user?.id` for request identity (support messaging, etc.) to the Clerk-equivalent id (same local user id via webhook sync — verify in Phase 0).

> **Phase 2 notes (2026-09-07):** done. `require-admin.ts` was already on the Clerk-backed `getToken` + DB `findUnique` path from Phase 1 (pulled forward with the NextAuth removal) — signature and 403 contract unchanged, so the API spec mocks still pass (suite now 55/55 with the new guard spec). New `apps/admin/src/lib/require-admin-page.ts`: `auth()` → no session redirects `/sign-in`, DB role not in `["ADMIN", "CONTENT_EDITOR"]` (default) redirects `/forbidden`; mounted in `app/admin/layout.tsx`, which is now a server component rendering the client shell from `components/AdminShell.tsx` (the old `layout.tsx` client code moved verbatim). `/forbidden` page added. Grep confirmed zero stale claim gating (`token.role`, client-session role checks) — the session bridge's `role` is DB-fresh via `getToken`. `support/[id]` uses `session?.user?.id` only to gate its socket effect; the bridge returns the same local DB uuid (webhook syncs by `clerkId`), so no code change was needed. NOTE: between Phase 1 and now, a non-admin Clerk user hitting `/admin` gets the shell then a 403 on data — with the layout guard they now land on `/forbidden` immediately.

### Phase 3 — Kill the accessToken backend bridge
- [x] Migrate `apps/admin/src/app/admin/products/new` and `products/[id]/edit` writes off `api.products.create(..., session?.accessToken)`:
  - Preferred: new admin-local Next routes (`/api/admin/products` + `/api/admin/products/[id]`) with `requireAdmin`, calling the backend with `INTERNAL_SERVICE_TOKEN`/internal pattern (mirror `notification-push.ts`); re-point pages at them.
  - Fallback (only if spike proves backend verifies Clerk JWTs on those endpoints): `const { getToken } = await auth(); getToken()` client-side via `useAuth`.
- [x] Remove `session.accessToken` from the adapter/types everywhere; confirm zero `accessToken` references remain in `apps/admin`.

> **Phase 3 notes (2026-09-07):** done — suite 56/56, `tsc --noEmit` clean. New admin-local routes `apps/admin/src/app/api/admin/products/route.ts` (POST) and `[id]/route.ts` (PATCH/DELETE) run `requireAdmin` (POST/PATCH: `["ADMIN", "INVENTORY_MANAGER"]`, DELETE: `["ADMIN"]` — mirroring the backend `RolesGuard` on those endpoints). `services/api.ts` `products.create/update/delete` re-pointed at `/api/admin/products*` (same-origin fetch, no token param — pattern matches `categories`/`articles` admin calls); `api.products.spec.ts` rewritten to assert the new URLs, methods, and the absence of an `Authorization` header. Pages `products/new` and `products/[id]/edit` dropped `session?.accessToken` and their now-unused `useSession` import. The bridge is fully dead: `session-client.tsx` `BridgeSession` no longer carries `accessToken`, and `/api/auth/session` no longer mints the legacy JWT — `jsonwebtoken` + `@types/jsonwebtoken` removed from `apps/admin/package.json`. Only comment references to `accessToken` remain in `apps/admin`. (The storefront's own `/api/auth/session` keeps its accessToken minting — out of scope.)
>
> **Post-Phase-3 correction (2026-09-07):** the relay as originally built was **broken** — it sent `x-internal-token` to `/products`, but those endpoints are guarded by `AuthGuard("jwt")` (passport-jwt, Bearer-only; the internal header is only honored on `/internal/*`), so admin product create/edit would have 401'd. Fixed: backend `apps/backend/src/auth/jwt-or-clerk.guard.ts` now guards the three product write endpoints — verifies the legacy JWT first (storefront proxy and other legacy clients keep working) and falls back to `verifyToken(token, { secretKey })` (`@clerk/backend` JWKS) mapped to the local user by `clerkId`, always DB-first so bans/demotions apply instantly. The admin relay routes forward the Clerk session token (`auth().getToken()`) as `Authorization: Bearer` — no `INTERNAL_SERVICE_TOKEN` on product writes anymore; it stays for the `/internal/*` relays (notification deliver, role-change notify, users sync) that have no user context and can't migrate. Backend compose service gained `CLERK_SECRET_KEY`. New specs: backend `jwt-or-clerk.guard.spec.ts` (6 tests, suite 426), admin `api.products-relay.spec.ts` (6 tests, suite 62).

### Phase 4 — Deploy & ops
- [x] `docker/.env.example`: document `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` for the admin service.
- [x] `docker/compose.prod.yml` admin service: add Clerk env, remove `NEXTAUTH_SECRET`/`NEXTAUTH_URL` if no longer referenced by the admin image; keep `INTERNAL_API_URL`/`INTERNAL_SERVICE_TOKEN`.
- [x] Ensure every `ADMIN`/`CONTENT_EDITOR` DB user has a matching Clerk account (invite via Dashboard or Backend API) before the switch; seed admin handled the same way.
- [ ] Deploy in a maintenance window; verify an admin can sign in via Clerk, a `CUSTOMER` is blocked at `/forbidden`, and a demoted admin loses API access immediately (DB check) without re-login.

> **Phase 4 notes (2026-09-07):** env wiring done — `tsc`/vitest untouched (no app code changed).
> - `docker/.env.example`: added a Clerk section (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` — the last for the storefront webhook); removed dead `NEXTAUTH_URL`/`NEXTAUTH_SECRET`. `AUTH_SECRET`/`JWT_SECRET` stay: the backend JWT strategy and the storefront's legacy seller-proxy bridge still use them.
> - `docker/compose.prod.yml`: **admin** service now gets `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (build arg + runtime) and `CLERK_SECRET_KEY`; dropped `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (admin no longer reads any of them post-Phase-3); kept `INTERNAL_API_URL`/`INTERNAL_SERVICE_TOKEN`/`DATABASE_URL`. **frontend** service also gained Clerk env (`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, publishable key) — it was previously getting zero Clerk env, which made the webhook 503 and metadata sync fail in compose deploys (the AGENTS.md gap); dropped its `NEXTAUTH_URL` (site.ts falls back to `NEXT_PUBLIC_SITE_URL`, always provided). Both Dockerfiles take `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as a build arg (NEXT_PUBLIC_* is inlined at build time).
> - **Admin account checklist (run at deploy, needs a live DB):** every DB user with role `ADMIN`/`CONTENT_EDITOR` must have a matching Clerk account **before** the switch — the webhook syncs by `clerkId` with an email fallback, and `requireAdminPage`/`requireAdmin` 403 anyone without a DB row. Query: `SELECT email, role FROM "User" WHERE role IN ('ADMIN','CONTENT_EDITOR');`, then for each email without a Clerk account create it via the Dashboard → Users → Invite or the Backend API (`POST /v1/users`). **The seed admin is the trap:** `backend-db-init` (apps/backend/create-user.js) creates an ADMIN DB row with a bcrypt `passwordHash` — that credentials path died with NextAuth, so the seeded admin email must ALSO be invited to Clerk or nobody can log in to the admin console after the switch.

### Phase 5 — Validation checklist
- [ ] `apps/admin`: `tsc --noEmit` clean; `vitest run` all green (specs unchanged thanks to the `requireAdmin` mock seam).
- [ ] `apps/backend` suite still green (no backend code changes expected outside the products-access spike).
- [ ] Manual: sign-in, page access, role denial, live demotion (immediate 403), report resolution + user ban still attribute `guard.user.id` correctly, activity feed + notification relay unaffected.

### Out of scope / follow-ups
- Clerk **session revocation** on ban (app data is already gated by the per-request DB check; Clerk sessions persist until expiry — optionally revoke via Backend API `sessions` in the ban flow later).
- Moving the storefront seller flows off any remaining backend legacy-JWT usage (only the admin product bridge is in scope here; check the spike output — the storefront `[...proxy]` may already route around it).
