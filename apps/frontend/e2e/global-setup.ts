import { execSync } from "node:child_process";

/**
 * Guarantees seeded demo data (products with stock) so the checkout spec
 * always has something to buy. prisma db seed is idempotent.
 *
 * Also warms the Next.js dev server: on a cold start, webpack compiles
 * chunks lazily per request, and browsers that race an in-flight compile
 * can receive a truncated chunk (SyntaxError kills hydration site-wide).
 * Hitting each route once up-front forces those compiles before tests run.
 */
export default async function globalSetup() {
  execSync("pnpm -C ../../packages/database exec prisma db seed", {
    stdio: "inherit",
    shell: true,
  });

  const base = process.env.E2E_FRONT_URL ?? "http://localhost:3000";
  const routes = ["/en/login", "/en/shop", "/en/cart"];
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const route of routes) {
    let warmed = false;
    for (let attempt = 1; attempt <= 5 && !warmed; attempt++) {
      try {
        const res = await fetch(`${base}${route}`, { redirect: "manual" });
        warmed = res.status < 500;
      } catch {
        warmed = false;
      }
      if (!warmed) await wait(5_000);
    }
    if (!warmed) throw new Error(`Warmup failed for ${route}`);
  }
}
