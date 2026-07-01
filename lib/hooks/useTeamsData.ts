"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTeamsFeed } from "@/lib/clients/teams";

export function useTeamsData(enabled = true) {
  return useQuery({
    queryKey: ["teams-feed"],
    queryFn: fetchTeamsFeed,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
  });
}
