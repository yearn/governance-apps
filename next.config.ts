import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import path from "path";

initOpenNextCloudflareForDev();

interface WebpackConfig {
  resolve?: {
    fallback?: Record<string, boolean>;
    alias?: Record<string, boolean | string>;
  };
}

const nextConfig: NextConfig = {
  output: "standalone",

  webpack: (config: WebpackConfig, { isServer }: { isServer: boolean }) => {
    config.resolve = config.resolve || {};

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
      };
    }

    const emptyStub = path.resolve(__dirname, "lib/stubs/empty.ts");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": emptyStub,
      "@react-native-async-storage/async-storage": emptyStub,
      lokijs: false,
      encoding: false,
    };
    return config;
  },
};

export default nextConfig;
