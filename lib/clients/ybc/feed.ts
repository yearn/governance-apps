import { YbcFeedSchema, type YbcFeed } from "@/lib/schemas/ybc-feed";

const YBC_DATA_URL = process.env.NEXT_PUBLIC_YBC_DATA_URL;
const YBC_DATA_PROXY_URL = "/api/ybc-data";
let lastValidYbcFeed: YbcFeed | null = null;

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

async function fetchAndValidate(url: string, label: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`YBC feed fetch failed (${label}):`, response.status);
      return null;
    }

    const json = await response.json();
    const parsed = YbcFeedSchema.safeParse(json);
    if (!parsed.success) {
      console.warn(`YBC feed schema validation failed (${label})`, parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn(`YBC feed fetch failed (${label})`, error);
    return null;
  }
}

export async function fetchYbcFeed(): Promise<YbcFeed | null> {
  const url = isBrowserRuntime() ? YBC_DATA_PROXY_URL : YBC_DATA_URL;
  if (!url) return null;

  const data = await fetchAndValidate(
    url,
    isBrowserRuntime() ? "same-origin proxy" : "direct"
  );
  if (data) {
    lastValidYbcFeed = data;
    return data;
  }

  return lastValidYbcFeed;
}
