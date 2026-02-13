import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { YethPageClient } from "./YethPageClient";
import { resolveAllowedOrigin } from "@/lib/runtime/host-allowlist";
import { isYethEnabled } from "@/lib/runtime/features";

export const viewport: Viewport = {
  themeColor: "#000000",
};

const baseMetadata: Metadata = {
  title: "yETH Recovery | Yearn Finance",
  description:
    "Recover yETH value through the Yearn recovery mechanism. Choose immediate exit or opt-in Recovery Vault participation.",
  applicationName: "yETH Recovery",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicons/favicon.svg", type: "image/svg+xml", sizes: "any" },
      {
        url: "/favicons/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/favicons/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],
    apple: [
      {
        url: "/favicons/apple-icon-180x180.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  openGraph: {
    title: "yETH Recovery | Yearn Finance",
    description: "Recovery interface for retired yETH.",
    url: "https://yeth.yearn.fi",
    siteName: "Yearn Finance",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-veYFI.png",
        width: 1200,
        height: 630,
        alt: "Yearn Finance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "yETH Recovery | Yearn Finance",
    description: "Recovery interface for retired yETH.",
    images: ["/og-veYFI.png"],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  if (!isYethEnabled()) {
    return {
      title: "Not Found",
      robots: { index: false, follow: false },
    };
  }
  const headerList = await headers();
  const origin = resolveAllowedOrigin("yeth", headerList.get("host"));

  return {
    ...baseMetadata,
    metadataBase: new URL(origin),
    openGraph: {
      ...(baseMetadata.openGraph ?? {}),
      url: origin,
    },
  };
}

export default function YethPage() {
  if (!isYethEnabled()) {
    notFound();
  }
  return <YethPageClient />;
}
