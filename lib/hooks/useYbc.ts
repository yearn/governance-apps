"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import type { YbcProposalPhase, YbcProposalType, YbcPrototypeScenarioId } from "@/lib/clients/ybc";
import { createMockYbcClient } from "@/lib/clients/ybc";
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
import type { YbcVoteChoice } from "@/lib/clients/ybc/mock";

export const ybcKeys = {
  all: ["ybc"] as const,
};

type UseYbcStateOptions = {
  bootstrap?: boolean;
  scenarioOverride?: YbcPrototypeScenarioId;
  latencyMs?: number;
};

const mockYbcClient = createMockYbcClient({ latencyMs: 0 });

function sleep(latencyMs: number) {
  if (latencyMs <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, latencyMs);
  });
}

export function useYbcState(options: UseYbcStateOptions = {}) {
  const { address, isConnected } = useAccount();
  const runtime = useSyncExternalStore(
    subscribeYbcMockStore,
    getYbcMockSnapshot,
    getYbcMockSnapshot
  );
  const [error, setError] = useState<Error | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const defaultScenarioId: YbcPrototypeScenarioId =
    options.scenarioOverride ??
    (isConnected
      ? mockYbcClient.resolveDefaultScenario(address ?? null)
      : "observer");

  useEffect(() => {
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

        if (options.scenarioOverride) {
          resetYbcMockStore({ scenarioId: options.scenarioOverride });
        } else if (!isYbcMockStoreInitialized()) {
          ensureYbcMockStoreInitialized(defaultScenarioId);
        }
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
    defaultScenarioId,
    options.bootstrap,
    options.latencyMs,
    options.scenarioOverride,
  ]);

  return {
    createProposal: createYbcProposal,
    data: runtime.data,
    error,
    executeProposal: executeYbcProposal,
    isError: error !== null,
    isLoading: isBootstrapping || runtime.loading,
    patchAdmin: patchYbcAdmin,
    patchMember: patchYbcMember,
    patchProposal: patchYbcProposal,
    patchRewards: patchYbcRewards,
    refetch: async () => {
      await sleep(options.latencyMs ?? 350);
      resetYbcMockStore({ scenarioId: defaultScenarioId });
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

export type { YbcRuntimeSnapshot };
export type { YbcVoteChoice };
export type { YbcProposalPhase, YbcProposalType };
