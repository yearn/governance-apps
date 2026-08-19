"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import {
  applyDaoMockFixture,
  createRuntimeMockDaoClient,
  getDaoMockSnapshot,
  resetDaoMockStore,
  clearDaoMockPendingAction,
  indexDaoMockPendingAction,
  resolveDaoProposalReadEnvelope,
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
  setDaoMockTransactionOutcome,
  setDaoMockVetoState,
  subscribeDaoMockStore,
  type DaoClient,
  type DaoActionType,
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
  type DaoMockTransactionOutcome,
  type DaoMockVetoState,
  type DaoProposalLookup,
  type DaoProposalRef,
  type DaoVoteDirection,
} from "@/lib/clients/dao";
import { daoKeys } from "@/lib/hooks/daoKeys";
import { isDaoMockRuntimeEnabled } from "@/lib/runtime/features";
import { useTx } from "@/lib/tx/useTx";
import type { PreparedTransaction } from "@/lib/tx/types";

let mockClient: DaoClient | null = null;

export function getDaoRouteClient(): DaoClient {
  if (!isDaoMockRuntimeEnabled()) {
    throw new Error(
      "DAO mock reads are unavailable when the DAO route is disabled."
    );
  }

  mockClient ??= createRuntimeMockDaoClient({ latencyMs: 250 });
  return mockClient;
}

const subscribeNoop = () => () => undefined;
const getNullSnapshot = () => null;

export function useDaoMockRuntime(enabled = true): DaoMockRuntimeSnapshot | null {
  const mockRuntimeEnabled = enabled && isDaoMockRuntimeEnabled();
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
  const queryClient = useQueryClient();
  const surfaceBlocksRead =
    runtime?.surface === "error" || runtime?.surface === "loading";
  const canReadFeed = enabled && !surfaceBlocksRead;
  const query = useQuery({
    queryKey: daoKeys.feed(),
    queryFn: () => {
      if (surfaceBlocksRead) {
        throw new Error(
          "DAO feed reads are paused while the surface is unavailable."
        );
      }
      return getDaoRouteClient().getFeed();
    },
    enabled: canReadFeed,
    staleTime: Infinity,
  });
  useEffect(() => {
    if (!surfaceBlocksRead) return;
    void queryClient.cancelQueries({
      queryKey: daoKeys.feed(),
      exact: true,
    });
  }, [queryClient, surfaceBlocksRead]);
  return applyDaoSurfaceState(query, runtime, query.data);
}

export function useDaoProposal(proposalId: string) {
  const parsedProposalId = parseDaoProposalId(proposalId);
  const invalidProposalId = parsedProposalId === null;
  const feedQuery = useDaoFeed(!invalidProposalId);
  const proposalRef = resolveActiveDaoProposalRef(
    feedQuery.data,
    parsedProposalId
  );
  const activeContractMissing =
    parsedProposalId !== null && feedQuery.data !== undefined && !proposalRef;
  const activeContractError = activeContractMissing
    ? new Error("DAO proposal data has no active Voting contract.")
    : null;
  const envelope =
    proposalRef && feedQuery.data
      ? resolveDaoProposalReadEnvelope(feedQuery.data, proposalRef)
      : null;
  const lookup: DaoProposalLookup | { state: "not_found" } | undefined =
    invalidProposalId
      ? { state: "not_found" }
      : envelope
        ? { state: "found", proposal: envelope.proposal }
        : proposalRef && feedQuery.data
          ? {
              state: "not_found",
              ref: proposalRef,
              protocolStatus: "invalid",
              displayStatus: "not_found",
            }
          : undefined;

  return {
    ...feedQuery,
    data: lookup,
    envelope,
    error: invalidProposalId
      ? null
      : feedQuery.error ?? activeContractError,
    isError:
      !invalidProposalId &&
      (feedQuery.isError || activeContractMissing),
    isPending:
      invalidProposalId ? false : feedQuery.isPending,
    refetch: () => feedQuery.refetch(),
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

export function useDaoAccountProposalState(
  ref: DaoProposalRef | null,
  address: Address | null
) {
  const runtime = useDaoMockRuntime();
  const query = useQuery({
    queryKey: daoKeys.account(ref, address),
    queryFn: () =>
      getDaoRouteClient().getAccountProposalState(
        ref as DaoProposalRef,
        address as Address
      ),
    enabled: ref !== null && address !== null,
    staleTime: Infinity,
  });
  return applyDaoSurfaceState(query, runtime);
}

type DaoProposalActionOptions = {
  submittedMessage: string;
};

export function useDaoProposalActions(
  ref: DaoProposalRef,
  address: Address | null,
  options: DaoProposalActionOptions
) {
  const queryClient = useQueryClient();
  const { execute, reset, state } = useTx();
  const [activeAction, setActiveAction] = useState<DaoActionType | null>(null);
  const invalidate = useCallback(
    () => invalidateDaoQueries(queryClient),
    [queryClient]
  );

  const requireAddress = useCallback(() => {
    if (!address) throw new Error("Connect a wallet to continue.");
    return address;
  }, [address]);

  const submit = useCallback(
    async (
      action: DaoActionType,
      prepare: (client: DaoClient, account: Address) => Promise<PreparedTransaction>
    ) => {
      setActiveAction(action);
      reset();
      await execute(
        async () => {
          const prepared = await prepare(getDaoRouteClient(), requireAddress());
          return prepared();
        },
        {
          invalidate,
          skipWaitForReceipt: true,
          submittedMessage: options.submittedMessage,
        }
      );
    },
    [execute, invalidate, options.submittedMessage, requireAddress, reset]
  );

  return {
    activeAction,
    state,
    reset: () => {
      setActiveAction(null);
      reset();
    },
    vote: (direction: DaoVoteDirection) =>
      submit("vote", (client, account) =>
        client.prepareVote(ref, account, direction)
      ),
    retract: () =>
      submit("retract", (client, account) =>
        client.prepareRetract(ref, account)
      ),
    flag: (reason: string) =>
      submit("flag", (client, account) =>
        client.prepareFlag(ref, account, reason)
      ),
    veto: (reason: string) =>
      submit("veto", (client, account) =>
        client.prepareVeto(ref, account, reason)
      ),
    executeProposal: () =>
      submit("execute", (client, account) =>
        client.prepareExecute(ref, account)
      ),
  };
}

function applyDaoSurfaceState<
  TResult extends {
    data: unknown;
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
    isPending: boolean;
  },
>(
  query: TResult,
  runtime: DaoMockRuntimeSnapshot | null,
  lastGoodData?: TResult["data"]
): TResult {
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
      data: lastGoodData,
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
    setTransactionOutcome: (outcome: DaoMockTransactionOutcome) =>
      mutate(() => setDaoMockTransactionOutcome(outcome)),
    indexPendingAction: () => mutate(() => indexDaoMockPendingAction()),
    clearPendingAction: () => mutate(() => clearDaoMockPendingAction()),
    setVetoState: (vetoState: DaoMockVetoState) =>
      mutate(() => setDaoMockVetoState(vetoState)),
  };
}

export { daoKeys } from "@/lib/hooks/daoKeys";
