import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@react-pdf/renderer"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
