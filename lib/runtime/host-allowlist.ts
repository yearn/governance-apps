export type GovernanceAppHost = "styfi" | "veyfi" | "yeth";

const CANONICAL_HOSTS: Record<GovernanceAppHost, string> = {
  styfi: "styfi.yearn.fi",
  veyfi: "veyfi.yearn.fi",
  yeth: "yeth.yearn.fi",
};

const APP_ALLOWED_HOSTS: Record<GovernanceAppHost, ReadonlySet<string>> = {
  styfi: new Set(["styfi-beta.dao-ops.com"]),
  veyfi: new Set(["veyfi-beta.dao-ops.com"]),
  yeth: new Set(["yeth-beta.dao-ops.com"]),
};

const SHARED_ALLOWED_HOSTS = new Set(["app.dao-ops.com"]);
const LOCALHOST_PATTERN =
  /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/;
const HOST_WITH_PORT_PATTERN = /^([a-z0-9.-]+):(\d{1,5})$/i;

function isValidPort(rawPort: string) {
  const numeric = Number(rawPort);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 65535;
}

function normalizeHost(host: string | null | undefined) {
  if (!host) return null;
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end < 0) return null;
    const base = trimmed.slice(0, end + 1);
    const remainder = trimmed.slice(end + 1);
    if (!remainder) return base;
    if (!/^:\d{1,5}$/.test(remainder)) return null;
    const rawPort = remainder.slice(1);
    return isValidPort(rawPort) ? `${base}${remainder}` : null;
  }

  const hostWithPort = trimmed.match(HOST_WITH_PORT_PATTERN);
  if (hostWithPort) {
    const rawPort = hostWithPort[2];
    if (!isValidPort(rawPort)) return null;
  }
  return trimmed;
}

function stripPort(host: string) {
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  const match = host.match(HOST_WITH_PORT_PATTERN);
  if (!match) return host;
  return match[1];
}

export function resolveAllowedOrigin(
  app: GovernanceAppHost,
  rawHost: string | null | undefined
) {
  const canonicalHost = CANONICAL_HOSTS[app];
  const appAllowedHosts = APP_ALLOWED_HOSTS[app];
  const normalized = normalizeHost(rawHost);

  if (!normalized) {
    return `https://${canonicalHost}`;
  }

  if (LOCALHOST_PATTERN.test(normalized)) {
    return `http://${normalized}`;
  }

  const hostWithoutPort = stripPort(normalized);
  if (
    hostWithoutPort === canonicalHost ||
    appAllowedHosts.has(hostWithoutPort) ||
    SHARED_ALLOWED_HOSTS.has(hostWithoutPort)
  ) {
    return `https://${hostWithoutPort}`;
  }

  return `https://${canonicalHost}`;
}
