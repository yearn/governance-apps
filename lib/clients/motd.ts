import { MotdSchema, type Motd } from "@/lib/schemas/motd";

const MOTD_URL = process.env.NEXT_PUBLIC_MOTD_URL;
const MOTD_PROXY = "/api/motd";

async function fetchAndValidate(url: string, label: string) {
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`MOTD fetch failed (${label}):`, response.status);
    return null;
  }
  const json = await response.json();
  const parsed = MotdSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(`MOTD schema validation failed (${label})`, parsed.error);
    return null;
  }
  return parsed.data;
}

export async function fetchMotd(): Promise<Motd | null> {
  if (!MOTD_URL) return null;

  try {
    const preferProxy = typeof window !== "undefined";
    const primary = preferProxy ? MOTD_PROXY : MOTD_URL;
    const secondary = preferProxy ? MOTD_URL : MOTD_PROXY;

    const primaryData = await fetchAndValidate(
      primary,
      preferProxy ? "proxy" : "direct"
    );
    if (primaryData) return primaryData;

    return await fetchAndValidate(
      secondary,
      preferProxy ? "direct" : "proxy"
    );
  } catch (error) {
    console.warn("Failed to fetch MOTD", error);
    return null;
  }
}
