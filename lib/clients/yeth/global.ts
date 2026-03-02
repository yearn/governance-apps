import {
  YethGlobalDataSchema,
  type YethGlobalData,
} from "@/lib/schemas/yeth-global";

const YETH_GLOBAL_DATA_URL = process.env.NEXT_PUBLIC_YETH_GLOBAL_DATA_URL;
const YETH_GLOBAL_DATA_PROXY = "/api/yeth-global-data";
let lastValidYethGlobalData: YethGlobalData | null = null;

async function fetchAndValidate(url: string, label: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`yETH global data fetch failed (${label}):`, response.status);
      return null;
    }

    const json = await response.json();
    const parsed = YethGlobalDataSchema.safeParse(json);
    if (!parsed.success) {
      console.warn(
        `yETH global data schema validation failed (${label})`,
        parsed.error
      );
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn(`yETH global data fetch failed (${label})`, error);
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

export async function fetchYethGlobalData(): Promise<YethGlobalData | null> {
  if (!YETH_GLOBAL_DATA_URL) return null;

  if (typeof window !== "undefined") {
    const proxyData = await fetchAndValidate(YETH_GLOBAL_DATA_PROXY, "proxy");
    if (proxyData) {
      lastValidYethGlobalData = proxyData;
      return proxyData;
    }

    if (canAttemptDirectBrowserFetch(YETH_GLOBAL_DATA_URL)) {
      const directData = await fetchAndValidate(YETH_GLOBAL_DATA_URL, "direct");
      if (directData) {
        lastValidYethGlobalData = directData;
        return directData;
      }
    }

    return lastValidYethGlobalData;
  }

  const directData = await fetchAndValidate(YETH_GLOBAL_DATA_URL, "direct");
  if (directData) {
    lastValidYethGlobalData = directData;
    return directData;
  }
  return lastValidYethGlobalData;
}
