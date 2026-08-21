type HeaderLookup = {
  get(name: string): string | null | undefined;
};

export const GOVERNANCE_ROUTED_HOST_HEADER = "x-governance-routed-host";

function firstHost(value: string | null | undefined): string | null {
  const raw = (value || "").split(",").map((entry) => entry.trim()).find(Boolean);
  return raw || null;
}

export function resolveRequestHostname(
  headers: HeaderLookup,
  fallbackHostname: string
): string {
  return (
    firstHost(headers.get("x-forwarded-host")) ||
    firstHost(headers.get("host")) ||
    fallbackHostname
  );
}

export function resolveRoutedRequestHostname(
  headers: HeaderLookup,
  fallbackHostname: string
): string {
  return (
    firstHost(headers.get(GOVERNANCE_ROUTED_HOST_HEADER)) ||
    resolveRequestHostname(headers, fallbackHostname)
  );
}
