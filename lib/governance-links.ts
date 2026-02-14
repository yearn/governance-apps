import {
  GOVERNANCE_APP_PATHS,
  GOVERNANCE_APP_PREPROD_HOSTS,
  GOVERNANCE_APP_PROD_HOSTS,
  resolveGovernanceLinkSurface,
  type GovernanceApp,
} from "@/lib/runtime/governance-hosts";

const APP_BY_PATH: Map<string, GovernanceApp> = new Map(
  Object.entries(GOVERNANCE_APP_PATHS).map(([app, path]) => [
    path,
    app as GovernanceApp,
  ])
);

function normalizePath(path: string): string {
  if (!path.startsWith("/")) return path;
  const normalized = path.toLowerCase().replace(/\/+$/, "");
  return normalized || "/";
}

export type { GovernanceApp };

export function resolveGovernanceAppHref(
  app: GovernanceApp,
  hostname?: string | null
): string {
  const linkSurface = resolveGovernanceLinkSurface(hostname);
  if (linkSurface === "prod-subdomain") {
    return `https://${GOVERNANCE_APP_PROD_HOSTS[app]}`;
  }

  if (linkSurface === "preprod-subdomain") {
    return `https://${GOVERNANCE_APP_PREPROD_HOSTS[app]}`;
  }

  return GOVERNANCE_APP_PATHS[app];
}

export function resolveGovernanceHref(
  href: string,
  hostname?: string | null
): string {
  const app = APP_BY_PATH.get(normalizePath(href));
  if (!app) return href;
  return resolveGovernanceAppHref(app, hostname);
}
