type HeaderLookup = {
  get(name: string): string | null | undefined;
};

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
