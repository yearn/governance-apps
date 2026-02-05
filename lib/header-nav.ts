const APP_NAV = {
  styfi: { label: "stYFI", path: "/styfi" },
  veyfi: { label: "veYFI", path: "/veyfi" },
} as const;

type AppKey = keyof typeof APP_NAV;

function isAppKey(value: string | null): value is AppKey {
  return value === "styfi" || value === "veyfi";
}

function resolveAppKey(pathname: string | null, segment: string | null): AppKey | null {
  const normalizedSegment = segment?.toLowerCase() ?? null;
  if (isAppKey(normalizedSegment)) {
    return normalizedSegment;
  }

  const normalizedPathname = pathname?.toLowerCase() ?? "";
  if (normalizedPathname.startsWith(APP_NAV.veyfi.path)) {
    return "veyfi";
  }
  if (normalizedPathname.startsWith(APP_NAV.styfi.path)) {
    return "styfi";
  }

  return null;
}

export function resolveHeaderPrimaryNav(pathname: string | null, segment: string | null) {
  const appKey = resolveAppKey(pathname, segment);
  if (!appKey) {
    return APP_NAV.styfi;
  }

  const app = APP_NAV[appKey];
  const normalizedPathname = pathname?.toLowerCase() ?? "";
  const isPathScoped = normalizedPathname.startsWith(app.path);

  return {
    label: app.label,
    path: isPathScoped ? app.path : "/",
  };
}
