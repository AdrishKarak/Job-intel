import type { NextConfig } from "next";
import path from "path";
// @ts-ignore - plugin does not bundle type declarations
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/db", "@repo/shared-types", "@repo/ats-connectors", "@repo/ai-clients"],
  compress: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    optimizePackageImports: ["lucide-react", "@clerk/nextjs", "@tanstack/react-query"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
