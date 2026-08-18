import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { StyfiPageClient } from "./StyfiPageClient";
import { GovernanceWebSiteJsonLd } from "@/components/seo/GovernanceWebSiteJsonLd";
import { createGovernanceAppMetadata } from "@/lib/runtime/discoverability";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = createGovernanceAppMetadata("styfi", {
  title: "stYFI | Yearn Finance",
  description:
    "Stake YFI to earn yield and participate in Yearn Governance. Manage stYFI and stYFIx positions.",
  applicationName: "stYFI",
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
});

// app/styfi/page.tsx
export default async function StyfiPage() {
  const headerList = await headers();
  const hostname = headerList.get("host");
  const nonce = headerList.get("x-nonce");

  return (
    <>
      <GovernanceWebSiteJsonLd app="styfi" nonce={nonce} />
      <StyfiPageClient hostname={hostname} />
    </>
  );
}
