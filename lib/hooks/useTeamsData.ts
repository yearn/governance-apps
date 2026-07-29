"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTeamsFeed } from "@/lib/clients/teams";
import { teamsKeys } from "@/lib/hooks/teamsKeys";

let teamsFeedActivationId = 0;

async function fetchActivatedTeamsFeed() {
  const feed = await fetchTeamsFeed();
  if (!feed) {
    throw new Error("The Teams feed endpoint is not configured.");
  }
  teamsFeedActivationId += 1;
  return {
    activationId: teamsFeedActivationId,
    feed,
  };
}

export function useTeamsData(enabled = true) {
  return useQuery({
    queryKey: teamsKeys.feed(),
    queryFn: fetchActivatedTeamsFeed,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
  });
}
