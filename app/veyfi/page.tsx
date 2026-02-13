import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { VeyfiPageClient } from "./VeyfiPageClient";
import { resolveAllowedOrigin } from "@/lib/runtime/host-allowlist";

export const viewport: Viewport = {
  themeColor: "#000000",
};

const baseMetadata: Metadata = {
  title: "veYFI | Yearn Finance",
  description:
    "Manage legacy veYFI locks, migrate to the new system, and manage Liquid Lockers (LLYFI).",
  applicationName: "veYFI",
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
    title: "veYFI | Yearn Finance",
    description: "Manage legacy veYFI and Liquid Lockers.",
    url: "https://veyfi.yearn.fi",
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
    title: "veYFI | Yearn Finance",
    description: "Manage veYFI and Liquid Lockers.",
    images: ["/og-veYFI.png"],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const origin = resolveAllowedOrigin("veyfi", headerList.get("host"));

  return {
    ...baseMetadata,
    metadataBase: new URL(origin),
    openGraph: {
      ...(baseMetadata.openGraph ?? {}),
      url: origin,
    },
  };
}

export default async function VeyfiPage() {
  const headerList = await headers();
  const hostname = headerList.get("host");
  return <VeyfiPageClient hostname={hostname} />;
}
