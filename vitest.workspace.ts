import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/backend/vitest.config.ts",
  "apps/backend/vitest.e2e.config.ts",
  "apps/frontend/vitest.config.ts",
  "packages/database/vitest.config.ts",
  "packages/ui/vitest.config.ts",
  "packages/config/vitest.config.ts",
]);
