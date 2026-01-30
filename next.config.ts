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

const isProduction = process.env.VERCEL_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const headers = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
    ];

    if (!isProduction) {
      headers.push({
        key: "X-Robots-Tag",
        value: "noindex, nofollow",
      });
    }

    return [
      {
        source: "/(.*)",
        headers,
      },
    ];
  },

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
