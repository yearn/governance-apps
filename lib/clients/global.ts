import { GlobalDataSchema, type GlobalData } from "@/lib/schemas/global";

const GLOBAL_DATA_URL = process.env.NEXT_PUBLIC_GLOBAL_DATA_URL;
const GLOBAL_DATA_PROXY_URL = "/api/global-data";

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

async function fetchAndValidate(url: string, label: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Global data fetch failed (${label}):`, response.status);
      return null;
    }
    const json = await response.json();
    const parsed = GlobalDataSchema.safeParse(json);
    if (!parsed.success) {
      console.warn(
        `Global data schema validation failed (${label})`,
        parsed.error
      );
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.warn(`Global data fetch failed (${label})`, error);
    return null;
  }
}

export async function fetchGlobalData(): Promise<GlobalData | null> {
  const url = isBrowserRuntime() ? GLOBAL_DATA_PROXY_URL : GLOBAL_DATA_URL;
  if (!url) return null;

  const data = await fetchAndValidate(
    url,
    isBrowserRuntime() ? "same-origin proxy" : "direct"
  );
  if (data) return data;

  throw new Error("No valid global data payload from configured source");
}
