import {
  readBoundedYbcJson,
  withYbcFeedRequest,
  YbcFeedRequestTimeoutError,
} from "@/lib/clients/ybc/payload";

const YBC_DATA_URL_ENV = "NEXT_PUBLIC_YBC_DATA_URL";
const FALLBACK_CACHE_CONTROL = "no-store";

export const dynamic = "force-dynamic";

function jsonError(
  message: string,
  status: number,
  upstreamStatus?: number,
  cacheControl = FALLBACK_CACHE_CONTROL
) {
  return Response.json(
    { error: message, upstreamStatus },
    {
      status,
      headers: { "Cache-Control": cacheControl },
    }
  );
}

export async function GET() {
  const upstreamUrl = process.env[YBC_DATA_URL_ENV];
  if (!upstreamUrl) {
    return jsonError(`${YBC_DATA_URL_ENV} is not configured`, 500);
  }

  try {
    return await withYbcFeedRequest(
      upstreamUrl,
      async (upstream, context) => {
        const cacheControl = upstream.headers.get("cache-control");

        if (!upstream.ok) {
          return jsonError(
            "YBC feed upstream request failed",
            upstream.status,
            upstream.status,
            cacheControl ?? FALLBACK_CACHE_CONTROL
          );
        }

        const json = await readBoundedYbcJson(upstream, context);
        return Response.json(json, {
          headers: {
            "Cache-Control": cacheControl ?? FALLBACK_CACHE_CONTROL,
          },
        });
      }
    );
  } catch (error) {
    if (error instanceof YbcFeedRequestTimeoutError) {
      return jsonError("YBC feed upstream request timed out", 504);
    }
    return jsonError("YBC feed upstream request failed", 500);
  }
}
