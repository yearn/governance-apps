import { TeamsFeedSchema, type TeamsFeed } from "@/lib/schemas/teams-feed";

const TEAMS_DATA_URL = process.env.NEXT_PUBLIC_TEAMS_DATA_URL;
const TEAMS_DATA_PROXY_URL = "/api/teams-data";
let lastValidTeamsFeed: TeamsFeed | null = null;

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

async function fetchAndValidate(url: string, label: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Teams feed fetch failed (${label}):`, response.status);
      return null;
    }

    const json = await response.json();
    const parsed = TeamsFeedSchema.safeParse(json);
    if (!parsed.success) {
      console.warn(`Teams feed schema validation failed (${label})`, parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn(`Teams feed fetch failed (${label})`, error);
    return null;
  }
}

export async function fetchTeamsFeed(): Promise<TeamsFeed | null> {
  const url = isBrowserRuntime() ? TEAMS_DATA_PROXY_URL : TEAMS_DATA_URL;
  if (!url) return null;

  const data = await fetchAndValidate(
    url,
    isBrowserRuntime() ? "same-origin proxy" : "direct"
  );
  if (data) {
    lastValidTeamsFeed = data;
    return data;
  }

  return lastValidTeamsFeed;
}
