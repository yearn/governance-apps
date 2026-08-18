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

export function resolveHeaderAppKey(
  pathname: string | null,
  segment: string | null,
  hostname: string | null | undefined
): HeaderAppKey | null {
  const normalizedSegment = segment?.toLowerCase() ?? null;
  if (isAppKey(normalizedSegment)) {
    return normalizedSegment;
  }

  const normalizedPathname = pathname?.toLowerCase() ?? "";
  if (normalizedPathname.startsWith(APP_NAV.dao.path)) {
    return "dao";
  }
  if (normalizedPathname.startsWith(APP_NAV.veyfi.path)) {
    return "veyfi";
  }
  if (normalizedPathname.startsWith(APP_NAV.teams.path)) {
    return "teams";
  }
  if (normalizedPathname.startsWith(APP_NAV.yeth.path)) {
    return "yeth";
  }
  if (normalizedPathname.startsWith(APP_NAV.ybc.path)) {
    return "ybc";
  }
  if (normalizedPathname.startsWith(APP_NAV.styfi.path)) {
    return "styfi";
  }

  const hostPrefix = hostname ? resolveHostPrefix(hostname) : null;
  if (hostPrefix === APP_NAV.styfi.path) return "styfi";
  if (hostPrefix === APP_NAV.veyfi.path) return "veyfi";
  if (hostPrefix === APP_NAV.teams.path) return "teams";
  if (hostPrefix === APP_NAV.yeth.path) return "yeth";
  if (hostPrefix === APP_NAV.ybc.path) return "ybc";

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
  const isPathScoped = normalizedPathname.startsWith(app.path);

  return {
    label: app.label,
    path: isPathScoped ? app.path : "/",
  };
}
