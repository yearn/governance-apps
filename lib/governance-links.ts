const APP_PATHS = {
  styfi: "/styfi",
  veyfi: "/veyfi",
  yeth: "/yeth",
} as const;

const APP_PROD_HOSTS = {
  styfi: "styfi.yearn.fi",
  veyfi: "veyfi.yearn.fi",
  yeth: "yeth.yearn.fi",
} as const;

const APP_BY_PATH: Map<string, GovernanceApp> = new Map(
  Object.entries(APP_PATHS).map(([app, path]) => [path, app as GovernanceApp])
);

const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "app.dao-ops.com"]);

export type GovernanceApp = keyof typeof APP_PATHS;

function normalizeHostname(hostname?: string | null): string | null {
  if (!hostname) return null;
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return null;

  // Header-derived host values can include a port (e.g. localhost:3000).
  if (normalized.startsWith("[")) {
    const closingBracketIndex = normalized.indexOf("]");
    return closingBracketIndex >= 0
      ? normalized.slice(0, closingBracketIndex + 1)
      : normalized;
  }

  return normalized.split(":")[0];
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) return path;
  const normalized = path.toLowerCase().replace(/\/+$/, "");
  return normalized || "/";
}

function shouldUseProdDomains(hostname: string | null): boolean {
  if (!hostname) return false;
  if (DEV_HOSTS.has(hostname)) return false;
  return hostname.endsWith(".yearn.fi");
}

export function resolveGovernanceAppHref(
  app: GovernanceApp,
  hostname?: string | null
): string {
  const normalizedHostname = normalizeHostname(hostname);
  if (shouldUseProdDomains(normalizedHostname)) {
    return `https://${APP_PROD_HOSTS[app]}`;
  }
  return APP_PATHS[app];
}

export function resolveGovernanceHref(
  href: string,
  hostname?: string | null
): string {
  const app = APP_BY_PATH.get(normalizePath(href));
  if (!app) return href;
  return resolveGovernanceAppHref(app, hostname);
}
