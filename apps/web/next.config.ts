import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/db", "@repo/shared-types", "@repo/ats-connectors", "@repo/ai-clients"],
  compress: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    optimizePackageImports: ["lucide-react", "@clerk/nextjs", "@tanstack/react-query"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
