"use client";

import type { Address } from "viem";
import mockData from "@/docs/apps/ybc/examples/mock-data.example.json";
import type { YbcClient, YbcPageState, YbcPrototypeScenarioId } from "./client";
import type {
  YbcMockDataV1,
  YbcMockExampleScenariosV1,
  YbcMockScenario,
  YbcProposalPhase,
  YbcProposalRecord,
  YbcProposalType,
  YbcScenarioId,
} from "./types";

export type YbcVoteChoice = "yea" | "nay";

type YbcProposalSummary = YbcMockDataV1["proposals"]["summary"];

const FIXTURE = mockData as YbcMockExampleScenariosV1;
const MEMBER_SCENARIO_IDS = ["member-ramping", "member-matured"] as const;
const ACTIVE_PHASES: YbcProposalPhase[] = ["discussion", "voting"];
const TERMINAL_PHASES: YbcProposalPhase[] = [
  "executed",
  "expired",
  "failed",
  "retracted",
];
const DEFAULT_THRESHOLD_BPS: Record<YbcProposalType, number> = {
  addition: 5000,
  expulsion: 6000,
};
const ADDITION_TARGETS: Address[] = [
  "0xaaaa00000000000000000000000000000000aa01",
  "0xaaaa00000000000000000000000000000000aa02",
  "0xaaaa00000000000000000000000000000000aa03",
] as const;

const SCENARIOS = new Map<YbcScenarioId, YbcMockScenario>(
  FIXTURE.scenarios.map((scenario) => [scenario.id, scenario] as const)
);

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function getScenarioOrThrow(scenarioId: YbcScenarioId): YbcMockScenario {
  const scenario = SCENARIOS.get(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown YBC mock scenario: ${scenarioId}`);
  }
  return scenario;
}

function createEmptyState(): YbcPageState {
  const data = cloneYbcMockScenarioData("observer");

  data.hero.memberCount = 0;
  data.hero.internalWeight = "0";
  data.hero.delegatedWeight = "0";
  data.hero.totalInfluence = "0";
  data.hero.activeProposalCount = 0;
  data.hero.awaitingExecutionCount = 0;
  data.roster.totals.rawStaked = "0";
  data.roster.totals.effectiveWeight = "0";
  data.roster.totals.targetWeight = "0";
  data.roster.totals.rampingMemberCount = 0;
  data.roster.members = [];
  data.proposals.summary.activeCount = 0;
  data.proposals.summary.awaitingExecutionCount = 0;
  data.proposals.summary.terminalCount = 0;
  data.proposals.items = [];
  data.rewards.claimable = "0";
  data.rewards.accruing = "0";
  data.rewards.periods = [];

  return {
    scenarioId: "empty",
    label: "No members seeded",
    data,
  };
}

function summarizeProposals(items: YbcProposalRecord[]): YbcProposalSummary {
  return {
    activeCount: items.filter((item) => ACTIVE_PHASES.includes(item.phase)).length,
    awaitingExecutionCount: items.filter(
      (item) => item.phase === "awaiting-execution"
    ).length,
    terminalCount: items.filter((item) => TERMINAL_PHASES.includes(item.phase))
      .length,
  };
}

function syncProposalState(
  data: YbcMockDataV1,
  items: YbcProposalRecord[]
): YbcMockDataV1 {
  const summary = summarizeProposals(items);

  return {
    ...data,
    hero: {
      ...data.hero,
      activeProposalCount: summary.activeCount,
      awaitingExecutionCount: summary.awaitingExecutionCount,
    },
    proposals: {
      summary,
      items,
    },
  };
}

function getNextProposalNumber(items: YbcProposalRecord[]): number {
  return (
    items.reduce((max, proposal) => {
      const match = /YBC-(\d+)/.exec(proposal.id);
      const current = match ? Number.parseInt(match[1] ?? "0", 10) : 0;
      return Math.max(max, current);
    }, 0) + 1
  );
}

function getProposalTargetAccount(
  data: YbcMockDataV1,
  type: YbcProposalType
): Address {
  if (type === "expulsion") {
    return (
      data.roster.members.find((member) => member.address !== data.me.address)
        ?.address ?? data.roster.members[0]?.address ?? ADDITION_TARGETS[0]
    );
  }

  const usedTargets = new Set(
    data.proposals.items.map((proposal) => proposal.targetAccount.toLowerCase())
  );

  return (
    ADDITION_TARGETS.find(
      (candidate) => !usedTargets.has(candidate.toLowerCase())
    ) ?? ADDITION_TARGETS[0]
  );
}

function parseAmount(amount: string): number {
  return Number.parseFloat(amount);
}

function formatAmount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(4).replace(/\.?0+$/, "");
}

export function listYbcMockScenarios(): readonly YbcMockScenario[] {
  return FIXTURE.scenarios;
}

export function getYbcMockScenario(id: YbcScenarioId): YbcMockScenario {
  return getScenarioOrThrow(id);
}

export function cloneYbcMockScenarioData(id: YbcScenarioId): YbcMockDataV1 {
  return cloneValue(getScenarioOrThrow(id).data);
}

export function cloneAllYbcMockScenarioData(): Record<
  YbcScenarioId,
  YbcMockDataV1
> {
  return {
    observer: cloneYbcMockScenarioData("observer"),
    "member-matured": cloneYbcMockScenarioData("member-matured"),
    "member-ramping": cloneYbcMockScenarioData("member-ramping"),
    "operator-admin": cloneYbcMockScenarioData("operator-admin"),
  };
}

export function createEmptyYbcMockScenarioData(
  baseScenarioId: YbcScenarioId = "member-matured"
): YbcMockDataV1 {
  const base = cloneYbcMockScenarioData(baseScenarioId);

  return {
    ...base,
    hero: {
      ...base.hero,
      activeProposalCount: 0,
      awaitingExecutionCount: 0,
    },
    proposals: {
      summary: {
        activeCount: 0,
        awaitingExecutionCount: 0,
        terminalCount: 0,
      },
      items: [],
    },
  };
}

export class MockYbcClient implements YbcClient {
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 350;
  }

  resolveDefaultScenario(address?: Address | null): YbcScenarioId {
    if (!address) return "observer";

    const normalizedAddress = address.toLowerCase();

    for (const scenarioId of MEMBER_SCENARIO_IDS) {
      const scenario = getScenarioOrThrow(scenarioId);
      const memberAddress = scenario.data.me.address?.toLowerCase();
      if (memberAddress === normalizedAddress) {
        return scenarioId;
      }
    }

    return "observer";
  }

  async getPageState(options: {
    scenarioId?: YbcPrototypeScenarioId;
  } = {}): Promise<YbcPageState> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const scenarioId = options.scenarioId ?? "observer";
    if (scenarioId === "empty") {
      return createEmptyState();
    }

    const scenario = getScenarioOrThrow(scenarioId);
    return {
      scenarioId,
      label: scenario.label,
      data: cloneValue(scenario.data),
    };
  }
}

export function createMockYbcClient(options?: { latencyMs?: number }) {
  return new MockYbcClient(options);
}

export function getYbcProposalThresholdState(proposal: YbcProposalRecord) {
  const total = parseAmount(proposal.votes.total);
  const yea = parseAmount(proposal.votes.yea);
  const currentBps = total <= 0 ? 0 : Math.round((yea / total) * 10_000);

  return {
    currentBps,
    currentRatio: currentBps / 10_000,
    thresholdBps: proposal.thresholdBps,
    thresholdRatio: proposal.thresholdBps / 10_000,
    thresholdMet: currentBps >= proposal.thresholdBps,
  };
}

export function createYbcMockProposal(
  data: YbcMockDataV1,
  type: YbcProposalType
): YbcMockDataV1 {
  if (!data.me.canPropose || !data.me.address) {
    return data;
  }

  const existingItems = data.proposals.items;
  const createdAt =
    data.asOf +
    existingItems.filter((item) => item.phase === "discussion").length * 300;
  const votingStartsAt = createdAt + 86_400;
  const votingEndsAt = votingStartsAt + 172_800;
  const expiresAt = votingEndsAt + 86_400;

  const proposal: YbcProposalRecord = {
    id: `YBC-${getNextProposalNumber(existingItems)}`,
    type,
    targetAccount: getProposalTargetAccount(data, type),
    proposer: data.me.address,
    epoch: data.epoch.current + 1,
    phase: "discussion",
    outcome: "pending",
    thresholdBps:
      type === "expulsion"
        ? data.admin?.thresholds.expulsionBps ?? DEFAULT_THRESHOLD_BPS.expulsion
        : data.admin?.thresholds.additionBps ?? DEFAULT_THRESHOLD_BPS.addition,
    votes: {
      total: "0",
      yea: "0",
      nay: "0",
    },
    timing: {
      createdAt,
      discussionStartsAt: createdAt,
      votingStartsAt,
      votingEndsAt,
      executionOpensAt: votingEndsAt,
      expiresAt,
    },
    actions: {
      canRetract: true,
      canVote: false,
      canExecute: false,
      nextAction: "retract",
      disabledReason: null,
    },
  };

  return syncProposalState(data, [proposal, ...existingItems]);
}

export function retractYbcMockProposal(
  data: YbcMockDataV1,
  proposalId: string
): YbcMockDataV1 {
  return syncProposalState(
    data,
    data.proposals.items.map((proposal) =>
      proposal.id === proposalId && proposal.actions.canRetract
        ? {
            ...proposal,
            phase: "retracted",
            outcome: "failed",
            actions: {
              canRetract: false,
              canVote: false,
              canExecute: false,
              nextAction: "none",
              disabledReason: "Retracted proposals are terminal.",
            },
          }
        : proposal
    )
  );
}

export function voteOnYbcMockProposal(
  data: YbcMockDataV1,
  proposalId: string,
  choice: YbcVoteChoice
): YbcMockDataV1 {
  const voterWeight = parseAmount(data.me.weight.effectiveWeight);
  if (!data.me.canVote || voterWeight <= 0) {
    return data;
  }

  return syncProposalState(
    data,
    data.proposals.items.map((proposal) => {
      if (proposal.id !== proposalId || !proposal.actions.canVote) {
        return proposal;
      }

      const nextTotal = parseAmount(proposal.votes.total) + voterWeight;
      const nextYea =
        parseAmount(proposal.votes.yea) + (choice === "yea" ? voterWeight : 0);
      const nextNay =
        parseAmount(proposal.votes.nay) + (choice === "nay" ? voterWeight : 0);
      const nextBps =
        nextTotal <= 0 ? 0 : Math.round((nextYea / nextTotal) * 10_000);

      return {
        ...proposal,
        outcome: nextBps >= proposal.thresholdBps ? "passing" : "failing",
        votes: {
          total: formatAmount(nextTotal),
          yea: formatAmount(nextYea),
          nay: formatAmount(nextNay),
        },
        actions: {
          canRetract: false,
          canVote: false,
          canExecute: false,
          nextAction: "none",
          disabledReason:
            choice === "yea"
              ? "Mock yea vote recorded."
              : "Mock nay vote recorded.",
        },
      };
    })
  );
}

export function executeYbcMockProposal(
  data: YbcMockDataV1,
  proposalId: string
): YbcMockDataV1 {
  return syncProposalState(
    data,
    data.proposals.items.map((proposal) =>
      proposal.id === proposalId && proposal.actions.canExecute
        ? {
            ...proposal,
            phase: "executed",
            outcome: "passed",
            timing: {
              ...proposal.timing,
              executedAt: data.asOf,
            },
            actions: {
              canRetract: false,
              canVote: false,
              canExecute: false,
              nextAction: "none",
              disabledReason: "Executed proposals are terminal.",
            },
          }
        : proposal
    )
  );
}
