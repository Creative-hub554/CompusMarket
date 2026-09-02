import { defineConfig } from "@playwright/test";

const FRONT_PORT = process.env.E2E_FRONT_PORT ?? "3000";
const BACK_PORT = process.env.E2E_BACK_PORT ?? "4000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${FRONT_PORT}`,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
  },
  globalSetup: "./e2e/global-setup.ts",
  webServer: [
    {
      command: `pnpm -C ../backend dev`,
      url: `http://localhost:${BACK_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
    {
      command: `pnpm -C . dev`,
      url: `http://localhost:${FRONT_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
  ],
});
