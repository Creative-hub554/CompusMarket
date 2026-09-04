import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

/**
 * Mints the Clerk Testing Token as a *project* (a function-based globalSetup
 * would keep CLERK_TESTING_TOKEN out of the workers). Needs CLERK_SECRET_KEY +
 * CLERK_PUBLISHABLE_KEY in the runner environment; without the secret key the
 * setup — and the authenticated specs — skip so guest specs still run.
 */
setup.describe.configure({ mode: "serial" });

setup("fetch Clerk testing token", async () => {
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn("CLERK_SECRET_KEY not set — skipping Clerk e2e setup.");
    return;
  }
  await clerkSetup();
});
