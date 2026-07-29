import {
  readBoundedTeamsJson,
  withTeamsFeedRequest,
  TeamsFeedRequestTimeoutError,
} from "@/lib/clients/teams/payload";

const TEAMS_DATA_URL_ENV = "NEXT_PUBLIC_TEAMS_DATA_URL";
const TEAMS_PROXY_CACHE_CONTROL = "no-store";

export const dynamic = "force-dynamic";

function jsonError(
  message: string,
  status: number,
  upstreamStatus?: number
) {
  return Response.json(
    { error: message, upstreamStatus },
    {
      status,
      headers: { "Cache-Control": TEAMS_PROXY_CACHE_CONTROL },
    }
  );
}

export async function GET() {
  const upstreamUrl = process.env[TEAMS_DATA_URL_ENV];
  if (!upstreamUrl) {
    return jsonError(`${TEAMS_DATA_URL_ENV} is not configured`, 500);
  }

  try {
    return await withTeamsFeedRequest(
      upstreamUrl,
      async (upstream, context) => {
        if (!upstream.ok) {
          await upstream.body?.cancel().catch(() => undefined);
          return jsonError(
            "Teams feed upstream request failed",
            upstream.status,
            upstream.status
          );
        }

        const json = await readBoundedTeamsJson(upstream, context);
        return Response.json(json, {
          headers: {
            "Cache-Control": TEAMS_PROXY_CACHE_CONTROL,
          },
        });
      }
    );
  } catch (error) {
    if (error instanceof TeamsFeedRequestTimeoutError) {
      return jsonError("Teams feed upstream request timed out", 504);
    }
    return jsonError("Teams feed upstream request failed", 500);
  }
}
