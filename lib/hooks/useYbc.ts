"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type {
  YbcMockDataV1,
  YbcProposalType,
  YbcPrototypeScenarioId,
  YbcScenarioId,
} from "@/lib/clients/ybc";
import { createMockYbcClient } from "@/lib/clients/ybc";
import {
  createEmptyYbcMockScenarioData,
  createYbcMockProposal,
  executeYbcMockProposal,
  listYbcMockScenarios,
  retractYbcMockProposal,
  type YbcVoteChoice,
  voteOnYbcMockProposal,
} from "@/lib/clients/ybc/mock";

export type YbcBoardScenarioId = YbcPrototypeScenarioId | "empty-board";

export type YbcScenarioOption = {
  id: YbcScenarioId | "empty-board";
  label: string;
};

type YbcScenarioState = {
  label: string;
  data: YbcMockDataV1;
};

type YbcScenarioStateMap = Record<YbcBoardScenarioId, YbcScenarioState>;

type UseYbcStateOptions = {
  scenarioOverride?: YbcPrototypeScenarioId;
  latencyMs?: number;
};

const ybcScenarioOptions: YbcScenarioOption[] = [
  ...listYbcMockScenarios().map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
  })),
  {
    id: "empty-board",
    label: "Empty proposal board",
  },
];

export function useYbcState(options: UseYbcStateOptions = {}) {
  const { address, isConnected } = useAccount();
  const latencyMs = options.latencyMs ?? 350;
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [scenarioDataById, setScenarioDataById] =
    useState<YbcScenarioStateMap | null>(null);

  const defaultScenarioId: YbcPrototypeScenarioId =
    options.scenarioOverride ??
    (isConnected
      ? createMockYbcClient({ latencyMs }).resolveDefaultScenario(address ?? null)
      : "observer");
  const [scenarioId, setScenarioId] = useState<YbcBoardScenarioId>(
    defaultScenarioId
  );

  useEffect(() => {
    setScenarioId(defaultScenarioId);
  }, [defaultScenarioId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadScenarioData() {
      setIsLoading(true);
      setError(null);

      try {
        const ybc = createMockYbcClient({ latencyMs });
        const [observer, memberRamping, memberMatured, operatorAdmin, empty] =
          await Promise.all([
            ybc.getPageState({ scenarioId: "observer" }),
            ybc.getPageState({ scenarioId: "member-ramping" }),
            ybc.getPageState({ scenarioId: "member-matured" }),
            ybc.getPageState({ scenarioId: "operator-admin" }),
            ybc.getPageState({ scenarioId: "empty" }),
          ]);

        if (isCancelled) {
          return;
        }

        setScenarioDataById({
          observer: { label: observer.label, data: observer.data },
          "member-ramping": {
            label: memberRamping.label,
            data: memberRamping.data,
          },
          "member-matured": {
            label: memberMatured.label,
            data: memberMatured.data,
          },
          "operator-admin": {
            label: operatorAdmin.label,
            data: operatorAdmin.data,
          },
          empty: { label: empty.label, data: empty.data },
          "empty-board": {
            label: "Empty proposal board",
            data: createEmptyYbcMockScenarioData(),
          },
        });
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setScenarioDataById(null);
        setError(
          nextError instanceof Error
            ? nextError
            : new Error("Unknown YBC mock state error")
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadScenarioData();

    return () => {
      isCancelled = true;
    };
  }, [latencyMs, reloadKey]);

  function updateActiveScenario(
    transform: (scenarioData: YbcMockDataV1) => YbcMockDataV1
  ) {
    setScenarioDataById((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [scenarioId]: {
          ...current[scenarioId],
          data: transform(current[scenarioId].data),
        },
      };
    });
  }

  return {
    createProposal(type: YbcProposalType) {
      updateActiveScenario((scenarioData) =>
        createYbcMockProposal(scenarioData, type)
      );
    },
    data: scenarioDataById?.[scenarioId]?.data ?? null,
    error,
    executeProposal(proposalId: string) {
      updateActiveScenario((scenarioData) =>
        executeYbcMockProposal(scenarioData, proposalId)
      );
    },
    isError: error !== null,
    isLoading,
    async refetch() {
      setReloadKey((current) => current + 1);
    },
    retractProposal(proposalId: string) {
      updateActiveScenario((scenarioData) =>
        retractYbcMockProposal(scenarioData, proposalId)
      );
    },
    scenarioId,
    scenarios: ybcScenarioOptions,
    setScenarioId,
    voteOnProposal(proposalId: string, choice: YbcVoteChoice) {
      updateActiveScenario((scenarioData) =>
        voteOnYbcMockProposal(scenarioData, proposalId, choice)
      );
    },
  };
}
