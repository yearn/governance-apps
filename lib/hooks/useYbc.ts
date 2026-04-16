"use client";

import { useState } from "react";
import type { YbcMockDataV1, YbcProposalType, YbcScenarioId } from "@/lib/clients/ybc";
import {
  cloneAllYbcMockScenarioData,
  createEmptyYbcMockScenarioData,
  createYbcMockProposal,
  executeYbcMockProposal,
  listYbcMockScenarios,
  retractYbcMockProposal,
  type YbcVoteChoice,
  voteOnYbcMockProposal,
} from "@/lib/clients/ybc/mock";

type YbcBoardScenarioId = YbcScenarioId | "empty-board";

type YbcScenarioOption = {
  id: YbcBoardScenarioId;
  label: string;
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

export function useYbc(initialScenarioId: YbcBoardScenarioId = "member-ramping") {
  const [scenarioId, setScenarioId] = useState<YbcBoardScenarioId>(initialScenarioId);
  const [scenarioDataById, setScenarioDataById] = useState<
    Record<YbcBoardScenarioId, YbcMockDataV1>
  >(() => ({
    ...cloneAllYbcMockScenarioData(),
    "empty-board": createEmptyYbcMockScenarioData(),
  }));

  const data = scenarioDataById[scenarioId];

  function updateActiveScenario(
    transform: (scenarioData: YbcMockDataV1) => YbcMockDataV1
  ) {
    setScenarioDataById((current) => ({
      ...current,
      [scenarioId]: transform(current[scenarioId]),
    }));
  }

  return {
    data,
    scenarioId,
    scenarios: ybcScenarioOptions,
    setScenarioId,
    createProposal(type: YbcProposalType) {
      updateActiveScenario((scenarioData) => createYbcMockProposal(scenarioData, type));
    },
    retractProposal(proposalId: string) {
      updateActiveScenario((scenarioData) =>
        retractYbcMockProposal(scenarioData, proposalId)
      );
    },
    voteOnProposal(proposalId: string, choice: YbcVoteChoice) {
      updateActiveScenario((scenarioData) =>
        voteOnYbcMockProposal(scenarioData, proposalId, choice)
      );
    },
    executeProposal(proposalId: string) {
      updateActiveScenario((scenarioData) =>
        executeYbcMockProposal(scenarioData, proposalId)
      );
    },
  };
}
