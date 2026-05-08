import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TeamsPageClient } from "./TeamsPageClient";
import { resolveAllowedOrigin } from "@/lib/runtime/host-allowlist";
import { isTeamsEnabled } from "@/lib/runtime/features";

export const viewport: Viewport = {
  themeColor: "#000000",
};

const baseMetadata: Metadata = {
  title: "Team Finances | Yearn Finance",
  description:
    "Directory-first finance and operations workspace for registered protocol teams.",
  applicationName: "Team Finances",
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
    title: "Team Finances | Yearn Finance",
    description:
      "Directory-first finance and operations workspace for registered protocol teams.",
    url: "https://teams.yearn.fi",
    siteName: "Yearn Finance",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Team Finances | Yearn Finance",
    description:
      "Directory-first finance and operations workspace for registered protocol teams.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  if (!isTeamsEnabled()) {
    return {
      title: "Not Found",
      robots: { index: false, follow: false },
    };
  }

  const headerList = await headers();
  const origin = resolveAllowedOrigin("teams", headerList.get("host"));

  return {
    ...baseMetadata,
    metadataBase: new URL(origin),
    openGraph: {
      ...(baseMetadata.openGraph ?? {}),
      url: origin,
    },
  };
}

export default function TeamsPage() {
  if (!isTeamsEnabled()) {
    notFound();
  }

  return <TeamsPageClient />;
}
