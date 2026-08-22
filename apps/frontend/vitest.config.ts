import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts"],
    root: ".",
    setupFiles: ["./vitest.setup.ts"],
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
