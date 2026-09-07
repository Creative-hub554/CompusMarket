import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const minioHost = `${process.env.MINIO_ENDPOINT || "localhost"}:${
  process.env.MINIO_PORT || "9000"
}`;
const minioProtocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";

const nextConfig: NextConfig = {
  // Standalone output + monorepo tracing root are required for a lean Docker image.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@react-pdf/renderer", "@theo/ui"],
  // Keep Prisma external to the server bundle: the query engine DLL is resolved
  // at runtime from node_modules (the store's .prisma/client), and bundling it
  // makes the client look for the engine next to .next/server, which fails.
  serverExternalPackages: ["@prisma/client", "@prisma/engines", "@theo/database"],
  images: {
    // Allow-list only: localhost dev servers and the MinIO upload endpoint.
    // Never use hostname "**" here — it turns the image optimizer into an
    // open proxy for arbitrary remote hosts.
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: minioProtocol as "http" | "https", hostname: minioHost.split(":")[0] },
      // Clerk-hosted avatars: the proxy serves dev and prod images alike.
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      ...(process.env.IMAGE_HOSTS || "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean)
        .map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
