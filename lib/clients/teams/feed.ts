import { TeamsFeedSchema, type TeamsFeed } from "@/lib/schemas/teams-feed";
import {
  readBoundedTeamsJson,
  TeamsFeedRequestTimeoutError,
  withTeamsFeedRequest,
} from "./payload";
import { assertTeamsMainnetDeployment } from "./deployment";

const TEAMS_DATA_URL = process.env.NEXT_PUBLIC_TEAMS_DATA_URL;
const TEAMS_DATA_PROXY_URL = "/api/teams-data";

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

async function fetchAndValidate(url: string, label: string) {
  try {
    return await withTeamsFeedRequest(url, async (response, context) => {
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(
          `Teams feed fetch failed (${label}) with status ${response.status}.`
        );
      }

      const json = await readBoundedTeamsJson(response, context);
      const parsed = TeamsFeedSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(
          `Teams feed schema validation failed (${label}).`,
          { cause: parsed.error }
        );
      }

      assertTeamsMainnetDeployment(parsed.data);
      return parsed.data;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Teams feed ")
    ) {
      throw error;
    }
    if (
      error instanceof TeamsFeedRequestTimeoutError ||
      (error instanceof Error &&
        error.message ===
          "The Teams feed payload exceeds the supported size.")
    ) {
      throw new Error(
        `Teams feed fetch failed (${label}): ${error.message}`,
        { cause: error }
      );
    }
    throw new Error(`Teams feed fetch failed (${label}).`, {
      cause: error,
    });
  }
}

export async function fetchTeamsFeed(): Promise<TeamsFeed | null> {
  const url = isBrowserRuntime() ? TEAMS_DATA_PROXY_URL : TEAMS_DATA_URL;
  if (!url) return null;

  return fetchAndValidate(
    url,
    isBrowserRuntime() ? "same-origin proxy" : "direct"
  );
}
