import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone output + monorepo tracing root are required for a lean Docker image.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@theo/ui"],
  // Keep Prisma external to the server bundle: the query engine DLL is resolved
  // at runtime from node_modules (the store's .prisma/client), and bundling it
  // makes the client look for the engine next to .next/server, which fails.
  serverExternalPackages: ["@prisma/client", "@prisma/engines", "@theo/database"],
};

export default nextConfig;
