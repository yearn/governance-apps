"use client";

import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import {
  applyDaoMockFixture,
  createRuntimeMockDaoClient,
  getDaoMockSnapshot,
  resetDaoMockStore,
  setDaoMockAccountState,
  setDaoMockAnalysisState,
  setDaoMockAuthoringState,
  setDaoMockContentState,
  setDaoMockEmpty,
  setDaoMockExecutionState,
  setDaoMockLifecycle,
  setDaoMockLoading,
  setDaoMockPersona,
  setDaoMockProposerState,
  setDaoMockRole,
  setDaoMockSelectedProposal,
  setDaoMockSurface,
  setDaoMockVetoState,
  subscribeDaoMockStore,
  type DaoClient,
  type DaoFeedV1,
  type DaoMockAccountState,
  type DaoMockAnalysisState,
  type DaoMockAuthoringState,
  type DaoMockContentState,
  type DaoMockExecutionState,
  type DaoMockFixtureId,
  type DaoMockLifecycleState,
  type DaoMockPersona,
  type DaoMockProposerState,
  type DaoMockRole,
  type DaoMockRuntimeSnapshot,
  type DaoMockSurfaceState,
  type DaoMockVetoState,
  type DaoProposalLookup,
  type DaoProposalRef,
} from "@/lib/clients/dao";
import { daoKeys } from "@/lib/hooks/daoKeys";
import { isProductionRuntime } from "@/lib/runtime/features";

let mockClient: DaoClient | null = null;

function getDaoRouteClient(): DaoClient {
  if (isProductionRuntime()) {
    throw new Error("DAO mock reads are unavailable in production runtime.");
  }

  mockClient ??= createRuntimeMockDaoClient({ latencyMs: 250 });
  return mockClient;
}

const subscribeNoop = () => () => undefined;
const getNullSnapshot = () => null;

export function useDaoMockRuntime(): DaoMockRuntimeSnapshot | null {
  const mockRuntimeEnabled = !isProductionRuntime();
  return useSyncExternalStore(
    mockRuntimeEnabled ? subscribeDaoMockStore : subscribeNoop,
    mockRuntimeEnabled ? getDaoMockSnapshot : getNullSnapshot,
    getNullSnapshot
  );
}

export function parseDaoProposalId(value: string): bigint | null {
  if (!/^(0|[1-9]\d*)$/.test(value)) return null;
  return BigInt(value);
}

export function resolveActiveDaoProposalRef(
  feed: DaoFeedV1 | undefined,
  proposalId: bigint | null
): DaoProposalRef | null {
  if (!feed || proposalId === null) return null;

  const activeContract = feed.contracts.find((contract) => contract.active);
  if (!activeContract) return null;

  return {
    chainId: feed.chainId,
    votingAddress: activeContract.votingAddress,
    proposalId,
  };
}

export function useDaoFeed(enabled = true) {
  const runtime = useDaoMockRuntime();
  const query = useQuery({
    queryKey: daoKeys.feed(),
    queryFn: () => getDaoRouteClient().getFeed(),
    enabled,
    staleTime: Infinity,
  });
  return applyDaoSurfaceState(query, runtime);
}

export function useDaoProposal(proposalId: string) {
  const parsedProposalId = parseDaoProposalId(proposalId);
  const invalidProposalId = parsedProposalId === null;
  const feedQuery = useDaoFeed(!invalidProposalId);
  const proposalRef = resolveActiveDaoProposalRef(
    feedQuery.data,
    parsedProposalId
  );
  const query = useQuery<DaoProposalLookup>({
    queryKey: daoKeys.proposal(proposalRef),
    queryFn: () => {
      if (!proposalRef) {
        throw new Error("DAO proposal identity is unavailable.");
      }
      return getDaoRouteClient().getProposal(proposalRef);
    },
    enabled: proposalRef !== null,
    staleTime: Infinity,
  });

  const activeContractMissing =
    parsedProposalId !== null && feedQuery.data !== undefined && !proposalRef;
  const activeContractError = activeContractMissing
    ? new Error("DAO proposal data has no active Voting contract.")
    : null;

  return {
    ...query,
    data:
      invalidProposalId
        ? ({ state: "not_found" } as const)
        : query.data,
    error: invalidProposalId
      ? null
      : feedQuery.error ?? activeContractError ?? query.error,
    isError:
      !invalidProposalId &&
      (feedQuery.isError || activeContractMissing || query.isError),
    isPending:
      invalidProposalId
        ? false
        : feedQuery.isPending || (proposalRef !== null && query.isPending),
    refetch: () =>
      feedQuery.isError || activeContractMissing
        ? feedQuery.refetch()
        : query.refetch(),
  };
}

export function useDaoProposerState(address: Address | null) {
  const runtime = useDaoMockRuntime();
  const query = useQuery({
    queryKey: daoKeys.proposer(address),
    queryFn: () => getDaoRouteClient().getProposerState(address as Address),
    enabled: address !== null,
    staleTime: Infinity,
  });
  return applyDaoSurfaceState(query, runtime);
}

function applyDaoSurfaceState<
  TResult extends {
    data: unknown;
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
    isPending: boolean;
  },
>(query: TResult, runtime: DaoMockRuntimeSnapshot | null): TResult {
  if (runtime?.surface === "loading") {
    return {
      ...query,
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isPending: true,
    } as TResult;
  }
  if (runtime?.surface === "error") {
    return {
      ...query,
      data: undefined,
      error: new Error("DAO mock data is unavailable."),
      isError: true,
      isLoading: false,
      isPending: false,
    } as TResult;
  }
  return query;
}

async function invalidateDaoQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await queryClient.invalidateQueries({
    queryKey: daoKeys.all,
    refetchType: "all",
  });
}

export function useDaoDebugActions() {
  const queryClient = useQueryClient();
  const mutate = async (mutation: () => unknown) => {
    mutation();
    await invalidateDaoQueries(queryClient);
  };

  return {
    applyFixture: (fixtureId: DaoMockFixtureId) =>
      mutate(() => applyDaoMockFixture(fixtureId)),
    reset: async () => {
      resetDaoMockStore();
      await queryClient.resetQueries({ queryKey: daoKeys.all });
      await invalidateDaoQueries(queryClient);
    },
    setAccountState: (accountState: DaoMockAccountState) =>
      mutate(() => setDaoMockAccountState(accountState)),
    setAnalysisState: (analysisState: DaoMockAnalysisState) =>
      mutate(() => setDaoMockAnalysisState(analysisState)),
    setAuthoringState: (authoringState: DaoMockAuthoringState) =>
      mutate(() => setDaoMockAuthoringState(authoringState)),
    setContentState: (contentState: DaoMockContentState) =>
      mutate(() => setDaoMockContentState(contentState)),
    setEmpty: (value: boolean) => mutate(() => setDaoMockEmpty(value)),
    setExecutionState: (executionState: DaoMockExecutionState) =>
      mutate(() => setDaoMockExecutionState(executionState)),
    setLifecycle: (lifecycle: DaoMockLifecycleState) =>
      mutate(() => setDaoMockLifecycle(lifecycle)),
    setLoading: (value: boolean) => mutate(() => setDaoMockLoading(value)),
    setPersona: (persona: DaoMockPersona) =>
      mutate(() => setDaoMockPersona(persona)),
    setProposerState: (proposerState: DaoMockProposerState) =>
      mutate(() => setDaoMockProposerState(proposerState)),
    setRole: (role: DaoMockRole, enabled: boolean) =>
      mutate(() => setDaoMockRole(role, enabled)),
    setSelectedProposal: (proposalId: string) =>
      mutate(() => setDaoMockSelectedProposal(proposalId)),
    setSurface: (surface: DaoMockSurfaceState) =>
      mutate(() => setDaoMockSurface(surface)),
    setVetoState: (vetoState: DaoMockVetoState) =>
      mutate(() => setDaoMockVetoState(vetoState)),
  };
}

export { daoKeys } from "@/lib/hooks/daoKeys";
