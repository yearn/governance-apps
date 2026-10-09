import type { Metadata, Viewport } from "next";
import {
  GOVERNANCE_APP_PREPROD_HOSTS,
  GOVERNANCE_APP_PROD_HOSTS,
  GOVERNANCE_LOCALHOST_HOSTS,
  GOVERNANCE_SHARED_PATH_HOSTS,
} from "@/lib/runtime/governance-hosts";

export const DAO_DESCRIPTION =
  "Review proposals and take part in Yearn DAO decisions.";
export const DAO_SOCIAL_IMAGE = "/og-DAO.png";

type DaoMetadataOptions = {
  hostname?: string;
  path?: string;
  description?: string;
  canonical?: boolean;
};

// Only known app hosts can become absolute social URLs. Request headers must
// never turn a share preview into an arbitrary external canonical URL.
function daoMetadataLocation(hostname: string | undefined, path: string) {
  if (!hostname || !/^[a-z0-9.:[\]-]+$/i.test(hostname)) return null;
  try {
    const origin = new URL(`https://${hostname}`);
    const isLocal = GOVERNANCE_LOCALHOST_HOSTS.has(origin.hostname);
    const isSubdomain = origin.hostname === GOVERNANCE_APP_PROD_HOSTS.dao ||
      origin.hostname === GOVERNANCE_APP_PREPROD_HOSTS.dao;
    if (!isLocal && ((!isSubdomain && !GOVERNANCE_SHARED_PATH_HOSTS.has(origin.hostname)) || origin.port)) return null;
    if (isLocal) origin.protocol = "http:";
    const route = isSubdomain ? path : `/dao${path === "/" ? "" : path}`;
    return { origin, url: new URL(route, origin), production: origin.hostname === GOVERNANCE_APP_PROD_HOSTS.dao };
  } catch {
    return null;
  }
}

export const daoViewport: Viewport = {
  themeColor: "#000000",
};

export function createDaoRouteMetadata(title: string, options: DaoMetadataOptions = {}): Metadata {
  const description = options.description ?? DAO_DESCRIPTION;
  const location = daoMetadataLocation(options.hostname, options.path ?? "/");
  return {
    title,
    description,
    applicationName: "DAO Governance",
    robots: { index: false, follow: false },
    ...(location ? {
      metadataBase: location.origin,
      ...(location.production && options.canonical !== false ? { alternates: { canonical: location.url.href } } : {}),
    } : {}),
    openGraph: {
      title,
      description,
      ...(location ? { url: location.url.href } : {}),
      siteName: "Yearn Finance",
      locale: "en_US",
      type: "website",
      images: [{
        url: location ? new URL(DAO_SOCIAL_IMAGE, location.origin).href : DAO_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: "Yearn DAO — Propose. Discuss. Vote.",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [location ? new URL(DAO_SOCIAL_IMAGE, location.origin).href : DAO_SOCIAL_IMAGE],
    },
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
  };
}

export const daoNotFoundMetadata: Metadata = {
  title: "Not Found",
  robots: { index: false, follow: false },
};
