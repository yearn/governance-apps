import { GlobalDataSchema, type GlobalData } from "@/lib/schemas/global";

const GLOBAL_DATA_URL = process.env.NEXT_PUBLIC_GLOBAL_DATA_URL;

export async function fetchGlobalData(): Promise<GlobalData | null> {
  if (!GLOBAL_DATA_URL) return null;

  try {
    const response = await fetch(GLOBAL_DATA_URL, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = await response.json();
    const parsed = GlobalDataSchema.safeParse(json);
    if (!parsed.success) {
      console.warn("Global data schema validation failed", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.warn("Failed to fetch global data", error);
    return null;
  }
}
