import type { TeamRecord } from "@/lib/clients/teams";

export const TEAMS_ROUTE_SECTIONS = [
  "directory",
  "overview",
  "actions",
  "revenue",
  "funding",
  "bonus",
  "lifecycle",
  "admin",
] as const;

export type TeamsRouteSection = (typeof TEAMS_ROUTE_SECTIONS)[number];

export type TeamsRouteState = {
  section: TeamsRouteSection;
  teamAddress: string | null;
};

const sectionSet = new Set<string>(TEAMS_ROUTE_SECTIONS);
const workspaceSections = new Set<TeamsRouteSection>([
  "overview",
  "actions",
  "revenue",
  "funding",
  "bonus",
  "lifecycle",
]);

export function parseTeamsRouteState(
  href: string,
  options: {
    canUseAdmin?: boolean;
    adminAuthorizationReady?: boolean;
  } = {}
): TeamsRouteState {
  const url = new URL(href, "https://teams.yearn.fi");
  const requestedSection = url.searchParams.get("section");
  let section: TeamsRouteSection = "directory";

  if (requestedSection && sectionSet.has(requestedSection)) {
    section = requestedSection as TeamsRouteSection;
  }

  if (
    section === "admin" &&
    options.adminAuthorizationReady !== false &&
    !options.canUseAdmin
  ) {
    section = "directory";
  }

  const requestedTeamAddress = url.searchParams.get("team");
  const teamAddress = normalizeTeamsRouteAddress(requestedTeamAddress);

  if (requestedTeamAddress !== null && teamAddress === null) {
    return {
      section: "directory",
      teamAddress: null,
    };
  }

  if (workspaceSections.has(section) && teamAddress === null) {
    return {
      section: "directory",
      teamAddress: null,
    };
  }

  return {
    section,
    teamAddress: workspaceSections.has(section) ? teamAddress : null,
  };
}

export function getCanonicalTeamsRouteHref(
  currentHref: string,
  state: TeamsRouteState
): string | null {
  const url = new URL(currentHref, "https://teams.yearn.fi");
  const requestedSection = url.searchParams.get("section");
  const requestedTeam = url.searchParams.get("team");
  const normalizedRequestedTeam = normalizeTeamsRouteAddress(requestedTeam);
  const hasHash = url.hash.length > 0;
  const hasCanonicalSection =
    requestedSection === state.section ||
    (requestedSection === null && state.section === "directory");
  const hasCanonicalTeam =
    requestedTeam === state.teamAddress &&
    normalizedRequestedTeam === state.teamAddress;

  if (!hasHash && hasCanonicalSection && hasCanonicalTeam) {
    return null;
  }

  return createTeamsRouteHref(currentHref, state);
}

export function isTeamsAdminRouteRequest(href: string) {
  const url = new URL(href, "https://teams.yearn.fi");
  return url.searchParams.get("section") === "admin";
}

export function createTeamsRouteHref(
  currentHref: string,
  state: TeamsRouteState
) {
  const url = new URL(currentHref, "https://teams.yearn.fi");
  if (state.section === "directory") {
    url.searchParams.delete("section");
  } else {
    url.searchParams.set("section", state.section);
  }
  if (state.teamAddress) {
    const teamAddress = normalizeTeamsRouteAddress(state.teamAddress);
    if (!teamAddress) {
      throw new Error("Cannot build a Teams route with an invalid team address.");
    }
    url.searchParams.set("team", teamAddress);
  } else {
    url.searchParams.delete("team");
  }
  url.hash = "";
  return `${url.pathname}${url.search}`;
}

export function getTeamsTopSection(section: TeamsRouteSection) {
  if (section === "directory") return "directory" as const;
  if (section === "admin") return "admin" as const;
  return "workspace" as const;
}

export function findTeamByRouteAddress(
  teams: readonly TeamRecord[],
  teamAddress: string | null
) {
  if (!teamAddress) return null;
  return (
    teams.find(
      (team) =>
        normalizeTeamsRouteAddress(team.address) === teamAddress
    ) ?? null
  );
}

export function normalizeTeamsRouteAddress(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(normalized) ? normalized : null;
}
