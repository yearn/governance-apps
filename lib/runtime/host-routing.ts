const HOST_TO_PREFIX = {
  "styfi.yearn.fi": "/styfi",
  "veyfi.yearn.fi": "/veyfi",
  "yeth.yearn.fi": "/yeth",
} as const;

function stripPort(host: string): string | null {
  if (!host) return null;

  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end < 0) return null;
    return host.slice(0, end + 1);
  }

  const lastColon = host.lastIndexOf(":");
  if (lastColon < 0) return host;

  const maybePort = host.slice(lastColon + 1);
  if (!/^\d{1,5}$/.test(maybePort)) return host;
  return host.slice(0, lastColon);
}

export function normalizeHostname(value: string): string | null {
  const firstHost = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .find(Boolean);
  if (!firstHost) return null;

  let candidate = firstHost;
  if (candidate.includes("://")) {
    try {
      candidate = new URL(candidate).host.toLowerCase();
    } catch {
      return null;
    }
  }

  candidate = candidate.split("/")[0] || "";
  if (!candidate) return null;

  const withoutPort = stripPort(candidate);
  if (!withoutPort) return null;

  const withoutTrailingDot = withoutPort.replace(/\.$/, "");
  return withoutTrailingDot || null;
}

export function resolveHostPrefix(hostname: string): string | null {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return null;

  return HOST_TO_PREFIX[normalized as keyof typeof HOST_TO_PREFIX] ?? null;
}

export function applyHostPrefix(pathname: string, prefix: string | null): string {
  if (!prefix) return pathname;
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return pathname;
  return `${prefix}${pathname}`;
}
