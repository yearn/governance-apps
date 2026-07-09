import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { YbcPageClient } from "./YbcPageClient";
import { resolveAllowedOrigin } from "@/lib/runtime/host-allowlist";
import { isYbcEnabled } from "@/lib/runtime/features";

export const viewport: Viewport = {
  themeColor: "#000000",
};

const baseMetadata: Metadata = {
  title: "Yearn Builder's Collective | Yearn Finance",
  description:
    "Review YBC influence, member weight, proposals, and rewards.",
  applicationName: "Yearn Builder's Collective",
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
    title: "Yearn Builder's Collective | Yearn Finance",
    description:
      "Review YBC influence, member weight, proposals, and rewards.",
    url: "https://ybc.yearn.fi",
    siteName: "Yearn Finance",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Yearn Builder's Collective | Yearn Finance",
    description:
      "Review YBC influence, member weight, proposals, and rewards.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  if (!isYbcEnabled()) {
    return {
      title: "Not Found",
      robots: { index: false, follow: false },
    };
  }

  const headerList = await headers();
  const origin = resolveAllowedOrigin("ybc", headerList.get("host"));

  return {
    ...baseMetadata,
    metadataBase: new URL(origin),
    openGraph: {
      ...(baseMetadata.openGraph ?? {}),
      url: origin,
    },
  };
}

export default async function YbcPage() {
  if (!isYbcEnabled()) {
    notFound();
  }

  const headerList = await headers();
  const hostname = headerList.get("host");

  return <YbcPageClient hostname={hostname} />;
}
