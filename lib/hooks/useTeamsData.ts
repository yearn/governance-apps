"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import { fetchTeamsFeed, TEAMS_SNAPSHOT_MAX_REORG_ROLLBACK_BLOCKS } from "@/lib/clients/teams";
import { getTeamsAuthorityFingerprint, teamsKeys } from "@/lib/hooks/teamsKeys";

let teamsFeedActivationId = 0;

type ActivatedTeamsFeed = {
  activationId: number;
  fingerprint: ReturnType<typeof getTeamsAuthorityFingerprint>;
  feed: TeamsFeed;
  observerFeed: TeamsFeed;
};

async function fetchActivatedTeamsFeed(previous?: ActivatedTeamsFeed): Promise<ActivatedTeamsFeed> {
  const feed = await fetchTeamsFeed();
  if (!feed) {
    throw new Error("The Teams feed endpoint is not configured.");
  }
  const fingerprint = getTeamsAuthorityFingerprint(feed);
  if (previous?.fingerprint === fingerprint) return previous;

  // A disconnected reader cannot independently verify a deep rollback.
  const prior = previous?.observerFeed;
  const observerFeed = prior && BigInt(prior.blockNumber) >
    BigInt(feed.blockNumber) + TEAMS_SNAPSHOT_MAX_REORG_ROLLBACK_BLOCKS
    ? prior : feed;
  teamsFeedActivationId += 1;
  return {
    activationId: teamsFeedActivationId,
    fingerprint,
    feed,
    observerFeed,
  };
}

export function useTeamsData(enabled = true) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: teamsKeys.feed(),
    queryFn: () => fetchActivatedTeamsFeed(queryClient.getQueryData<ActivatedTeamsFeed>(teamsKeys.feed())),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
  });
}
