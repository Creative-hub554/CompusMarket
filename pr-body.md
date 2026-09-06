**Changes**

Three fixes/enhancements, verified live in the Preview tab at http://localhost:3000.

**1. fix(frontend): stop intl middleware from locale-redirecting /api/**
`apps/frontend/src/middleware.ts`

The Clerk cutover re-added  to the middleware matcher, which dragged  fetches through next-intl's locale redirect → 307 to  → 404. This broke every client-side authed fetch (cart, orders, resumes, seller routes, market search/filters). Not reverted: the composed handler now short-circuits past **next-intl only** for  () so Clerk still runs (and  continues to work) but next-intl never emits the redirect. Page routing is untouched —  still 307s to  as before.

**2. fix(frontend): remove shadowing /api/search route**
Deleted `apps/frontend/src/app/api/search/route.ts`

The frontend had a concrete  route handler that shadowed the  catch-all (which already lists  in  and forwards to the backend). That route was a stale duplicate: hardcoded , case-sensitive , and it dropped the  filter the market page sends. Removing it routes search through the proxy → backend → Meilisearch, fixing search casing and enabling the real engine.

**3. feat(database): expand demo seed with sellers, richer catalog, and orders**
`packages/database/prisma/seed.mjs` (+ `apps/frontend/.env` for `IMAGE_HOSTS`)

Idempotent upsert expanded from 4 to 22 products across all 6 categories, with:
- 3 APPROVED s (sokhatech, rkmmarket, daraphones), 20/22 products now carry  → "Sold by a verified seller" badge + Chat with Seller
- picsum.photos images (stable per-product seeds; 2 promo products with + feed the Watch & Shop reel + PROMO popup)
- serials + warranty months on electronics/phones → "12mo warranty" chip
- 2 buyers + 4 realistic orders (DELIVERED w. 5★ review + active warranty, SHIPPED, PROCESSING, CANCELLED)
- re-runs are safe: skip existing, upgrade old rows with images/sellers/promos (verified 0 new on re-run)

 gained  so  can render product shots (non-secret config;  origin allow-list).

**Verification**
- Preview renders 22 products with 22 images loaded, 0 broken; promo strip + popup visible
- Product detail: warranty chip, serial specs, seller badge, related products, seeded 5★ review by Vuthy Chan in Reviews tab
-  (lowercase): , 1 hit — casing fix confirmed
- Filters through Meilisearch via the proxy:  → 2,  → 1,  → 1
- Frontend:  clean, all 32 tests pass
- Backend:  — 33 files / 418 tests, all passed (AI error paths, chat-bot fallback, webhook failures, JWT/refresh rotation all exercised)
- Seed idempotent on re-run (0 new orders, counts stable)
- Meilisearch reindexed (22 docs); backend health shows meilisearch 
