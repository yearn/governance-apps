"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { useAccount } from "wagmi";
import type {
  YbcCanonicalSnapshot,
  YbcMockDataV1,
  YbcProposalPhase,
  YbcProposalType,
  YbcPrototypeScenarioId,
  YbcWalletOverlay,
} from "@/lib/clients/ybc";
import {
  createMockYbcClient,
  mapYbcFeedToPageState,
  readYbcCanonicalSnapshot,
  readYbcWalletOverlay,
} from "@/lib/clients/ybc";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { useYbcData } from "@/lib/hooks/useYbcData";
import { ybcKeys } from "@/lib/hooks/ybcKeys";
import { useOptionalProtocol } from "@/state/protocol";
import {
  createYbcProposal,
  ensureYbcMockStoreInitialized,
  executeYbcProposal,
  getYbcMockSnapshot,
  isYbcMockStoreInitialized,
  patchYbcAdmin,
  patchYbcMember,
  patchYbcProposal,
  patchYbcRewards,
  resetYbcMockStore,
  retractYbcProposal,
  seedYbcPerspective,
  seedYbcRewardsState,
  setYbcEmptyBoard,
  setYbcEmptyRoster,
  setYbcEpoch,
  setYbcHooksVisible,
  setYbcLoading,
  setYbcMemberMaturity,
  setYbcMemberStatus,
  setYbcOperatorAccess,
  setYbcProposalPhase,
  setYbcProposalVoteState,
  setYbcThresholdProfile,
  subscribeYbcMockStore,
  syncYbcMockStoreToNow,
  voteOnYbcProposal,
  type YbcRuntimeSnapshot,
} from "@/lib/clients/ybc/store";
import type { YbcVoteChoice } from "@/lib/clients/ybc";

export { ybcKeys } from "@/lib/hooks/ybcKeys";

type UseYbcStateOptions = {
  bootstrap?: boolean;
  scenarioOverride?: YbcPrototypeScenarioId;
  latencyMs?: number;
};

type YbcMockControls = {
  createProposal: typeof createYbcProposal;
  executeProposal: typeof executeYbcProposal;
  patchAdmin: typeof patchYbcAdmin;
  patchMember: typeof patchYbcMember;
  patchProposal: typeof patchYbcProposal;
  patchRewards: typeof patchYbcRewards;
  resetRuntime: typeof resetYbcMockStore;
  retractProposal: typeof retractYbcProposal;
  seedPerspective: typeof seedYbcPerspective;
  seedRewardsState: typeof seedYbcRewardsState;
  setEmptyBoard: typeof setYbcEmptyBoard;
  setEmptyRoster: typeof setYbcEmptyRoster;
  setEpoch: typeof setYbcEpoch;
  setHooksVisible: typeof setYbcHooksVisible;
  setLoading: typeof setYbcLoading;
  setMemberMaturity: typeof setYbcMemberMaturity;
  setMemberStatus: typeof setYbcMemberStatus;
  setOperatorAccess: typeof setYbcOperatorAccess;
  setProposalPhase: typeof setYbcProposalPhase;
  setProposalVoteState: typeof setYbcProposalVoteState;
  setThresholdProfile: typeof setYbcThresholdProfile;
  syncToNow: typeof syncYbcMockStoreToNow;
  voteOnProposal: typeof voteOnYbcProposal;
};

type DisabledYbcMockControls = {
  [Key in keyof YbcMockControls]: undefined;
};

type UseYbcStateBase = {
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: number | null;
  readStatus: "current" | "stale";
  refetch: () => Promise<void>;
  runtime: YbcRuntimeSnapshot;
  warning: Error | null;
};

export type UseYbcMockStateResult = UseYbcStateBase &
  YbcMockControls & {
    backend: "mock";
    data: YbcMockDataV1;
    feed: null;
    writeFeed: null;
  };

export type UseYbcFeedStateResult = UseYbcStateBase &
  DisabledYbcMockControls & {
    backend: "feed";
    data: YbcMockDataV1 | null;
    feed: YbcFeed | null;
    writeFeed: YbcFeed | null;
  };

export type UseYbcStateResult =
  | UseYbcMockStateResult
  | UseYbcFeedStateResult;

const mockYbcClient = createMockYbcClient({ latencyMs: 0 });

function sleep(latencyMs: number) {
  if (latencyMs <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, latencyMs);
  });
}

export function useYbcState(
  options: UseYbcStateOptions = {}
): UseYbcStateResult {
  const { address, chainId, isConnected } = useAccount();
  const protocol = useOptionalProtocol();
  const usesMockBackend = protocol?.ybcUsesMockBackend ?? true;
  const ybcFeed = useYbcData(!usesMockBackend);
  const mainnetPublicClient = protocol?.mainnetPublicClient ?? null;
  const canonicalSnapshot = useYbcCanonicalSnapshot({
    enabled: !usesMockBackend,
    feed: ybcFeed.data ?? null,
    publicClient: mainnetPublicClient,
  });
  const walletOverlay = useYbcWalletOverlay({
    account: address ?? null,
    enabled:
      !usesMockBackend &&
      isConnected &&
      Boolean(canonicalSnapshot.data) &&
      Boolean(mainnetPublicClient) &&
      Boolean(ybcFeed.data),
    feed: ybcFeed.data ?? null,
    publicClient: mainnetPublicClient,
    verifiedSnapshot: canonicalSnapshot.data ?? null,
  });
  const runtime = useSyncExternalStore(
    subscribeYbcMockStore,
    getYbcMockSnapshot,
    getYbcMockSnapshot
  );
  const [error, setError] = useState<Error | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const lastBootstrappedScenarioId = useRef<YbcPrototypeScenarioId | null>(null);

  const defaultScenarioId: YbcPrototypeScenarioId =
    options.scenarioOverride ??
    (isConnected
      ? mockYbcClient.resolveDefaultScenario(address ?? null)
      : "observer");
  const bootstrapScenarioId = options.scenarioOverride ?? defaultScenarioId;
  const walletOverlayTrusted =
    !isConnected ||
    (Boolean(mainnetPublicClient) &&
      isCompleteYbcWalletOverlay(
        ybcFeed.data ?? null,
        walletOverlay.data
      ) &&
      walletOverlay.isFetchedAfterMount &&
      !walletOverlay.isError);
  const actionStateTrusted =
    Boolean(canonicalSnapshot.data) &&
    canonicalSnapshot.isFetchedAfterMount &&
    !canonicalSnapshot.isError &&
    walletOverlayTrusted;
  const feedPageState = useMemo(() => {
    if (
      usesMockBackend ||
      !ybcFeed.data ||
      !canonicalSnapshot.data
    ) {
      return null;
    }

    return mapYbcFeedToPageState(ybcFeed.data, address ?? null, {
      actionStateTrusted,
      canonicalBlockTimestamp:
        canonicalSnapshot.data.blockTimestamp,
      proposalStatusById: canonicalSnapshot.data.proposalStatusById,
      walletChainId: chainId,
      walletOverlay: walletOverlay.data ?? null,
    });
  }, [
    actionStateTrusted,
    address,
    canonicalSnapshot.data,
    chainId,
    usesMockBackend,
    walletOverlay.data,
    ybcFeed.data,
  ]);
  const feedError = useMemo(() => {
    if (usesMockBackend) return null;
    if (feedPageState) return null;
    if (ybcFeed.error instanceof Error) return ybcFeed.error;
    if (ybcFeed.isError) return new Error("Unknown YBC feed error");
    if (canonicalSnapshot.error instanceof Error) {
      return canonicalSnapshot.error;
    }
    if (canonicalSnapshot.isError) {
      return new Error("Unknown YBC snapshot verification error");
    }
    if (!ybcFeed.isLoading && !feedPageState) {
      return new Error("No valid YBC feed payload is available.");
    }
    return null;
  }, [
    feedPageState,
    canonicalSnapshot.error,
    canonicalSnapshot.isError,
    usesMockBackend,
    ybcFeed.error,
    ybcFeed.isError,
    ybcFeed.isLoading,
  ]);

  useEffect(() => {
    if (!usesMockBackend) {
      setIsBootstrapping(false);
      setYbcLoading(false);
      return;
    }

    if (options.bootstrap === false) {
      setIsBootstrapping(false);
      return;
    }

    let isCancelled = false;

    async function bootstrap() {
      setIsBootstrapping(true);
      setError(null);

      try {
        await sleep(options.latencyMs ?? 350);

        if (isCancelled) {
          return;
        }

        if (
          !isYbcMockStoreInitialized() ||
          lastBootstrappedScenarioId.current === null ||
          lastBootstrappedScenarioId.current !== bootstrapScenarioId
        ) {
          resetYbcMockStore({ scenarioId: bootstrapScenarioId });
        } else {
          ensureYbcMockStoreInitialized(bootstrapScenarioId);
        }

        lastBootstrappedScenarioId.current = bootstrapScenarioId;
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError
            : new Error("Unknown YBC mock state error")
        );
      } finally {
        if (!isCancelled) {
          setIsBootstrapping(false);
          setYbcLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [
    bootstrapScenarioId,
    options.bootstrap,
    options.latencyMs,
    usesMockBackend,
  ]);

  if (!usesMockBackend) {
    const canRefetchWalletOverlay =
      isConnected &&
      Boolean(mainnetPublicClient) &&
      Boolean(canonicalSnapshot.data);
    const warning = feedPageState
      ? getYbcReadWarning({
          canonicalSnapshotError: canonicalSnapshot.isError
            ? canonicalSnapshot.error
            : null,
          feedError: ybcFeed.isError ? ybcFeed.error : null,
          isConnected,
          publicClientAvailable: Boolean(mainnetPublicClient),
          walletOverlayError: walletOverlay.error,
          walletOverlayTrusted,
        })
      : null;
    const readStatus =
      feedPageState && warning ? "stale" : "current";

    return {
      backend: "feed",
      createProposal: undefined,
      data: feedPageState?.data ?? null,
      error: feedError,
      executeProposal: undefined,
      feed: ybcFeed.data ?? null,
      writeFeed:
        actionStateTrusted && ybcFeed.data ? ybcFeed.data : null,
      isError: feedError !== null,
      isLoading:
        ybcFeed.isLoading ||
        canonicalSnapshot.isLoading ||
        (!feedPageState && !feedError),
      isRefreshing:
        ybcFeed.isFetching ||
        canonicalSnapshot.isFetching ||
        (isConnected && walletOverlay.isFetching),
      lastUpdatedAt: feedPageState?.data.asOf ?? null,
      patchAdmin: undefined,
      patchMember: undefined,
      patchProposal: undefined,
      patchRewards: undefined,
      refetch: async () => {
        await Promise.all([
          ybcFeed.refetch(),
          ...(mainnetPublicClient && ybcFeed.data
            ? [canonicalSnapshot.refetch()]
            : []),
          ...(canRefetchWalletOverlay
            ? [walletOverlay.refetch()]
            : []),
        ]);
      },
      resetRuntime: undefined,
      retractProposal: undefined,
      readStatus,
      runtime,
      seedPerspective: undefined,
      seedRewardsState: undefined,
      setEmptyBoard: undefined,
      setEmptyRoster: undefined,
      setEpoch: undefined,
      setHooksVisible: undefined,
      setLoading: undefined,
      setMemberMaturity: undefined,
      setMemberStatus: undefined,
      setOperatorAccess: undefined,
      setProposalPhase: undefined,
      setProposalVoteState: undefined,
      setThresholdProfile: undefined,
      syncToNow: undefined,
      voteOnProposal: undefined,
      warning,
    };
  }

  return {
    backend: "mock",
    createProposal: createYbcProposal,
    data: runtime.data,
    error,
    executeProposal: executeYbcProposal,
    feed: null,
    writeFeed: null,
    isError: error !== null,
    isLoading: isBootstrapping || runtime.loading,
    isRefreshing: false,
    lastUpdatedAt: runtime.data.asOf,
    patchAdmin: patchYbcAdmin,
    patchMember: patchYbcMember,
    patchProposal: patchYbcProposal,
    patchRewards: patchYbcRewards,
    refetch: async () => {
      await sleep(options.latencyMs ?? 350);
      resetYbcMockStore({ scenarioId: bootstrapScenarioId });
      lastBootstrappedScenarioId.current = bootstrapScenarioId;
    },
    resetRuntime: resetYbcMockStore,
    retractProposal: retractYbcProposal,
    readStatus: "current",
    runtime,
    seedPerspective: seedYbcPerspective,
    seedRewardsState: seedYbcRewardsState,
    setEmptyBoard: setYbcEmptyBoard,
    setEmptyRoster: setYbcEmptyRoster,
    setEpoch: setYbcEpoch,
    setHooksVisible: setYbcHooksVisible,
    setLoading: setYbcLoading,
    setMemberMaturity: setYbcMemberMaturity,
    setMemberStatus: setYbcMemberStatus,
    setOperatorAccess: setYbcOperatorAccess,
    setProposalPhase: setYbcProposalPhase,
    setProposalVoteState: setYbcProposalVoteState,
    setThresholdProfile: setYbcThresholdProfile,
    syncToNow: syncYbcMockStoreToNow,
    voteOnProposal: voteOnYbcProposal,
    warning: null,
  };
}

export function isCompleteYbcWalletOverlay(
  feed: YbcFeed | null,
  walletOverlay: YbcWalletOverlay | null | undefined
): boolean {
  if (!feed || !walletOverlay) return false;
  if (
    typeof walletOverlay.isMember !== "boolean" ||
    typeof walletOverlay.isOperator !== "boolean" ||
    typeof walletOverlay.staked !== "bigint" ||
    typeof walletOverlay.weight !== "bigint"
  ) {
    return false;
  }

  return feed.proposals.every(
    (proposal) =>
      walletOverlay.proposalStatusById[proposal.id] !== null &&
      walletOverlay.proposalStatusById[proposal.id] !== undefined &&
      typeof walletOverlay.votedByProposalId[proposal.id] === "boolean"
  );
}

function getYbcReadWarning({
  canonicalSnapshotError,
  feedError,
  isConnected,
  publicClientAvailable,
  walletOverlayError,
  walletOverlayTrusted,
}: {
  canonicalSnapshotError: unknown;
  feedError: unknown;
  isConnected: boolean;
  publicClientAvailable: boolean;
  walletOverlayError: unknown;
  walletOverlayTrusted: boolean;
}): Error | null {
  if (feedError instanceof Error) return feedError;
  if (feedError) return new Error("The latest YBC feed refresh failed.");
  if (canonicalSnapshotError instanceof Error) {
    return canonicalSnapshotError;
  }
  if (canonicalSnapshotError) {
    return new Error(
      "The YBC snapshot could not be verified on Ethereum Mainnet."
    );
  }
  if (!isConnected || walletOverlayTrusted) return null;
  if (!publicClientAvailable) {
    return new Error(
      "Live YBC wallet reads are unavailable. Actions are paused."
    );
  }
  if (walletOverlayError instanceof Error) return walletOverlayError;
  return new Error(
    "Live YBC wallet eligibility is incomplete. Actions are paused."
  );
}

function useYbcCanonicalSnapshot({
  enabled,
  feed,
  publicClient,
}: {
  enabled: boolean;
  feed: YbcFeed | null;
  publicClient: PublicClient | null;
}) {
  return useQuery({
    queryKey: ybcKeys.canonicalSnapshot(feed),
    queryFn: () => {
      if (!publicClient || !feed) {
        throw new Error("YBC snapshot verification is unavailable.");
      }
      return readYbcCanonicalSnapshot(publicClient, feed);
    },
    enabled: enabled && Boolean(publicClient && feed),
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: false,
  });
}

function useYbcWalletOverlay({
  account,
  enabled,
  feed,
  publicClient,
  verifiedSnapshot,
}: {
  account: Address | null;
  enabled: boolean;
  feed: YbcFeed | null;
  publicClient: PublicClient | null;
  verifiedSnapshot: YbcCanonicalSnapshot | null;
}) {
  return useQuery({
    queryKey: ybcKeys.walletOverlay(account, feed),
    queryFn: () => {
      if (!publicClient || !feed || !account || !verifiedSnapshot) {
        throw new Error("YBC wallet overlay is unavailable.");
      }
      return readYbcWalletOverlay(
        publicClient,
        feed,
        account,
        verifiedSnapshot
      );
    },
    enabled:
      enabled &&
      Boolean(publicClient && feed && account && verifiedSnapshot),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export type { YbcRuntimeSnapshot };
export type { YbcVoteChoice };
export type { YbcProposalPhase, YbcProposalType };
