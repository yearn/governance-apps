"use client";

import type { Address } from "viem";
import mockData from "@/docs/apps/ybc/examples/mock-data.example.json";
import type { YbcClient, YbcPageState, YbcPrototypeScenarioId } from "./client";
import type {
  YbcMockExampleScenariosV1,
  YbcScenarioId,
} from "./types";

const FIXTURE = mockData as YbcMockExampleScenariosV1;
const MEMBER_SCENARIO_IDS = ["member-ramping", "member-matured"] as const;
const SCENARIOS = new Map(
  FIXTURE.scenarios.map((scenario) => [scenario.id, scenario] as const)
);

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function getScenarioOrThrow(scenarioId: YbcScenarioId) {
  const scenario = SCENARIOS.get(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown YBC mock scenario: ${scenarioId}`);
  }
  return scenario;
}

function createEmptyState(): YbcPageState {
  const observerScenario = getScenarioOrThrow("observer");
  const data = cloneValue(observerScenario.data);

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
