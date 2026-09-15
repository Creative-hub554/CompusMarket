import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // SSR-prerender tests (locale layout chrome) and page imports can exceed
    // the 5s default when the machine is under load (observed >15s spikes at
    // ~80% CPU from unrelated apps) while the same suite passes comfortably
    // in CI. 30s bounds genuine hangs without flaking locally.
    testTimeout: 30_000,
    server: {
      deps: {
        // next-intl's ESM build imports "next/navigation" unresolvable from
        // pnpm's isolated store unless Vite processes the package itself.
        inline: ["next-intl"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
