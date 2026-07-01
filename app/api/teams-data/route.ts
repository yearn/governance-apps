const TEAMS_DATA_URL_ENV = "NEXT_PUBLIC_TEAMS_DATA_URL";
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
  const upstreamUrl = process.env[TEAMS_DATA_URL_ENV];
  if (!upstreamUrl) {
    return jsonError(`${TEAMS_DATA_URL_ENV} is not configured`, 500);
  }

  try {
    const upstream = await fetch(upstreamUrl);
    const cacheControl = upstream.headers.get("cache-control");

    if (!upstream.ok) {
      return jsonError(
        "Teams feed upstream request failed",
        upstream.status,
        upstream.status,
        cacheControl ?? FALLBACK_CACHE_CONTROL
      );
    }

    const json = await upstream.json();
    return Response.json(json, {
      headers: {
        "Cache-Control": cacheControl ?? FALLBACK_CACHE_CONTROL,
      },
    });
  } catch {
    return jsonError("Teams feed upstream request failed", 500);
  }
}
