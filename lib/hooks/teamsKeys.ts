export const teamsKeys = {
  all: ["teams"] as const,
  feed: () => [...teamsKeys.all, "feed"] as const,
  pageState: () => [...teamsKeys.all, "page-state"] as const,
  scenarioCatalog: () => [...teamsKeys.all, "scenario-catalog"] as const,
  scenario: (id: string) => [...teamsKeys.all, "scenario", id] as const,
};
