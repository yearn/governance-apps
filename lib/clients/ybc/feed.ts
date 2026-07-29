import { YbcFeedSchema, type YbcFeed } from "@/lib/schemas/ybc-feed";
import { assertYbcMainnetDeployment } from "./deployment";
import {
  readBoundedYbcJson,
  withYbcFeedRequest,
  YbcFeedRequestTimeoutError,
} from "./payload";

const YBC_DATA_URL = process.env.NEXT_PUBLIC_YBC_DATA_URL;
const YBC_DATA_PROXY_URL = "/api/ybc-data";

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

async function fetchAndValidate(
  url: string,
  label: string
): Promise<YbcFeed> {
  try {
    return await withYbcFeedRequest(url, async (response, context) => {
      if (!response.ok) {
        throw new Error(
          `YBC feed fetch failed (${label}) with status ${response.status}.`
        );
      }

      let json: unknown;
      try {
        json = await readBoundedYbcJson(response, context);
      } catch (error) {
        if (error instanceof YbcFeedRequestTimeoutError) {
          throw error;
        }
        if (
          error instanceof Error &&
          error.message.includes("payload exceeds")
        ) {
          throw new Error(
            `YBC feed payload exceeds the supported size (${label}).`,
            {
              cause: error,
            }
          );
        }
        throw new Error(`YBC feed JSON parsing failed (${label}).`, {
          cause: error,
        });
      }

      const parsed = YbcFeedSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(`YBC feed schema validation failed (${label}).`, {
          cause: parsed.error,
        });
      }

      assertYbcMainnetDeployment(parsed.data);
      return parsed.data;
    });
  } catch (error) {
    if (error instanceof YbcFeedRequestTimeoutError) {
      throw new Error(`YBC feed request timed out (${label}).`, {
        cause: error,
      });
    }
    if (
      error instanceof Error &&
      error.message.startsWith("YBC feed ")
    ) {
      throw error;
    }
    throw new Error(`YBC feed fetch failed (${label}).`, { cause: error });
  }
}

export async function fetchYbcFeed(): Promise<YbcFeed | null> {
  const url = isBrowserRuntime() ? YBC_DATA_PROXY_URL : YBC_DATA_URL;
  if (!url) {
    return null;
  }

  return fetchAndValidate(
    url,
    isBrowserRuntime() ? "same-origin proxy" : "direct"
  );
}
