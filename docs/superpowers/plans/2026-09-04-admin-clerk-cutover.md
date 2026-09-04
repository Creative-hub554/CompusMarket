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
- [ ] Read `apps/frontend/src/app/api/[...proxy]/route.ts` and `apps/frontend/src/lib/session-client.tsx`: confirm exactly how the storefront client currently authenticates protected backend calls post-cutover (proxy + what token?) — mirror that for admin instead of inventing a new bridge.
- [ ] Confirm backend product endpoints accept a Clerk-verifiable credential today or only the legacy Nest JWT (`apps/backend/src/products/*.controller.ts` guards). Decide between "admin-local Next routes + internal token" vs "Clerk `getToken()` passed through".
- [ ] Confirm the Clerk webhook sync keys DB users to Clerk by email or by `clerkId`, so the admin's acting-user id (`guard.user.id`) stays the same local DB id after cutover (report-resolution `resolvedBy`, RoleChangeLog actors, etc. depend on it).
- [ ] List which Clerk users currently hold an `ADMIN`/`CONTENT_EDITOR` DB role and confirm they have Clerk accounts (seed admin + any dashboard-created accounts). Gap = ops step in Phase 3.

### Phase 1 — Provider, middleware, login (authN)
- [ ] Add `@clerk/nextjs` to `apps/admin` (version aligned with frontend `^7.9.1`).
- [ ] Add env keys for admin dev: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (gitignored `.env.local`; add commented entries to a new `apps/admin/.env.example`).
- [ ] Swap root layout provider: remove `SessionProvider`, wrap with `ClerkProvider` (Core 2 may wrap `<html>`; prefer inside `<body>` for future-proofing) + the `useSession` adapter or direct hook refactor in the six consumer pages.
- [ ] Replace `apps/admin/src/middleware.ts`: `clerkMiddleware`, matcher `["/admin/:path*", "/login", ...]`, unauthenticated → redirect to Clerk-hosted `/sign-in` route. Keep the old behavior of sending non-admin roles elsewhere (now handled server-side in the layout guard — see Phase 2 — since middleware cannot DB-check).
- [ ] Replace `login/page.tsx` with the storefront pattern (`<SignIn />` from `@clerk/nextjs`); point `afterSignInUrl`/routing back to `/admin`.
- [ ] Delete `api/auth/[...nextauth]/route.ts`, `SessionProvider.tsx`, `types/next-auth.d.ts`; remove `next-auth` deps.
- [ ] Typecheck + admin vitest suite; fix fallout (specs that import pages now needing Clerk hooks must wrap in `ClerkProvider` or mock `@clerk/nextjs`).

### Phase 2 — Authorization rework (authZ)
- [ ] Rewrite `apps/admin/src/lib/require-admin.ts`: `const { userId } = await auth()` → DB `findUnique` → same return shape. (Core 2: no `isAuthenticated`; use `!!userId`.) Confirm every API spec still passes — they mock `@/lib/require-admin` wholesale.
- [ ] New `requireAdminPage(allowedRoles?)` helper (server component): `await auth()`; no session → `redirect("/sign-in")`; DB role not allowed → `redirect("/forbidden")` or `/`. Mount it in `apps/admin/src/app/admin/layout.tsx` so every `/admin/*` page is covered server-side.
- [ ] Grep for any remaining `token.role` / stale-claim gating and remove; DB lookup only.
- [ ] Update client pages that used `session?.user?.id` for request identity (support messaging, etc.) to the Clerk-equivalent id (same local user id via webhook sync — verify in Phase 0).

### Phase 3 — Kill the accessToken backend bridge
- [ ] Migrate `apps/admin/src/app/admin/products/new` and `products/[id]/edit` writes off `api.products.create(..., session?.accessToken)`:
  - Preferred: new admin-local Next routes (`/api/admin/products` + `/api/admin/products/[id]`) with `requireAdmin`, calling the backend with `INTERNAL_SERVICE_TOKEN`/internal pattern (mirror `notification-push.ts`); re-point pages at them.
  - Fallback (only if spike proves backend verifies Clerk JWTs on those endpoints): `const { getToken } = await auth(); getToken()` client-side via `useAuth`.
- [ ] Remove `session.accessToken` from the adapter/types everywhere; confirm zero `accessToken` references remain in `apps/admin`.

### Phase 4 — Deploy & ops
- [ ] `docker/.env.example`: document `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` for the admin service.
- [ ] `docker/compose.prod.yml` admin service: add Clerk env, remove `NEXTAUTH_SECRET`/`NEXTAUTH_URL` if no longer referenced by the admin image; keep `INTERNAL_API_URL`/`INTERNAL_SERVICE_TOKEN`.
- [ ] Ensure every `ADMIN`/`CONTENT_EDITOR` DB user has a matching Clerk account (invite via Dashboard or Backend API) before the switch; seed admin handled the same way.
- [ ] Deploy in a maintenance window; verify an admin can sign in via Clerk, a `CUSTOMER` is blocked at `/forbidden`, and a demoted admin loses API access immediately (DB check) without re-login.

### Phase 5 — Validation checklist
- [ ] `apps/admin`: `tsc --noEmit` clean; `vitest run` all green (specs unchanged thanks to the `requireAdmin` mock seam).
- [ ] `apps/backend` suite still green (no backend code changes expected outside the products-access spike).
- [ ] Manual: sign-in, page access, role denial, live demotion (immediate 403), report resolution + user ban still attribute `guard.user.id` correctly, activity feed + notification relay unaffected.

### Out of scope / follow-ups
- Clerk **session revocation** on ban (app data is already gated by the per-request DB check; Clerk sessions persist until expiry — optionally revoke via Backend API `sessions` in the ban flow later).
- Moving the storefront seller flows off any remaining backend legacy-JWT usage (only the admin product bridge is in scope here; check the spike output — the storefront `[...proxy]` may already route around it).
