import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { StyfiPageClient } from "./StyfiPageClient";

export const viewport: Viewport = {
  themeColor: "#000000",
};

const baseMetadata: Metadata = {
  title: "stYFI | Yearn Finance",
  description:
    "Stake YFI to earn yield and participate in Yearn Governance. Manage stYFI and stYFIx positions.",
  applicationName: "stYFI",
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
    title: "stYFI | Yearn Finance",
    description: "Stake YFI, earn USDC yield.",
    url: "https://styfi.yearn.fi",
    siteName: "Yearn Finance",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-stYFI.png",
        width: 1200,
        height: 630,
        alt: "Yearn Finance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "stYFI | Yearn Finance",
    description: "Stake YFI, earn yield.",
    images: ["/og-stYFI.png"],
  },
};

async function resolveOrigin(defaultHost: string) {
  const headerList = await headers();
  const host = headerList.get("host") ?? defaultHost;
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
  return `${protocol}://${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = await resolveOrigin("styfi.yearn.fi");

  return {
    ...baseMetadata,
    metadataBase: new URL(origin),
    openGraph: {
      ...(baseMetadata.openGraph ?? {}),
      url: origin,
    },
  };
}

// app/styfi/page.tsx
export default async function StyfiPage() {
  const headerList = await headers();
  const hostname = headerList.get("host");
  return <StyfiPageClient hostname={hostname} />;
}
