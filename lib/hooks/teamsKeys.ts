import { keccak256, toBytes, type Hash } from "viem";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";

export const teamsKeys = {
  all: ["teams"] as const,
  feed: () => [...teamsKeys.all, "feed"] as const,
  canonicalSnapshot: (
    authorityFingerprint?: Hash | null,
    activationId?: number | null,
    transitionAuthority = "current"
  ) => {
    const prefix = [...teamsKeys.all, "canonical-snapshot"] as const;
    return authorityFingerprint && activationId
      ? ([
          ...prefix,
          authorityFingerprint,
          activationId,
          transitionAuthority,
        ] as const)
      : prefix;
  },
  pageState: () => [...teamsKeys.all, "page-state"] as const,
  scenarioCatalog: () => [...teamsKeys.all, "scenario-catalog"] as const,
  scenario: (id: string) => [...teamsKeys.all, "scenario", id] as const,
};

export function getTeamsAuthorityFingerprint(feed: TeamsFeed): Hash {
  return keccak256(toBytes(stableSerialize(feed)));
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableSerialize(record[key])}`
    )
    .join(",")}}`;
}
