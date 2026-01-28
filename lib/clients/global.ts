import { GlobalDataSchema, type GlobalData } from "@/lib/schemas/global";

const GLOBAL_DATA_URL = process.env.NEXT_PUBLIC_GLOBAL_DATA_URL;
const GLOBAL_DATA_PROXY = "/api/global-data";

async function fetchAndValidate(url: string, label: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    console.warn(`Global data fetch failed (${label}):`, response.status);
    return null;
  }
  const json = await response.json();
  const parsed = GlobalDataSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(`Global data schema validation failed (${label})`, parsed.error);
    return null;
  }
  return parsed.data;
}

export async function fetchGlobalData(): Promise<GlobalData | null> {
  if (!GLOBAL_DATA_URL) return null;

  try {
    const preferProxy = typeof window !== "undefined";
    const primary = preferProxy ? GLOBAL_DATA_PROXY : GLOBAL_DATA_URL;
    const secondary = preferProxy ? GLOBAL_DATA_URL : GLOBAL_DATA_PROXY;

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
    console.warn("Failed to fetch global data", error);
    return null;
  }
}
