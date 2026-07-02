"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTeamsFeed } from "@/lib/clients/teams";
import { teamsKeys } from "@/lib/hooks/teamsKeys";

export function useTeamsData(enabled = true) {
  return useQuery({
    queryKey: teamsKeys.feed(),
    queryFn: fetchTeamsFeed,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
  });
}
