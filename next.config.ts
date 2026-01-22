import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

initOpenNextCloudflareForDev();

interface WebpackConfig {
  resolve?: {
    fallback?: Record<string, boolean>;
    alias?: Record<string, boolean>;
  };
}

const nextConfig: NextConfig = {
  output: "standalone",

  webpack: (config: WebpackConfig, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};

      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
      };

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "pino-pretty": false,
        lokijs: false,
        encoding: false,
      };
    }
    return config;
  },
};

export default nextConfig;
