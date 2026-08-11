# Rebrand to Modern Monogram + Full Polish & i18n — Design

Date: 2026-08-12
Status: Approved by user (visual decisions: brand direction C, home layout B, PDP layout B, admin layout C)

## 1. Vision

Rebrand the entire site (storefront, community hub, seller area, admin) from the current khmer-blue/flag identity to a clean, international "Modern Monogram" design system — ink navy + indigo accent on white, Inter typography — while keeping subtle Khmer touches. In the same effort, fix known broken/incomplete features and complete full-site EN/KM localization.

## 2. Design system

| Token | Value |
|---|---|
| Primary (ink) | `#0f172a` (navy, close to slate-900) |
| Accent (indigo) | `#6366f1` / `#4338ca` |
| Surfaces | `#ffffff`, `#f8fafc` |
| Borders | `#e2e8f0`, `#ececf1` |
| Text | `#0f172a` headings, `#64748b` muted |
| Font | Inter (all weights 400/600/700/800) — drop Playfair Display |
| Radius | 6–8px (buttons/pills 999px where pill-like) |

Khmer identity retained as accents: small flag motif in footers, gold used sparingly (e.g. star ratings), not as primary brand color.

Implementation:
- Rewrite theme tokens + utility classes in `apps/frontend/src/app/globals.css` and `apps/admin/src/app/globals.css` (same token names: `btn-primary`, `input-field`, `card`, `nav-link`, `page-title`, etc. so components migrate by class swap).
- Build out `packages/ui` with shared primitives consumed by both apps: `Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Skeleton`. Both apps import from `@theo/ui`. (Per-package build via `tsup` or simple tsc; wire into turbo pipeline.)

## 3. Storefront changes (apps/frontend)

- **Home (`/`)**: split hero — headline left ("Shop Khmer products with confidence."), indigo gradient panel right, dual CTAs (Browse shop / Become a seller), then a category-tiles row (Phones/Fashion/Home/Food), then featured products grid.
- **Product detail (`/shop/[id]`)**: indigo gradient header strip with breadcrumbs + trust badges (condition, warranty, free shipping), title; body = gallery left, price + Add to cart / Buy now CTAs right; tabbed sections Description / Specs / Reviews / Warranty.
- **Shop (`/shop`)**: fix dead `?category=` filter — read `searchParams.category`, filter client-side or pass to the products fetch; active-category pill state; restyle product cards (image, name, price, condition badge).
- **Support & messages**: restyle from the dark theme (`#0a0a0b`/`#60a5fa`) to the new light system; remove dead `useTranslation` imports.
- **Delete `/dashboard-preview`** leftover static mockup (route + any assets).
- Add `not-found.tsx` styled in the new system.

## 4. Community hub (apps/frontend)

- Restyle hub grid and all tool pages (resume, careers, notes, quizzes, flashcards, diagrams, documents, image-processor, design) to the new design system using `@theo/ui` primitives.
- Fix `/community/careers` dead `?cat=` filter; make the placeholder sample articles either clickable or replaced by a proper empty state.

## 5. Seller area (apps/frontend)

- Restyle seller apply wizard, seller dashboard (status card, product-limit bar), seller products CRUD, seller orders, and the public seller storefront to the new system.

## 6. Admin (apps/admin)

- **Layout C — Top-Nav Manager**: horizontal top navigation (Dashboard · Products · Categories · Articles · Sellers · Orders · Warranties · Support), KPI strip (revenue, 30d revenue, users, products, sellers, pending sellers, warranty claims, tickets), revenue chart (recharts stays), tables restyled.
- Brand the login page with the new palette.

## 7. Full i18n (EN/KM)

- **Unify onto next-intl**: migrate the custom `TranslationProvider` keys (resume + ai) into `messages/en.json` / `messages/km.json`; remove the custom provider.
- Add catalogs for all currently hardcoded-English surfaces: community hub + all 9 tools, seller area, support, messages, warranties, login/register, terms pages, careers, dashboard (frontend), error page.
- Enforce parity: a test that asserts both catalogs have identical key sets (no missing keys in either locale).
- Khmer strings: draft EN↔KM translations for standard UI strings (nav, buttons, labels, statuses). Editorial/product-content prose stays English-only where it is user-generated or SEO-critical (exact scope per string: any UI chrome string is translated; long-form article bodies stay EN).
- Admin stays English-only (internal tool) — documented decision.

## 8. Testing

- Frontend: add shop filter test (`?category=` selection updates product list), i18n catalog-parity test, home/PDP smoke tests.
- Admin: keep existing tests green; add a smoke test for the top-nav layout if client-rendered.
- Run full vitest suites for frontend, admin, backend (backend untouched but must stay green).

## 9. Out of scope (explicit)

- No new features: no checkout/payment flow, no product-page review entry point, no notifications.
- No admin i18n.
- No backend changes (except none required).

## 10. Risks / notes

- `packages/ui` is currently a no-op stub; wiring it into both apps touches every page's imports — the largest mechanical effort. Mitigation: migrate page-by-page, keeping each page shippable.
- next-intl messages only cover nav/home/shop/cart/orders today; growing catalogs to ~all pages is a big but mechanical task.
- PWA manifest themeColor and `public/` leftover assets (create-next-app svgs) should be updated/deleted opportunistically in the same pass.
