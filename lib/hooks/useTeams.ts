"use client";

import { useQuery } from "@tanstack/react-query";
import { createMockTeamsClient } from "@/lib/clients/teams/mock";
import type { TeamsMockScenarioId } from "@/lib/clients/teams/types";

const teamsClient = createMockTeamsClient({ latencyMs: 250 });

export const teamsKeys = {
  all: ["teams"] as const,
  scenarioCatalog: () => [...teamsKeys.all, "scenario-catalog"] as const,
  scenario: (id: TeamsMockScenarioId) => [...teamsKeys.all, "scenario", id] as const,
};

export function useTeamsScenarioCatalog() {
  return useQuery({
    queryKey: teamsKeys.scenarioCatalog(),
    queryFn: () => teamsClient.listScenarioCatalog(),
    staleTime: Infinity,
  });
}

export function useTeamsScenario(id: TeamsMockScenarioId) {
  return useQuery({
    queryKey: teamsKeys.scenario(id),
    queryFn: () => teamsClient.getScenario(id),
    staleTime: Infinity,
  });
}
