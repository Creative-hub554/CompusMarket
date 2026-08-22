import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const minioHost = `${process.env.MINIO_ENDPOINT || "localhost"}:${
  process.env.MINIO_PORT || "9000"
}`;
const minioProtocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";

const nextConfig: NextConfig = {
  transpilePackages: ["@react-pdf/renderer", "@theo/ui"],
  images: {
    // Allow-list only: localhost dev servers and the MinIO upload endpoint.
    // Never use hostname "**" here — it turns the image optimizer into an
    // open proxy for arbitrary remote hosts.
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: minioProtocol as "http" | "https", hostname: minioHost.split(":")[0] },
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
