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
