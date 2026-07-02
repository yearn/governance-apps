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
  YbcMockDataV1,
  YbcProposalPhase,
  YbcProposalType,
  YbcPrototypeScenarioId,
} from "@/lib/clients/ybc";
import {
  createMockYbcClient,
  mapYbcFeedToPageState,
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
  refetch: () => Promise<void>;
  runtime: YbcRuntimeSnapshot;
};

export type UseYbcMockStateResult = UseYbcStateBase &
  YbcMockControls & {
    backend: "mock";
    data: YbcMockDataV1;
    feed: null;
  };

export type UseYbcFeedStateResult = UseYbcStateBase &
  DisabledYbcMockControls & {
    backend: "feed";
    data: YbcMockDataV1 | null;
    feed: YbcFeed | null;
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
  const walletOverlay = useYbcWalletOverlay({
    account: address ?? null,
    enabled:
      !usesMockBackend &&
      isConnected &&
      Boolean(protocol?.publicClient) &&
      Boolean(ybcFeed.data),
    feed: ybcFeed.data ?? null,
    publicClient: protocol?.publicClient ?? null,
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
  const feedPageState = useMemo(() => {
    if (usesMockBackend || !ybcFeed.data) {
      return null;
    }

    return mapYbcFeedToPageState(ybcFeed.data, address ?? null, {
      walletChainId: chainId,
      walletOverlay: walletOverlay.data ?? null,
    });
  }, [address, chainId, usesMockBackend, walletOverlay.data, ybcFeed.data]);
  const feedError = useMemo(() => {
    if (usesMockBackend) return null;
    if (ybcFeed.error instanceof Error) return ybcFeed.error;
    if (ybcFeed.isError) return new Error("Unknown YBC feed error");
    if (!ybcFeed.isLoading && !feedPageState) {
      return new Error("No valid YBC feed payload is available.");
    }
    return null;
  }, [
    feedPageState,
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
    return {
      backend: "feed",
      createProposal: undefined,
      data: feedPageState?.data ?? null,
      error: feedError,
      executeProposal: undefined,
      feed: ybcFeed.data ?? null,
      isError: feedError !== null,
      isLoading: ybcFeed.isLoading || (!feedPageState && !feedError),
      patchAdmin: undefined,
      patchMember: undefined,
      patchProposal: undefined,
      patchRewards: undefined,
      refetch: async () => {
        await ybcFeed.refetch();
      },
      resetRuntime: undefined,
      retractProposal: undefined,
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
    };
  }

  return {
    backend: "mock",
    createProposal: createYbcProposal,
    data: runtime.data,
    error,
    executeProposal: executeYbcProposal,
    feed: null,
    isError: error !== null,
    isLoading: isBootstrapping || runtime.loading,
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
  };
}

function useYbcWalletOverlay({
  account,
  enabled,
  feed,
  publicClient,
}: {
  account: Address | null;
  enabled: boolean;
  feed: YbcFeed | null;
  publicClient: PublicClient | null;
}) {
  return useQuery({
    queryKey: ybcKeys.walletOverlay(account),
    queryFn: () => {
      if (!publicClient || !feed || !account) {
        throw new Error("YBC wallet overlay is unavailable.");
      }
      return readYbcWalletOverlay(publicClient, feed, account);
    },
    enabled: enabled && Boolean(publicClient && feed && account),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export type { YbcRuntimeSnapshot };
export type { YbcVoteChoice };
export type { YbcProposalPhase, YbcProposalType };
