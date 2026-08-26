import { resolveHostPrefix } from "@/lib/runtime/host-routing";

const APP_NAV = {
  dao: { label: "DAO Governance", path: "/dao" },
  styfi: { label: "stYFI", path: "/styfi" },
  veyfi: { label: "veYFI", path: "/veyfi" },
  teams: { label: "Team Finances", path: "/teams" },
  yeth: { label: "yETH", path: "/yeth" },
  ybc: { label: "Yearn Builder's Collective", path: "/ybc" },
} as const;

export type HeaderAppKey = keyof typeof APP_NAV;

function isAppKey(value: string | null): value is HeaderAppKey {
  return (
    value === "dao" ||
    value === "styfi" ||
    value === "veyfi" ||
    value === "teams" ||
    value === "yeth" ||
    value === "ybc"
  );
}

function appKeyFromPrefix(prefix: string | null): HeaderAppKey | null {
  if (prefix === APP_NAV.dao.path) return "dao";
  if (prefix === APP_NAV.styfi.path) return "styfi";
  if (prefix === APP_NAV.veyfi.path) return "veyfi";
  if (prefix === APP_NAV.teams.path) return "teams";
  if (prefix === APP_NAV.yeth.path) return "yeth";
  if (prefix === APP_NAV.ybc.path) return "ybc";
  return null;
}

function matchesAppPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function appKeyFromPathname(pathname: string): HeaderAppKey | null {
  if (matchesAppPath(pathname, APP_NAV.dao.path)) return "dao";
  if (matchesAppPath(pathname, APP_NAV.styfi.path)) return "styfi";
  if (matchesAppPath(pathname, APP_NAV.veyfi.path)) return "veyfi";
  if (matchesAppPath(pathname, APP_NAV.teams.path)) return "teams";
  if (matchesAppPath(pathname, APP_NAV.yeth.path)) return "yeth";
  if (matchesAppPath(pathname, APP_NAV.ybc.path)) return "ybc";
  return null;
}

export function resolveHeaderAppKey(
  pathname: string | null,
  segment: string | null,
  hostname: string | null | undefined
): HeaderAppKey | null {
  const hostAppKey = appKeyFromPrefix(
    hostname ? resolveHostPrefix(hostname) : null
  );
  if (hostAppKey) return hostAppKey;

  const normalizedPathname = pathname?.toLowerCase() ?? "";
  const pathAppKey = appKeyFromPathname(normalizedPathname);
  if (pathAppKey) return pathAppKey;

  const normalizedSegment = segment?.toLowerCase() ?? null;
  if (isAppKey(normalizedSegment)) {
    return normalizedSegment;
  }

  return null;
}

export function resolveHeaderPrimaryNav(
  pathname: string | null,
  segment: string | null,
  hostname?: string | null
) {
  const appKey = resolveHeaderAppKey(pathname, segment, hostname);
  if (!appKey) {
    return {
      label: "",
      path: "/",
    };
  }

  const app = APP_NAV[appKey];
  const normalizedPathname = pathname?.toLowerCase() ?? "";
  const hostPrefix = hostname ? resolveHostPrefix(hostname) : null;
  const isPathScoped =
    hostPrefix !== app.path && matchesAppPath(normalizedPathname, app.path);

  return {
    label: app.label,
    path: isPathScoped ? app.path : "/",
  };
}
