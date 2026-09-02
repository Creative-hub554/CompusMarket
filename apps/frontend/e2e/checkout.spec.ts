import { expect, test } from "@playwright/test";

/**
 * Revenue-path E2E: a brand-new customer account buys a product through the
 * cart and sees the order. Runs against real dev servers and the real DB.
 *
 * Auth note: sign-in uses the NextAuth REST flow (register -> csrf ->
 * callback/credentials) executed in the page's own cookie jar.
 */

const password = "e2e-Password1!";

async function registerAndSignIn(
  page: import("@playwright/test").Page,
  email: string
) {
  const req = page.context().request;

  const reg = await req.post("/api/auth/register", {
    data: { email, password, name: "E2E Shopper" },
  });
  expect(reg.status()).toBe(201);

  const csrfRes = await req.get("/api/auth/csrf");
  expect(csrfRes.ok()).toBeTruthy();
  const { csrfToken } = await csrfRes.json();

  const cb = await req.post("/api/auth/callback/credentials", {
    form: { csrfToken, email, password, json: "true" },
  });
  expect(cb.ok()).toBeTruthy();

  const sess = await req.get("/api/auth/session");
  const body = (await sess.json()) as { user?: { email?: string } };
  expect(body.user?.email).toBe(email);
}

test("new customer can browse, buy and see the order", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`;
  await registerAndSignIn(page, email);

  // ── Signed-in shop: open the first product ──
  await page.goto("/en/shop");
  const productLink = page.locator('a[href*="/shop/"]').first();
  await productLink.waitFor();
  // Capture the name from the card link itself — the detail page has
  // multiple <h1>s (nav headings) and .first() can match the wrong one.
  const productName = (await productLink.innerText()).trim();
  expect(productName.length).toBeGreaterThan(0);
  await productLink.click();

  // Product detail: add to cart

  const addBtn = page.getByRole("button", { name: "Add to Cart" });
  await addBtn.waitFor();
  await addBtn.click();
  // The success label reverts after 2s — assert promptly.
  await expect(page.getByText("Added to Cart!")).toBeVisible({ timeout: 10_000 });

  // ── Cart shows the item -> proceed to checkout ──
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Shopping Cart" })).toBeVisible();
  const mainText = await page.locator("main").innerText();
  await expect(page.getByText(productName).first()).toBeVisible();
  await page.getByRole("button", { name: "Proceed to Checkout" }).click();

  // ── Order confirmation page shows the purchase ──
  await page.waitForURL(/\/en\/orders\//, { timeout: 30_000 });
  await expect(page.getByText(productName).first()).toBeVisible({ timeout: 20_000 });
});
