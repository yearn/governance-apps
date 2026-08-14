import type { Metadata, MetadataRoute } from "next";
import {
  GOVERNANCE_APP_PROD_HOSTS,
  normalizeGovernanceHostname,
  type GovernanceApp,
} from "./governance-hosts";

const INDEXABLE_GOVERNANCE_APPS = [
  "styfi",
  "veyfi",
] as const satisfies readonly GovernanceApp[];

export type IndexableGovernanceApp =
  (typeof INDEXABLE_GOVERNANCE_APPS)[number];

type PublicSurface = {
  name: string;
  alternateName: string;
  description: string;
};

const PUBLIC_SURFACES: Record<IndexableGovernanceApp, PublicSurface> = {
  styfi: {
    name: "stYFI",
    alternateName: "Yearn stYFI",
    description:
      "Stake YFI to earn yield and participate in Yearn Governance. Manage stYFI and stYFIx positions.",
  },
  veyfi: {
    name: "veYFI",
    alternateName: "Yearn veYFI",
    description:
      "Manage legacy veYFI locks, migrate to the new system, and manage Liquid Lockers (LLYFI).",
  },
};

export function getGovernanceAppCanonicalUrl(app: GovernanceApp): string {
  return `https://${GOVERNANCE_APP_PROD_HOSTS[app]}`;
}

export function createGovernanceAppMetadata(
  app: GovernanceApp,
  metadata: Metadata
): Metadata {
  const canonicalUrl = getGovernanceAppCanonicalUrl(app);

  return {
    ...metadata,
    metadataBase: new URL(canonicalUrl),
    alternates: {
      ...(metadata.alternates ?? {}),
      canonical: canonicalUrl,
    },
    openGraph: {
      ...(metadata.openGraph ?? {}),
      url: canonicalUrl,
    },
  };
}

export function getIndexableGovernanceAppForHostname(
  hostname: string | null | undefined
): IndexableGovernanceApp | null {
  const normalized = normalizeGovernanceHostname(hostname);
  if (!normalized) return null;

  return (
    INDEXABLE_GOVERNANCE_APPS.find(
      (app) => GOVERNANCE_APP_PROD_HOSTS[app] === normalized
    ) ?? null
  );
}

export function isIndexableGovernanceHostname(
  hostname: string | null | undefined
): boolean {
  return getIndexableGovernanceAppForHostname(hostname) !== null;
}

export function buildGovernanceRobots(
  hostname: string | null | undefined
): MetadataRoute.Robots {
  const app = getIndexableGovernanceAppForHostname(hostname);
  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: "/",
    disallow: ["/api/", "/debug/"],
  };

  if (!app) return { rules };

  return {
    rules,
    sitemap: `${getGovernanceAppCanonicalUrl(app)}/sitemap.xml`,
  };
}

export function buildGovernanceSitemap(
  hostname: string | null | undefined
): MetadataRoute.Sitemap {
  const app = getIndexableGovernanceAppForHostname(hostname);
  if (!app) return [];

  return [
    {
      url: getGovernanceAppCanonicalUrl(app),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

export function buildGovernanceLlmsText(
  hostname: string | null | undefined
): string | null {
  const app = getIndexableGovernanceAppForHostname(hostname);
  if (!app) return null;

  const surface = PUBLIC_SURFACES[app];
  const canonicalUrl = getGovernanceAppCanonicalUrl(app);

  return [
    `# ${surface.name}`,
    "",
    `> ${surface.description}`,
    "",
    "This is the canonical public interface. Read live balances, rates, positions, and transaction state from the application rather than this summary.",
    "",
    "## Website",
    "",
    `- [Open ${surface.name}](${canonicalUrl}): Canonical ${surface.alternateName} interface.`,
    "",
  ].join("\n");
}

export function createGovernanceWebSiteJsonLd(app: IndexableGovernanceApp) {
  const surface = PUBLIC_SURFACES[app];
  const canonicalUrl = getGovernanceAppCanonicalUrl(app);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${canonicalUrl}/#website`,
    url: canonicalUrl,
    name: surface.name,
    alternateName: surface.alternateName,
    description: surface.description,
    inLanguage: "en",
  } as const;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
