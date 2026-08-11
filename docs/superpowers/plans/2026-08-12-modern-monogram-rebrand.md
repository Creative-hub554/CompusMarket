# Modern Monogram Rebrand — Visual + Fixes Implementation Plan (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the whole site to the Modern Monogram design system (ink navy + indigo on white, Inter), restyle storefront/community/seller/admin pages, and fix the broken category filters and leftover mockup.

**Architecture:** Rewrite the Tailwind v4 theme tokens + utility classes in both apps' `globals.css` (legacy `khmer-*` names aliased to new values so pages migrate incrementally). Build minimal shared primitives in `packages/ui` consumed by both apps. Restyle pages in dependency order (tokens → home → shop → PDP → support → community → seller → admin), fixing bugs along the way. i18n is explicitly OUT of this plan (separate Plan B).

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS v4, React 19, `@theo/ui` workspace package, vitest + @testing-library/react.

## Global Constraints

- **No i18n work in Plan A.** Do NOT add or modify `messages/*.json`, locale files, or `next-intl` usage. Existing `t()` calls stay as-is; new hardcoded English strings are allowed (Plan B translates them).
- TypeScript strict (`packages/config/tsconfig.json`); double quotes, semicolons, 2-space indent.
- Conventional Commits (e.g. `style:`, `fix:`, `feat:`).
- Node is not always in PATH on this Windows machine. If commands fail, prepend:
  `$env:PATH = "C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm" + ";$env:PATH"`
- Per-package commands run from the package directory via the `workdir` param (Do NOT `cd` in commands).
- **Legacy class swap table** (used by all restyle tasks; exact values):

| Find | Replace with |
|---|---|
| `bg-khmer-blue` / `text-khmer-blue` | `bg-slate-900` / `text-slate-900` (brand ink) |
| `hover:bg-khmer-blue-light` / `text-khmer-blue-light` | `hover:bg-indigo-700` / `text-indigo-700` |
| `text-khmer-red` (prices, errors) | `text-slate-900` for prices; `text-red-600` for errors/danger |
| `bg-khmer-red`, `border-khmer-red` | `bg-red-600`, `border-red-300` |
| `text-khmer-gold` / `bg-khmer-gold` | `text-amber-500` / `bg-amber-500` (sparse gold accents only; star ratings keep gold) |
| `focus:ring-khmer-blue/30` `focus:border-khmer-blue` | `focus:ring-indigo-500/30` `focus:border-indigo-500` |
| `font-['Playfair_Display']` | remove (Inter is default) |
| `bg-[#0a0a0b]`, `bg-[#111]`, `text-[#fafafa]`, `text-[#60a5fa]`, `border-[#27272a]` and similar dark-theme hexes (support/messages) | `bg-white`, `text-slate-900`, `text-indigo-600`, `border-slate-200` |
| `#1a237e`, `#283593`, `#d42027`, `#d4a027`, `#f0c040` (hardcoded hexes) | from the palette table in Task 1 |

- Final verification for every task: typecheck passes (`npx tsc --noEmit` in the affected package) and `npx vitest run` in any package with changed tests.

---

### Task 1: Design tokens + utility classes (frontend & admin `globals.css`)

**Files:**
- Modify: `apps/frontend/src/app/globals.css` (full rewrite of lines 1-262)
- Modify: `apps/admin/src/app/globals.css`
- Test: `apps/frontend/src/app/globals.css` (visual verification only; no unit test)

**Interfaces:**
- Produces: Tailwind theme tokens `--color-ink`, `--color-accent`, `--color-accent-dark` plus legacy aliases `--color-khmer-blue`, `--color-khmer-blue-light`, `--color-khmer-red`, `--color-khmer-gold`, `--color-khmer-gold-light` (so existing pages keep compiling); updated utility classes `btn-primary`, `btn-ghost`, `input-field`, `card`, `page-title`, `banner-flag`, `nav-link`, `gold-underline`, `animate-pulse-glow`.

- [ ] **Step 1: Rewrite `apps/frontend/src/app/globals.css`**

Replace the entire file with:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import "tailwindcss";

@theme {
  --color-ink: #0f172a;
  --color-accent: #6366f1;
  --color-accent-dark: #4338ca;

  /* Legacy aliases — keep existing pages compiling during migration */
  --color-khmer-blue: #0f172a;
  --color-khmer-blue-light: #4338ca;
  --color-khmer-red: #dc2626;
  --color-khmer-gold: #d4a027;
  --color-khmer-gold-light: #f0c040;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-ink) transparent;
}

body {
  font-family: 'Inter', sans-serif;
  color: var(--color-ink);
}

h1, h2, h3, h4 {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.02em;
}

/* ---- Keyframes ---- */

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50%      { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes templeFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}

/* ---- Utility classes ---- */

.animate-fade-in-up { animation: fadeInUp 0.6s ease-out both; }
.animate-fade-in { animation: fadeIn 0.5s ease-out both; }
.animate-slide-down { animation: slideDown 0.3s ease-out both; }
.animate-pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }

.animate-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.animate-temple-float { animation: templeFloat 3s ease-in-out infinite; }

.stagger-children > * { animation: fadeInUp 0.5s ease-out both; }
.stagger-children > *:nth-child(1)  { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2)  { animation-delay: 0.10s; }
.stagger-children > *:nth-child(3)  { animation-delay: 0.15s; }
.stagger-children > *:nth-child(4)  { animation-delay: 0.20s; }
.stagger-children > *:nth-child(5)  { animation-delay: 0.25s; }
.stagger-children > *:nth-child(6)  { animation-delay: 0.30s; }
.stagger-children > *:nth-child(7)  { animation-delay: 0.35s; }
.stagger-children > *:nth-child(8)  { animation-delay: 0.40s; }
.stagger-children > *:nth-child(9)  { animation-delay: 0.45s; }
.stagger-children > *:nth-child(10) { animation-delay: 0.50s; }
.stagger-children > *:nth-child(n+11) { animation-delay: 0.55s; }

/* ---- UI primitives ---- */

.btn-primary {
  @apply rounded-lg bg-slate-900 px-4 py-2 text-sm text-white font-medium hover:bg-indigo-700 transition disabled:opacity-40;
}

.btn-success {
  @apply rounded-lg bg-green-600 px-4 py-2 text-sm text-white font-medium hover:bg-green-700 transition;
}

.btn-ghost {
  @apply rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition;
}

.btn-danger {
  @apply rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition;
}

.input-field {
  @apply rounded-lg border border-slate-300 px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition;
}

.card {
  @apply rounded-xl border border-slate-200 bg-white;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(15, 23, 42, 0.15);
}

.tag {
  @apply inline-flex items-center text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium;
}

.badge {
  @apply inline-flex items-center text-xs rounded px-2 py-0.5 font-medium;
}

.progress-bar {
  @apply w-full bg-slate-200 rounded-full h-2 overflow-hidden;
}

.progress-fill {
  @apply h-full rounded-full transition-all duration-500 ease-out;
}

.section-title {
  @apply text-lg font-semibold text-slate-900;
}

.page-header {
  @apply mb-8;
}

.page-title {
  @apply text-3xl font-bold inline-block tracking-tight;
  position: relative;
}
.page-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 48px;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #a5b4fc);
  border-radius: 2px;
}

.page-subtitle {
  @apply text-sm text-slate-500 mt-2;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
}
.status-dot.saved { background: #16a34a; }
.status-dot.saving { background: #f59e0b; animation: pulse 1s infinite; }
.status-dot.unsaved { background: #dc2626; }

/* 3D card flip */
.flip-card { perspective: 1000px; }
.flip-card-inner {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.flip-card-inner.flipped { transform: rotateY(180deg); }
.flip-card-front, .flip-card-back {
  backface-visibility: hidden;
  position: absolute;
  inset: 0;
}
.flip-card-back { transform: rotateY(180deg); }

a, button { transition: all 0.2s ease; }
img { transition: transform 0.3s ease, opacity 0.3s ease; }

.card-hover {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(15, 23, 42, 0.15);
}

/* Navy hero gradient (was the Khmer flag banner) */
.banner-flag {
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #4338ca 130%);
}

/* Indigo underline accent */
.gold-underline {
  position: relative;
}
.gold-underline::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 48px;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #a5b4fc);
  border-radius: 2px;
}

/* Nav link hover effect */
.nav-link {
  position: relative;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: #6366f1;
  transition: width 0.3s ease;
}
.nav-link:hover::after { width: 100%; }
```

- [ ] **Step 2: Apply the same token/utility changes to `apps/admin/src/app/globals.css`**

Read the file; apply the identical moves: copy the `@theme` block (new tokens + aliases), the `h1-h4` rule (Inter, tracking-tight), and update `btn-primary`, `input-field`, `card`, `page-title`, `nav-link` exactly as above. Keep anything admin-specific (tables, sidebar) otherwise unchanged.

- [ ] **Step 3: Typecheck both apps**

Run: `npx tsc --noEmit` in `apps/frontend` and `apps/admin`
Expected: PASS (no type errors; class names aren't type-checked)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/globals.css apps/admin/src/app/globals.css
git commit -m "style: introduce Modern Monogram theme tokens and utilities"
```

---

### Task 2: `packages/ui` primitives (Button, Card, Badge, Input) wired into both apps

**Files:**
- Create: `packages/ui/src/index.ts`, `packages/ui/src/button.tsx`, `packages/ui/src/card.tsx`, `packages/ui/src/badge.tsx`, `packages/ui/src/input.tsx`
- Create: `packages/ui/src/button.spec.tsx`
- Modify: `packages/ui/vitest.config.ts` (jsdom environment), `packages/ui/package.json` (react devDeps), `apps/frontend/next.config.ts`, `apps/admin/next.config.ts` (transpilePackages), `apps/frontend/src/app/globals.css` + `apps/admin/src/app/globals.css` (`@source` line)
- Delete: `packages/ui/src/index.spec.ts`

**Interfaces:**
- Produces: named exports `Button`, `Card`, `Badge`, `Input` from `@theo/ui` (subpath imports `@theo/ui/button` etc. also work via the existing `./*` export map). All accept `className` and spread remaining HTML props.

- [ ] **Step 1: Write the failing component test**

Create `packages/ui/src/button.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders children with the primary variant classes", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.className).toContain("bg-slate-900");
  });

  it("applies a custom className", () => {
    render(<Button className="mt-4">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain("mt-4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run` in `packages/ui`
Expected: FAIL — `@testing-library/react` not installed / `./button` not found

- [ ] **Step 3: Add devDependencies to `packages/ui/package.json`**

Add to `devDependencies`: `"@testing-library/react": "^16.0.0"`, `"jsdom": "^25.0.0"`, `"react": "^19.0.0"`. Then run `pnpm install` at the repo root.

- [ ] **Step 4: Make the tests pass — write the components**

Replace `packages/ui/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    root: ".",
  },
});
```

Create `packages/ui/src/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const variants: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-indigo-700",
  secondary: "bg-indigo-600 text-white hover:bg-indigo-700",
  ghost: "border border-slate-200 text-slate-600 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-green-600 text-white hover:bg-green-700",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
```

Create `packages/ui/src/card.tsx`:

```tsx
import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-slate-200 bg-white ${className}`} {...props} />;
}
```

Create `packages/ui/src/badge.tsx`:

```tsx
import type { HTMLAttributes } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const variants: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-600",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-indigo-100 text-indigo-800",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "default", className = "", ...props }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`} {...props} />
  );
}
```

Create `packages/ui/src/input.tsx`:

```tsx
import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 ${className}`}
      {...props}
    />
  );
}
```

Create `packages/ui/src/index.ts`:

```ts
export { Button, type ButtonProps } from "./button";
export { Card } from "./card";
export { Badge, type BadgeProps, type BadgeVariant } from "./badge";
export { Input } from "./input";
```

Delete `packages/ui/src/index.spec.ts`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run` in `packages/ui`
Expected: PASS (2 tests)

- [ ] **Step 6: Wire the package into both apps**

1. `apps/frontend/next.config.ts` — change `transpilePackages` to:
   ```ts
   transpilePackages: ["@react-pdf/renderer", "@theo/ui"],
   ```
2. `apps/admin/next.config.ts` — add:
   ```ts
   const nextConfig: NextConfig = {
     transpilePackages: ["@theo/ui"],
   };
   ```
3. Append to the top of both apps' `globals.css` (right after the Google Fonts import, before `@import "tailwindcss";`):
   ```css
   @source "../../../packages/ui/src";
   ```
   (Relative to `apps/frontend/src/app/globals.css` and `apps/admin/src/app/globals.css` respectively — both resolve to `packages/ui/src`.)

- [ ] **Step 7: Prove consumption works**

In `apps/frontend/src/components/Nav.tsx`, replace one existing nav CTA button with `<Button>` from `@theo/ui` (e.g. the cart/sign-in button; import `{ Button } from "@theo/ui"`). Leave the rest of the file alone.

- [ ] **Step 8: Typecheck + build both apps**

Run: `npx tsc --noEmit` in `packages/ui`, `apps/frontend`, `apps/admin`; then `pnpm --filter frontend build` and `pnpm --filter admin build`
Expected: PASS — build resolves `@theo/ui` and the Tailwind `@source` picks up the shared classes (visually verify the replaced button renders navy/indigo, not unstyled).

- [ ] **Step 9: Commit**

```bash
git add packages/ui apps/frontend/next.config.ts apps/admin/next.config.ts apps/frontend/src/app/globals.css apps/admin/src/app/globals.css apps/frontend/src/components/Nav.tsx
git commit -m "feat(ui): add shared Button, Card, Badge, Input primitives"
```

---

### Task 3: Home page restyle (Split Hero + Category Tiles + Featured grid)

**Files:**
- Modify: `apps/frontend/src/app/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `api.categories.list()` from `@/services/api` (returns `Category[]` with `slug`, `name`), existing translation keys `home.*` and `nav.*` from next-intl.
- Produces: new home page with 4 category tiles linking to `/shop?category=<slug>`.

- [ ] **Step 1: Rewrite the home page**

Replace `apps/frontend/src/app/page.tsx` with:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { api } from "@/services/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getTranslations("home");
  const nav = await getTranslations("nav");
  const categories = await api.categories.list();

  const features = [
    { title: t("feature1Title"), desc: t("feature1Desc"), icon: "🛡️" },
    { title: t("feature2Title"), desc: t("feature2Desc"), icon: "🤝" },
    { title: t("feature3Title"), desc: t("feature3Desc"), icon: "🌱" },
  ];
  const tiles = categories.slice(0, 4);

  return (
    <div>
      {/* Hero: split layout */}
      <section className="bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-[#4338ca] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.25),transparent_55%)]" />
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center relative">
          <div className="animate-fade-in-up">
            <p className="text-xs md:text-sm tracking-[0.3em] text-indigo-300 font-semibold uppercase">
              bytheo
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mt-3">
              Shop Khmer products with confidence.
            </h1>
            <p className="text-white/70 mt-4 text-base md:text-lg font-light max-w-md">
              Trusted sellers · 30-day warranty · support in Khmer
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-block rounded-lg bg-indigo-600 text-white px-8 py-3 font-bold hover:bg-indigo-500 transition-all hover:scale-[1.03] shadow-xl"
              >
                {t("browseShop")}
              </Link>
              <Link
                href="/seller/apply"
                className="inline-block rounded-lg border border-white/30 text-white/90 px-8 py-3 font-semibold hover:bg-white/10 transition-all hover:scale-[1.03]"
              >
                {t("becomeSeller")}
              </Link>
            </div>
          </div>
          <div className="hidden md:flex animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="ml-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur w-full max-w-sm p-8 flex flex-col items-center justify-center gap-4 aspect-square">
              <span className="text-6xl">🛍️</span>
              <p className="text-white/80 text-sm text-center">
                Phones · Fashion · Home · Food — from trusted Khmer sellers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      {tiles.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tiles.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className="card-hover rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-indigo-300"
                >
                  <div className="text-3xl mb-2">🛒</div>
                  <div className="font-bold text-slate-900">{cat.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-center">
            {t("whyTitle")} <span className="text-indigo-600">KHMERONLINESHOP</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 stagger-children">
            {features.map((f) => (
              <div key={f.title} className="card-hover rounded-2xl border border-slate-200 p-10 text-left bg-white shadow-sm hover:border-indigo-200">
                <span className="text-3xl mb-5 block">{f.icon}</span>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight">{t("becomeSellerDesc")}</h2>
          <Link
            href="/seller/apply"
            className="inline-block rounded-lg bg-indigo-600 text-white px-10 py-3 font-bold hover:bg-indigo-500 transition-all hover:scale-[1.03] shadow-xl"
          >
            {t("applyNow")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white/50 text-sm">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-base font-bold tracking-wider text-white">
                KHMERONLINESHOP
              </p>
              <p className="text-[10px] tracking-[0.3em] text-indigo-400 mt-0.5">bytheo</p>
            </div>
            <div className="flex gap-8 text-xs tracking-wide">
              <Link href="/terms/buyer" className="hover:text-white transition-colors">{nav("buyerTerms")}</Link>
              <Link href="/terms/seller" className="hover:text-white transition-colors">{nav("sellerTerms")}</Link>
            </div>
            <p className="text-xs">&copy; {new Date().getFullYear()} {t("allRightsReserved")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

Note: the hero headline, trust line, and CTA eyebrow are hardcoded English — intentional; Plan B translates them.

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit` then `pnpm --filter frontend build` in `apps/frontend`
Expected: PASS. Start the dev server (`pnpm --filter frontend dev`) and verify: split hero on desktop (text left, glass panel right), 4 category tiles, indigo CTAs, dark footer.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/page.tsx
git commit -m "style(frontend): redesign home page with split hero and category tiles"
```

---

### Task 4: Shop — fix the dead `?category=` filter + restyle

**Files:**
- Create: `apps/frontend/src/lib/shopFilter.ts`, `apps/frontend/src/lib/shopFilter.spec.ts`
- Modify: `apps/frontend/src/app/shop/page.tsx` (categories aside + grid), `apps/frontend/src/components/ProductCard.tsx`

**Interfaces:**
- Produces: `filterProductsByCategory(products: Product[], categories: Category[], slug: string | undefined): Product[]` — returns all products when `slug` is falsy; otherwise products whose `category.id` matches the category with that `slug` (empty array if no category matches).
- Consumes: `Product` and `Category` types from `@/services/api` (verify `Category` is exported from `apps/frontend/src/services/api.ts`; if not, add `export type Category = { id: string; name: string; slug: string; _count?: { products: number } };`).

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/lib/shopFilter.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterProductsByCategory } from "./shopFilter";
import type { Product, Category } from "@/services/api";

const category = (id: string, slug: string): Category => ({
  id,
  name: slug,
  slug,
  _count: { products: 0 },
});

const product = (id: string, categoryId: string): Product =>
  ({
    id,
    name: `Product ${id}`,
    description: "",
    price: 10,
    condition: "A",
    status: "ACTIVE",
    images: [],
    stock: 1,
    category: { id: categoryId, name: categoryId, slug: categoryId },
  }) as Product;

describe("filterProductsByCategory", () => {
  const products = [product("1", "c1"), product("2", "c2"), product("3", "c1")];
  const categories = [category("c1", "phones"), category("c2", "fashion")];

  it("returns all products when no slug is given", () => {
    expect(filterProductsByCategory(products, categories, undefined)).toHaveLength(3);
  });

  it("filters by the category matching the slug", () => {
    const result = filterProductsByCategory(products, categories, "phones");
    expect(result.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("returns an empty array for an unknown slug", () => {
    expect(filterProductsByCategory(products, categories, "nope")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/shopFilter.spec.ts` in `apps/frontend`
Expected: FAIL — `./shopFilter` cannot be resolved

- [ ] **Step 3: Implement the filter**

Create `apps/frontend/src/lib/shopFilter.ts`:

```ts
import type { Product, Category } from "@/services/api";

export function filterProductsByCategory(
  products: Product[],
  categories: Category[],
  slug: string | undefined
): Product[] {
  if (!slug) return products;
  const category = categories.find((c) => c.slug === slug);
  if (!category) return [];
  return products.filter((p) => p.category.id === category.id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/shopFilter.spec.ts` in `apps/frontend`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire the filter into the shop page + restyle**

Modify `apps/frontend/src/app/shop/page.tsx`:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { filterProductsByCategory } from "@/lib/shopFilter";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const t = await getTranslations("shop");
  const { category } = await searchParams;
  const [allProducts, categories] = await Promise.all([
    api.products.list(),
    api.categories.list(),
  ]);
  const products = filterProductsByCategory(allProducts, categories, category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="page-title">{t("title")}</h1>
        <span className="text-sm text-slate-400">{t("productsCount", { count: products.length })}</span>
      </div>

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <h2 className="font-semibold mb-3">{t("categories")}</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <Link
                href="/shop"
                className={`font-medium hover:underline ${!category ? "text-indigo-600" : "text-slate-600"}`}
              >
                {t("all")} ({allProducts.length})
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className={`transition-colors ${
                    category === cat.slug ? "text-indigo-600 font-semibold" : "text-slate-600 hover:text-indigo-600"
                  }`}
                >
                  {cat.name} ({cat._count.products})
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-slate-500 text-center py-12">{t("noProducts")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

Modify `apps/frontend/src/components/ProductCard.tsx` per the Global Constraints swap table (line 24 `card-hover` border stays; condition B `bg-khmer-gold/20 text-khmer-gold` → `bg-amber-100 text-amber-800`; `text-khmer-blue` → `text-slate-900` on line 48; `text-khmer-red` price on line 51 → `text-slate-900`; hover border classes as in the table).

- [ ] **Step 6: Verify**

Run: `npx vitest run` in `apps/frontend`, then `npx tsc --noEmit`
Expected: PASS. In the dev server: clicking "Phones" in the sidebar filters the grid and marks the active category.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/shopFilter.ts apps/frontend/src/lib/shopFilter.spec.ts apps/frontend/src/app/shop/page.tsx apps/frontend/src/components/ProductCard.tsx
git commit -m "fix(frontend): make shop category filter work and restyle cards"
```

---

### Task 5: Product detail restyle (gradient header + tabs)

**Files:**
- Modify: `apps/frontend/src/app/shop/[id]/page.tsx`

**Interfaces:**
- Consumes: existing data fetches in the page (`api.products.byId(id)`, reviews, seller data), existing `t()` keys for `product.*`, `AddToCartButton`, `ChatWithSellerButton` components.
- Produces: PDP with indigo gradient header strip, price + dual CTAs, and tabbed content (Description / Specs / Reviews / Warranty).

- [ ] **Step 1: Read the current page**

Read `apps/frontend/src/app/shop/[id]/page.tsx` fully. Identify the existing sections that render: (a) gallery/images, (b) price/stock/condition/warranty, (c) add-to-cart + chat buttons, (d) reviews list, (e) seller info.

- [ ] **Step 2: Restructure the page**

Wrap the page in this structure (keep all existing data fetches and translation calls; move existing JSX into the slots):

```tsx
"use client";

import { useState } from "react";
// ... keep all existing imports

type Tab = "description" | "specs" | "reviews" | "warranty";

const TABS: { id: Tab; label: string }[] = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specs" },
  { id: "reviews", label: "Reviews" },
  { id: "warranty", label: "Warranty" },
];
```

Layout skeleton:

```tsx
<div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
  {/* Gradient header strip */}
  <div className="rounded-xl bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-[#4338ca] text-white p-6 md:p-8 mb-8">
    <p className="text-[11px] tracking-[0.25em] text-indigo-300 uppercase font-semibold">
      {breadcrumb /* e.g. category name or "Products" */}
    </p>
    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-2">{product.name}</h1>
    <div className="flex flex-wrap gap-2 mt-3 text-xs">
      <span className="rounded-full bg-white/15 px-3 py-1">Condition {product.condition}</span>
      {product.warrantyMonths ? (
        <span className="rounded-full bg-white/15 px-3 py-1">{product.warrantyMonths}-month warranty</span>
      ) : null}
      {product.stock > 0 ? (
        <span className="rounded-full bg-white/15 px-3 py-1">In stock</span>
      ) : (
        <span className="rounded-full bg-red-500/80 px-3 py-1">Out of stock</span>
      )}
    </div>
  </div>

  {/* Gallery + buying box */}
  <div className="grid md:grid-cols-2 gap-8 mb-10">
    <div>{/* existing gallery/images JSX */}</div>
    <div>
      <p className="text-3xl font-extrabold tracking-tight text-slate-900">
        ${Number(product.price).toLocaleString()}
      </p>
      <div className="flex flex-wrap gap-3 mt-5">
        {<AddToCartButton product={product} />}
        <button className="btn-primary">{/* "Buy now" — hardcoded English is OK in Plan A */}</button>
        {<ChatWithSellerButton ... />}
      </div>
      {/* existing stock/warranty/seller info JSX */}
    </div>
  </div>

  {/* Tabs */}
  <div>
    <div className="flex gap-1 border-b border-slate-200 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
            active === tab.id
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
    {active === "description" && <div>{/* existing description/specs JSX */}</div>}
    {active === "specs" && <div>{/* existing specs/QR/serial JSX */}</div>}
    {active === "reviews" && <div>{/* existing reviews list JSX */}</div>}
    {active === "warranty" && <div>{/* existing warranty text */}</div>}
  </div>
</div>
```

If the page is currently a server component without local state, split it: make it `"use client"` and pass fetched data in from the enclosing server component (the page currently fetches with `api` client helpers; when it is made a client component, either fetch in an outer `page.tsx` server component shell or keep the client fetch if it already fetches in `useEffect` — mirror the file's existing pattern; both are acceptable, do not introduce new APIs).

Apply the Global Constraints swap table to all remaining classes (remove `Playfair` font classes, `khmer-*` colors, `<h1>` serif styling).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `pnpm --filter frontend build` in `apps/frontend`
Expected: PASS. In the dev server, open any product: gradient header with trust badges, price + CTAs right of gallery, tabs switch content.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/shop/[id]/page.tsx
git commit -m "style(frontend): redesign product detail with gradient header and tabs"
```

---

### Task 6: Support + messages pages — light theme

**Files:**
- Modify: `apps/frontend/src/app/support/page.tsx`, `apps/frontend/src/app/support/new/page.tsx`, `apps/frontend/src/app/support/[id]/page.tsx`, `apps/frontend/src/app/messages/page.tsx`, `apps/frontend/src/app/messages/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing new — page internals stay identical, classes only.

- [ ] **Step 1: Survey dark-theme classes**

Run: `rg -n "#0a0a0b|#fafafa|#60a5fa|#27272a|#18181b" apps/frontend/src/app/support apps/frontend/src/app/messages`
Review every hit. Also check the four pages for dead `useTranslation` imports (unused) and remove them.

- [ ] **Step 2: Restyle each page**

Apply the dark-theme rows of the Global Constraints swap table to every hit:
- `bg-[#0a0a0b]`, `bg-[#18181b]`, `bg-[#111]` → `bg-white` (page shells) or `bg-slate-50` (panels)
- `text-[#fafafa]`, `text-white/90` (on dark) → `text-slate-900`
- `text-[#60a5fa]` → `text-indigo-600`
- `border-[#27272a]` → `border-slate-200`
- Chat bubbles: outbound `bg-[#60a5fa]` → `bg-indigo-600` (keep white text); inbound `bg-[#27272a]`/`bg-[#18181b]` → `bg-slate-100` with `text-slate-900`.
- Sidebars/labels on dark backgrounds → `bg-slate-900` with `text-white` where a dark panel is intentional (only nav/brand strips).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` in `apps/frontend`
Expected: PASS. In the dev server, open `/support` and `/messages`: pages are light, indigo accents, readable.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/support apps/frontend/src/app/messages
git commit -m "style(frontend): restyle support and messages to the light theme"
```

---

### Task 7: Remove `/dashboard-preview` + add styled `not-found`

**Files:**
- Delete: `apps/frontend/src/app/dashboard-preview/` (whole directory)
- Create: `apps/frontend/src/app/not-found.tsx`

**Interfaces:**
- Produces: a brand-styled 404 page for unknown routes.

- [ ] **Step 1: Delete the mockup**

Delete the directory `apps/frontend/src/app/dashboard-preview` (use `Remove-Item -Recurse`). Grep for any links pointing to `/dashboard-preview` (`rg -n "dashboard-preview" apps/frontend/src`) and remove them.

- [ ] **Step 2: Create the not-found page**

Create `apps/frontend/src/app/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <p className="text-sm tracking-[0.3em] text-indigo-600 font-semibold uppercase mb-3">404</p>
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="text-slate-500 mt-4 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="btn-primary mt-8 no-underline">
        Back to home
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `pnpm --filter frontend build` in `apps/frontend`
Expected: PASS; `rg -n "dashboard-preview"` returns nothing.

- [ ] **Step 4: Commit**

```bash
git add -A apps/frontend/src/app/dashboard-preview apps/frontend/src/app/not-found.tsx
git commit -m "chore(frontend): remove dashboard-preview mockup and add styled 404"
```

---

### Task 8: Community hub restyle

**Files:**
- Modify: `apps/frontend/src/app/community/page.tsx` and ALL pages under `apps/frontend/src/app/community/*` (resume, careers, notes, quizzes, flashcards, diagrams, documents, image-processor, design) + `apps/frontend/src/components/ai/AiResumeAssistant.tsx` (purple `#a855f7`-family colors → indigo)

**Interfaces:**
- Consumes: the swap table (Global Constraints) and existing page structure; NO functional changes.

- [ ] **Step 1: Restyle the hub grid**

In `apps/frontend/src/app/community/page.tsx`: keep the tools array (icons and `color`/`bg` per-tool colors stay — they give each tool identity and are already near-pastel tailwind classes), but change line 114 `group-hover:text-khmer-blue` → `group-hover:text-indigo-600`, and line 117 `text-gray-500` → `text-slate-500` (use `Replace All` for `gray-` → `slate-` and `khmer-blue` → `indigo-600` in this file).

- [ ] **Step 2: Apply the swap table across community tool pages**

For each file under `apps/frontend/src/app/community/*` (excluding any existing test files): run the Global Constraints swap table replacements (`khmer-*` classes, `font-['Playfair_Display']`, hardcoded palette hexes, `gray-*` → `slate-*`). For `AiResumeAssistant.tsx`, replace purple accents (`bg-purple-*`, `text-purple-*`, `#a855f7`, `#9333ea`) with `indigo` equivalents (`#6366f1`, `#4338ca`).

Check for remaining hits:

Run: `rg -n "khmer-|Playfair|#1a237e|#283593|#d42027|#8b5cf6|#a855f7" apps/frontend/src/app/community apps/frontend/src/components/ai`
Expected: no output (all hits in those dirs resolved).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `pnpm --filter frontend build` in `apps/frontend`
Expected: PASS. Spot-check `/community`, `/community/resume`, `/community/notes` in the dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/community apps/frontend/src/components/ai
git commit -m "style(frontend): restyle community hub and tools to the new theme"
```

---

### Task 9: Careers — fix dead `?cat=` filter + empty state

**Files:**
- Create: `apps/frontend/src/lib/articleFilter.ts`, `apps/frontend/src/lib/articleFilter.spec.ts`
- Modify: `apps/frontend/src/app/community/careers/page.tsx`

**Interfaces:**
- Produces: `filterArticlesByCategory(articles: Article[], slug: string | undefined): Article[]` where `Article` is the shape used by the careers page (declare it locally in the lib if `@/services/api` has no `Article` type: `{ id: string; title: string; slug: string; categorySlug: string; excerpt?: string }`).
- Consumes: whatever the careers page currently renders (read the file first).

- [ ] **Step 1: Read the careers page**

Read `apps/frontend/src/app/community/careers/page.tsx` and note: how articles are fetched/rendered (server fetch vs hardcoded samples), and the current `?cat=` link pattern.

- [ ] **Step 2: Write the failing test**

Create `apps/frontend/src/lib/articleFilter.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterArticlesByCategory } from "./articleFilter";
import type { Article } from "./articleFilter";

const articles: Article[] = [
  { id: "1", title: "Interview Tips", slug: "interview-tips", categorySlug: "interviews" },
  { id: "2", title: "Resume Guide", slug: "resume-guide", categorySlug: "resumes" },
  { id: "3", title: "Salary Talk", slug: "salary-talk", categorySlug: "interviews" },
];

describe("filterArticlesByCategory", () => {
  it("returns all articles when no slug is given", () => {
    expect(filterArticlesByCategory(articles, undefined)).toHaveLength(3);
  });

  it("filters by the requested category", () => {
    expect(filterArticlesByCategory(articles, "interviews").map((a) => a.id)).toEqual(["1", "3"]);
  });

  it("returns an empty array for an unknown category", () => {
    expect(filterArticlesByCategory(articles, "none")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/articleFilter.spec.ts` in `apps/frontend`
Expected: FAIL — module not found

- [ ] **Step 4: Implement the filter**

Create `apps/frontend/src/lib/articleFilter.ts`:

```ts
export type Article = {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  excerpt?: string;
};

export function filterArticlesByCategory(
  articles: Article[],
  slug: string | undefined
): Article[] {
  if (!slug) return articles;
  return articles.filter((a) => a.categorySlug === slug);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/articleFilter.spec.ts` in `apps/frontend`
Expected: PASS (3 tests)

- [ ] **Step 6: Fix the page**

Modify `apps/frontend/src/app/community/careers/page.tsx`:
1. Add `searchParams` param: `export default async function CareersPage({ searchParams }: { searchParams: Promise<{ cat?: string }> })` and `const { cat } = await searchParams;`.
2. Filter the fetched articles: `const articles = filterArticlesByCategory(allArticles, cat);` (map the page's article objects to the `Article` shape via `{ id, title, slug, categorySlug: categorySlug ?? article.category?.slug ?? "" }` — adapt to the actual fetched type).
3. Category links: highlight the active one (`text-indigo-600 font-semibold` when `cat === slug`, mirroring Task 4's aside).
4. Empty state: REPLACE the hardcoded sample articles block. If `articles.length === 0`, render:
   ```tsx
   <p className="text-slate-500 text-center py-16">
     No articles in this category yet.
   </p>
   ```
   Remove the non-clickable sample articles entirely.

- [ ] **Step 7: Verify**

Run: `npx vitest run` and `npx tsc --noEmit` in `apps/frontend`
Expected: PASS. In the dev server, category links on `/community/careers` filter the list and the empty state renders for empty categories.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/lib/articleFilter.ts apps/frontend/src/lib/articleFilter.spec.ts apps/frontend/src/app/community/careers/page.tsx
git commit -m "fix(frontend): make careers category filter work and add empty state"
```

---

### Task 10: Seller area restyle

**Files:**
- Modify: `apps/frontend/src/app/seller/apply/page.tsx`, `apps/frontend/src/app/seller/dashboard/page.tsx`, `apps/frontend/src/app/seller/products/page.tsx`, `apps/frontend/src/app/seller/products/new/page.tsx`, `apps/frontend/src/app/seller/products/[id]/edit/page.tsx`, `apps/frontend/src/app/seller/orders/page.tsx`, `apps/frontend/src/app/seller/orders/[id]/page.tsx`, `apps/frontend/src/app/seller/shop/[userId]/page.tsx`

**Interfaces:**
- Consumes: the swap table (Global Constraints); NO functional changes.

- [ ] **Step 1: Apply the swap table**

For each listed file, apply every row of the Global Constraints swap table (`khmer-*`, `Playfair`, palette hexes, `gray-` → `slate-`). The seller dashboard status card (pending/approved/rejected) keeps its semantic colors (amber/green/red) — only the chrome changes.

- [ ] **Step 2: Verify no leftovers**

Run: `rg -n "khmer-|Playfair|#1a237e|#283593|#d42027|#d4a027" apps/frontend/src/app/seller`
Expected: no output

- [ ] **Step 3: Build + typecheck**

Run: `npx tsc --noEmit` and `pnpm --filter frontend build` in `apps/frontend`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/seller
git commit -m "style(frontend): restyle seller area to the new theme"
```

---

### Task 11: Admin — top-nav layout (Layout C) + login restyle + admin tokens already done in Task 1

**Files:**
- Modify: `apps/admin/src/app/admin/layout.tsx` (full rewrite), `apps/admin/src/app/login/page.tsx`, `apps/admin/src/app/admin/page.tsx` (KPI cards/charts chrome)

**Interfaces:**
- Consumes: same nav destinations as today (`/admin`, `/admin/products`, `/admin/categories`, `/admin/articles`, `/admin/sellers`, `/admin/orders`, `/admin/warranties`, `/admin/support`); `recharts` components already used on `/admin` stay.
- Produces: horizontal top navigation with mobile hamburger drawer; KPI/charts pages keep their routes.

- [ ] **Step 1: Rewrite the admin layout**

Replace `apps/admin/src/app/admin/layout.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/warranties", label: "Warranties" },
  { href: "/admin/support", label: "Support" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  const nav = (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4 px-4 sm:px-6 h-14">
          <button
            onClick={() => setNavOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/admin" className="no-underline shrink-0">
            <span className="font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              KHMER<span className="text-indigo-600">SHOP</span>{" "}
              <span className="text-xs font-semibold text-slate-400">ADMIN</span>
            </span>
          </Link>
          <div className="hidden md:block ml-4 flex-1 min-w-0">{nav}</div>
          <Link
            href="/"
            className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            &larr; Back to site
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold tracking-tight text-slate-900">
                KHMER<span className="text-indigo-600">SHOP</span>
              </span>
              <button
                onClick={() => setNavOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1" onClick={() => setNavOpen(false)}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="p-4 sm:p-6 animate-fade-in">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Restyle the login page**

Open `apps/admin/src/app/login/page.tsx` and apply the swap table (blue button → `bg-slate-900 hover:bg-indigo-700` or `bg-indigo-600 hover:bg-indigo-700`; `khmer-*` → ink/indigo; remove Playfair). Keep the page a centered card on `bg-slate-50`.

- [ ] **Step 3: Restyle the dashboard KPI cards**

In `apps/admin/src/app/admin/page.tsx` apply the swap table to the KPI cards, alerts, and chart wrappers (`khmer-*` → ink/indigo, `gray-*` → `slate-*`). Keep the recharts colors as-is unless they use `khmer-*` hexes, in which case switch them to `#6366f1` (primary line) / `#4338ca`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` and `pnpm --filter admin build` in `apps/admin`, then `npx vitest run`
Expected: PASS; existing admin tests (`smoke.spec.ts`, `api.products.spec.ts`) stay green. Dev-server check: top nav visible on desktop, drawer on mobile, login branded.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/app/admin/layout.tsx apps/admin/src/app/login/page.tsx apps/admin/src/app/admin/page.tsx
git commit -m "style(admin): switch to top-nav layout and restyle login and dashboard"
```

---

### Task 12: Final sweep + polish + full verification

**Files:**
- Modify: `apps/frontend/src/app/manifest.ts` (themeColor)
- Any remaining files with legacy classes found by the greps below.

**Interfaces:**
- Consumes: everything produced by Tasks 1-11.

- [ ] **Step 1: Grep for leftovers across the frontend**

Run:
```
rg -n "Playfair|#1a237e|#283593|#d42027|#d4a027|#f0c040|khmer-gold|khmer-red" apps/frontend/src
```
Every hit must be justified: theme-token aliases in `@theme` (globals.css: keep), star-rating gold accents (keep `amber`/gold only for ratings), or flagged for replacement. Fix any hit that is a brand color used as chrome (swap table).

- [ ] **Step 2: Same sweep across admin**

Run: `rg -n "Playfair|#1a237e|#283593|#d42027|#d4a027|khmer-gold|khmer-red" apps/admin/src`
Expected: only `@theme` aliases remain.

- [ ] **Step 3: PWA theme color**

In `apps/frontend/src/app/manifest.ts`, change `theme_color` (or `themeColor`) to `"#0f172a"`.

- [ ] **Step 4: Full verification**

Run (each from its own directory):
1. `npx vitest run` in `packages/ui`, `apps/frontend`, `apps/admin`, `apps/backend`
2. `npx tsc --noEmit` in `packages/ui`, `apps/frontend`, `apps/admin`
3. `pnpm --filter frontend build` and `pnpm --filter admin build` (root)

Expected: all PASS. Backend must be untouched and green (it was green before: 86 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final Modern Monogram sweep and theme color update"
```

---

## Self-Review Notes (verified)

- Spec coverage: §2 (tokens, fonts, packages/ui) → Tasks 1-2; §3 storefront (home, PDP, shop filter, support light theme, dashboard-preview removal, 404) → Tasks 3-7; §4 community (hub restyle, careers filter) → Tasks 8-9; §5 seller → Task 10; §6 admin top-nav + login → Tasks 1, 11; §8 testing → embedded in each task + Task 12; §7 i18n deliberately excluded (Plan B).
- No placeholders: all code blocks are complete; restyle tasks that cannot hold full file dumps instead carry exact find→replace tables (Global Constraints) with explicit `rg` verification.
- Cross-task consistency: `filterProductsByCategory` (Task 4) vs `filterArticlesByCategory` (Task 9) are different functions for different entities and never referenced outside their own task. `@theo/ui` exports finalized in Task 2, consumed from Task 2 onward. Token names (`--color-ink`, `--color-accent`, `--color-accent-dark`) used only in globals.css, not referenced by name in components (Tailwind classes only), so no rename risk.