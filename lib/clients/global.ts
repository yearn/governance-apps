import { GlobalDataSchema, type GlobalData } from "@/lib/schemas/global";

const GLOBAL_DATA_URL = process.env.NEXT_PUBLIC_GLOBAL_DATA_URL;
const GLOBAL_DATA_PROXY = "/api/global-data";

async function fetchAndValidate(url: string, label: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
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

function canAttemptDirectBrowserFetch(url: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

export async function fetchGlobalData(): Promise<GlobalData | null> {
  if (!GLOBAL_DATA_URL) return null;

  if (typeof window !== "undefined") {
    const proxyData = await fetchAndValidate(GLOBAL_DATA_PROXY, "proxy");
    if (proxyData) return proxyData;

    if (canAttemptDirectBrowserFetch(GLOBAL_DATA_URL)) {
      const directData = await fetchAndValidate(GLOBAL_DATA_URL, "direct");
      if (directData) return directData;
    }

    throw new Error("No valid global data payload from proxy source");
  }

  const [directData, proxyData] = await Promise.all([
    fetchAndValidate(GLOBAL_DATA_URL, "direct"),
    fetchAndValidate(GLOBAL_DATA_PROXY, "proxy"),
  ]);

  if (directData && proxyData) {
    return proxyData.meta.timestamp > directData.meta.timestamp
      ? proxyData
      : directData;
  }

  const best = directData ?? proxyData;
  if (best) return best;

  throw new Error("No valid global data payload from direct or proxy source");
}
