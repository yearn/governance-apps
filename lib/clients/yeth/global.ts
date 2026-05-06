import {
  YethGlobalDataSchema,
  type YethGlobalData,
} from "@/lib/schemas/yeth-global";

const YETH_GLOBAL_DATA_URL = process.env.NEXT_PUBLIC_YETH_GLOBAL_DATA_URL;
let lastValidYethGlobalData: YethGlobalData | null = null;

async function fetchAndValidate(url: string, label: string) {
  try {
    const response = await fetch(url);
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

export async function fetchYethGlobalData(): Promise<YethGlobalData | null> {
  if (!YETH_GLOBAL_DATA_URL) return null;

  const directData = await fetchAndValidate(YETH_GLOBAL_DATA_URL, "direct");
  if (directData) {
    lastValidYethGlobalData = directData;
    return directData;
  }
  return lastValidYethGlobalData;
}
