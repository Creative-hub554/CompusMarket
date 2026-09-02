import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone output + monorepo tracing root are required for a lean Docker image.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@theo/ui"],
};

export default nextConfig;
