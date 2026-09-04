import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

// Test-user credentials — create the user once in the Clerk dev instance, or
// override with E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD.
//   curl -X POST https://api.clerk.com/v1/users -H "Authorization: Bearer $CLERK_SECRET_KEY" -H "Content-Type: application/json" -d '{"email_address":["e2e-test-user@example.com"],"password":"e2e-test-password-123"}'
const TEST_USER_EMAIL =
  process.env.E2E_CLERK_USER_EMAIL ?? "e2e-test-user@example.com";
const TEST_USER_PASSWORD =
  process.env.E2E_CLERK_USER_PASSWORD ?? "e2e-test-password-123";

test.skip(
  !process.env.CLERK_SECRET_KEY,
  "CLERK_SECRET_KEY not set — Clerk e2e skipped",
);

test("signed-in user sees and can open the notifications bell", async ({
  page,
}) => {
  await setupClerkTestingToken({ page }); // bypass Clerk's bot detection
  await page.goto("/en/login");

  // Sign-in is single- or two-step depending on the instance: fill the
  // password now if visible, otherwise submit the identifier first.
  const identifier = page.locator('input[name="identifier"]');
  await identifier.waitFor({ state: "visible", timeout: 30_000 });
  await identifier.fill(TEST_USER_EMAIL);

  const password = page.locator('input[name="password"]');
  if (await password.isVisible()) {
    await password.fill(TEST_USER_PASSWORD);
  } else {
    await identifier.press("Enter");
    await password.waitFor({ state: "visible", timeout: 30_000 });
    await password.fill(TEST_USER_PASSWORD);
  }
  await password.press("Enter");

  // Sign-in succeeded once the URL leaves the login page (afterSignInUrl).
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 30_000,
  });

  // The bell only renders for a signed-in user; opening it shows the panel.
  const bell = page.getByRole("button", { name: "Notifications" });
  await expect(bell).toBeVisible({ timeout: 30_000 });
  await bell.click();
  await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
});
