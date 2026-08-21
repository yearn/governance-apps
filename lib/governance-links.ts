import {
  GOVERNANCE_APP_PATHS,
  GOVERNANCE_APP_PREPROD_HOSTS,
  GOVERNANCE_APP_PROD_HOSTS,
  normalizeGovernanceHostname,
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

function normalizeAppPath(path: string): `/${string}` {
  const queryIndex = path.indexOf("?");
  const fragmentIndex = path.indexOf("#");
  const stateIndex = [queryIndex, fragmentIndex]
    .filter((index) => index >= 0)
    .reduce((first, index) => Math.min(first, index), path.length);
  const pathname = path.slice(0, stateIndex);
  const state = path.slice(stateIndex);
  const normalizedPathname = `/${pathname.replace(/^\/+/, "")}`;
  return `${normalizedPathname}${state}` as `/${string}`;
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

export function resolveGovernanceAppPathHref(
  app: GovernanceApp,
  appPath: `/${string}`,
  hostname?: string | null
): string {
  const linkSurface = resolveGovernanceLinkSurface(hostname);
  const normalizedHostname = normalizeGovernanceHostname(hostname);
  const path = normalizeAppPath(appPath || "/");

  if (linkSurface === "path-scoped") {
    if (path === "/") return GOVERNANCE_APP_PATHS[app];
    if (path.startsWith("/?") || path.startsWith("/#")) {
      return `${GOVERNANCE_APP_PATHS[app]}${path.slice(1)}`;
    }
    return `${GOVERNANCE_APP_PATHS[app]}${path}`;
  }

  const targetHostname =
    linkSurface === "prod-subdomain"
      ? GOVERNANCE_APP_PROD_HOSTS[app]
      : GOVERNANCE_APP_PREPROD_HOSTS[app];
  if (normalizedHostname === targetHostname) return path;

  return `https://${targetHostname}${path}`;
}

export function resolveGovernanceHref(
  href: string,
  hostname?: string | null
): string {
  const app = APP_BY_PATH.get(normalizePath(href));
  if (!app) return href;
  return resolveGovernanceAppHref(app, hostname);
}
