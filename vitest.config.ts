import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    projects: ["apps/*", "packages/*"],
    include: ["**/*.spec.ts", "**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.worktrees/**",
      "**/e2e/**",
      "**/*.e2e-spec.ts",
      "**/*.e2e.test.ts",
    ],
    root: ".",
  },
});
