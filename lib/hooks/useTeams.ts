"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { mapTeamsFeedToRuntimeState } from "@/lib/clients/teams";
import { createMockTeamsClient } from "@/lib/clients/teams/mock";
import {
  patchMockTeamsAdmin,
  patchMockTeamsBonus,
  patchMockTeamsFundingApproval,
  patchMockTeamsTeam,
  replaceMockTeamsTeam,
  resetMockTeamsStore,
  setMockTeamsAdminVisible,
  setMockTeamsCurrentPeriod,
  setMockTeamsEmpty,
  setMockTeamsLoading,
  setMockTeamsPreset,
  setMockTeamsSelectedTeam,
  setMockTeamsSelectedTeamBonusState,
  setMockTeamsSelectedTeamFundingState,
  setMockTeamsSelectedTeamLifecycle,
  setMockTeamsSelectedTeamReadOnlyReason,
  setMockTeamsSelectedTeamRevenueState,
  setMockTeamsViewerRole,
  type TeamsBonusDebugState,
  type TeamsFundingDebugState,
  type TeamsRevenueDebugState,
} from "@/lib/clients/teams/mock";
import type {
  TeamId,
  TeamLifecycleStatus,
  TeamReadOnlyReason,
  TeamRecord,
  TeamsMockScenarioId,
  TeamsViewerRole,
} from "@/lib/clients/teams/types";
import { useTeamsData } from "@/lib/hooks/useTeamsData";
import { useOptionalProtocol } from "@/state/protocol";

const teamsClient = createMockTeamsClient({ latencyMs: 250 });

export const teamsKeys = {
  all: ["teams"] as const,
  pageState: () => [...teamsKeys.all, "page-state"] as const,
  scenarioCatalog: () => [...teamsKeys.all, "scenario-catalog"] as const,
  scenario: (id: TeamsMockScenarioId) => [...teamsKeys.all, "scenario", id] as const,
};

type TeamsRuntimeState = Awaited<ReturnType<typeof teamsClient.getPageState>> & {
  backend: "mock" | "feed";
};

async function invalidateTeamsQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await queryClient.invalidateQueries({
    queryKey: teamsKeys.all,
    refetchType: "all",
  });
}

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

export function useTeamsState() {
  const { address } = useAccount();
  const protocol = useOptionalProtocol();
  const usesMockBackend = protocol?.teamsUsesMockBackend ?? true;
  const teamsFeed = useTeamsData(!usesMockBackend);
  const mockQuery = useQuery({
    queryKey: teamsKeys.pageState(),
    queryFn: async (): Promise<TeamsRuntimeState> => ({
      ...(await teamsClient.getPageState()),
      backend: "mock",
    }),
    staleTime: Infinity,
    enabled: usesMockBackend,
  });
  const feedRuntime = useMemo<TeamsRuntimeState | null>(() => {
    if (usesMockBackend || !teamsFeed.data) return null;
    return {
      ...mapTeamsFeedToRuntimeState(teamsFeed.data, address ?? null),
      backend: "feed",
    };
  }, [address, teamsFeed.data, usesMockBackend]);

  if (usesMockBackend) return mockQuery;

  const feedError =
    teamsFeed.error instanceof Error
      ? teamsFeed.error
      : teamsFeed.isError
        ? new Error("Unknown Teams feed error")
        : !teamsFeed.isLoading && !feedRuntime
          ? new Error("No valid Teams feed payload is available.")
          : null;

  return {
    ...teamsFeed,
    data: feedRuntime,
    error: feedError,
    isError: feedError !== null,
    isPending: teamsFeed.isLoading || (!feedRuntime && !feedError),
    isLoading: teamsFeed.isLoading || (!feedRuntime && !feedError),
  };
}

export function useTeamsDebugActions() {
  const queryClient = useQueryClient();

  return {
    async applyPreset(id: TeamsMockScenarioId) {
      setMockTeamsPreset(id);
      await invalidateTeamsQueries(queryClient);
    },
    async patchAdmin(patch: Record<string, unknown>) {
      patchMockTeamsAdmin(patch);
      await invalidateTeamsQueries(queryClient);
    },
    async patchBonus(patch: Record<string, unknown>) {
      patchMockTeamsBonus(patch);
      await invalidateTeamsQueries(queryClient);
    },
    async patchFundingApproval(approvalId: string, patch: Record<string, unknown>) {
      patchMockTeamsFundingApproval(approvalId, patch);
      await invalidateTeamsQueries(queryClient);
    },
    async patchTeam(teamId: TeamId, patch: Record<string, unknown>) {
      patchMockTeamsTeam(teamId, patch);
      await invalidateTeamsQueries(queryClient);
    },
    async replaceTeam(team: TeamRecord) {
      replaceMockTeamsTeam(team);
      await invalidateTeamsQueries(queryClient);
    },
    async reset() {
      resetMockTeamsStore();
      await invalidateTeamsQueries(queryClient);
    },
    async setAdminVisible(enabled: boolean) {
      setMockTeamsAdminVisible(enabled);
      await invalidateTeamsQueries(queryClient);
    },
    async setBonusState(mode: TeamsBonusDebugState) {
      setMockTeamsSelectedTeamBonusState(mode);
      await invalidateTeamsQueries(queryClient);
    },
    async setCurrentPeriod(period: number | null) {
      setMockTeamsCurrentPeriod(period);
      await invalidateTeamsQueries(queryClient);
    },
    async setEmpty(value: boolean) {
      setMockTeamsEmpty(value);
      await invalidateTeamsQueries(queryClient);
    },
    async setFundingState(mode: TeamsFundingDebugState) {
      setMockTeamsSelectedTeamFundingState(mode);
      await invalidateTeamsQueries(queryClient);
    },
    async setLifecycle(status: TeamLifecycleStatus) {
      setMockTeamsSelectedTeamLifecycle(status);
      await invalidateTeamsQueries(queryClient);
    },
    async setLoading(value: boolean) {
      setMockTeamsLoading(value);
      await invalidateTeamsQueries(queryClient);
    },
    async setReadOnlyReason(reason: TeamReadOnlyReason | null) {
      setMockTeamsSelectedTeamReadOnlyReason(reason);
      await invalidateTeamsQueries(queryClient);
    },
    async setRevenueState(mode: TeamsRevenueDebugState) {
      setMockTeamsSelectedTeamRevenueState(mode);
      await invalidateTeamsQueries(queryClient);
    },
    async setSelectedTeam(teamId: TeamId | null) {
      setMockTeamsSelectedTeam(teamId);
      await invalidateTeamsQueries(queryClient);
    },
    async setViewerRole(role: TeamsViewerRole) {
      setMockTeamsViewerRole(role);
      await invalidateTeamsQueries(queryClient);
    },
  };
}
