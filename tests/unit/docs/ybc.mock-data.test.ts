import { describe, expect, it } from "vitest";
import mockData from "@/docs/apps/ybc/examples/mock-data.example.json";
import type {
  YbcMockExampleScenariosV1,
  YbcProposalPhase,
  YbcScenarioId,
} from "@/lib/clients/ybc";

const untypedMockData: unknown = mockData;
assertYbcMockFixture(untypedMockData);
const typedMockData = untypedMockData;

const requiredScenarioIds: YbcScenarioId[] = [
  "member-matured",
  "member-ramping",
  "observer",
  "operator-admin",
];

const requiredProposalPhases: YbcProposalPhase[] = [
  "awaiting-execution",
  "discussion",
  "executed",
  "expired",
  "voting",
];

const amountPattern = /^\d+(\.\d+)?$/;

function assertYbcMockFixture(
  value: unknown
): asserts value is YbcMockExampleScenariosV1 {
  if (!isRecord(value)) {
    throw new Error("YBC mock fixture must be an object");
  }
  if (value.version !== 1) {
    throw new Error("YBC mock fixture must use schema version 1");
  }
  if (typeof value.generatedAt !== "number") {
    throw new Error("YBC mock fixture must include generatedAt");
  }
  if (!Array.isArray(value.scenarios)) {
    throw new Error("YBC mock fixture must include scenarios");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function expectAmount(value: unknown) {
  expect(value).toEqual(expect.any(String));
  expect(value).toMatch(amountPattern);
}

function getAllProposals() {
  return typedMockData.scenarios.flatMap(
    (scenario) => scenario.data.proposals.items
  );
}

describe("YBC mock data contract", () => {
  it("covers the required personas and top-level domains", () => {
    expect(typedMockData.version).toBe(1);
    expect(typedMockData.generatedAt).toEqual(expect.any(Number));

    const scenarioIds = typedMockData.scenarios
      .map((scenario) => scenario.id)
      .sort();
    expect(scenarioIds).toEqual(requiredScenarioIds);

    for (const scenario of typedMockData.scenarios) {
      const { data } = scenario;

      expect(data.hero).toEqual(
        expect.objectContaining({
          collectiveAddress: expect.any(String),
          memberCount: expect.any(Number),
          activeProposalCount: expect.any(Number),
          awaitingExecutionCount: expect.any(Number),
        })
      );
      expect(data.roster.members.length).toBeGreaterThan(0);
      expect(data.proposals.items.length).toBeGreaterThan(0);
      expect(data.rewards.claim.mode).toBe("shared-claim-surface");
      expect(data.rewards.claim.href).not.toContain("/ybc");
    }
  });

  it("keeps raw stake, effective weight, and target weight explicit", () => {
    for (const scenario of typedMockData.scenarios) {
      const { data } = scenario;
      expectAmount(data.me.weight.rawStaked);
      expectAmount(data.me.weight.effectiveWeight);
      expectAmount(data.me.weight.targetWeight);
      expect(data.me.weight.maturityBps).toBeGreaterThanOrEqual(0);
      expect(data.me.weight.maturityBps).toBeLessThanOrEqual(10000);

      const rampingMembers = data.roster.members.filter(
        (member) => member.status === "ramping"
      );

      for (const member of data.roster.members) {
        expectAmount(member.weight.rawStaked);
        expectAmount(member.weight.effectiveWeight);
        expectAmount(member.weight.targetWeight);
        expectAmount(member.sources.stYFI);
        expectAmount(member.sources.stYFIx);
        expectAmount(member.sources.migratedVeYfi);
        expect(member.weight.maturityBps).toBeGreaterThanOrEqual(0);
        expect(member.weight.maturityBps).toBeLessThanOrEqual(10000);
      }

      expect(data.roster.totals.rampingMemberCount).toBe(
        rampingMembers.length
      );
      expect(
        rampingMembers.some(
          (member) =>
            Number(member.weight.rawStaked) >
              Number(member.weight.effectiveWeight) &&
            Number(member.weight.targetWeight) >
              Number(member.weight.effectiveWeight)
        )
      ).toBe(true);
    }
  });

  it("pins proposal phases, timing fields, thresholds, and votes", () => {
    const proposals = getAllProposals();
    const phases = new Set(proposals.map((proposal) => proposal.phase));

    for (const phase of requiredProposalPhases) {
      expect(phases.has(phase)).toBe(true);
    }

    for (const proposal of proposals) {
      expect(proposal.thresholdBps).toBeGreaterThan(0);
      expect(proposal.thresholdBps).toBeLessThanOrEqual(10000);
      expectAmount(proposal.votes.total);
      expectAmount(proposal.votes.yea);
      expectAmount(proposal.votes.nay);

      expect(proposal.timing.createdAt).toEqual(expect.any(Number));
      expect(proposal.timing.discussionStartsAt).toBeLessThanOrEqual(
        proposal.timing.votingStartsAt
      );
      expect(proposal.timing.votingStartsAt).toBeLessThanOrEqual(
        proposal.timing.votingEndsAt
      );
      expect(proposal.timing.votingEndsAt).toBeLessThanOrEqual(
        proposal.timing.executionOpensAt
      );
      expect(proposal.timing.executionOpensAt).toBeLessThanOrEqual(
        proposal.timing.expiresAt
      );
    }
  });

  it("keeps terminal proposals non-actionable and admin scope narrow", () => {
    const expiredProposals = getAllProposals().filter(
      (proposal) => proposal.phase === "expired"
    );
    expect(expiredProposals.length).toBeGreaterThan(0);

    for (const proposal of expiredProposals) {
      expect(proposal.actions).toEqual(
        expect.objectContaining({
          canRetract: false,
          canVote: false,
          canExecute: false,
          nextAction: "none",
        })
      );
      expect(proposal.actions.disabledReason).toMatch(/terminal/i);
    }

    const operatorScenario = typedMockData.scenarios.find(
      (scenario) => scenario.id === "operator-admin"
    );
    const admin = operatorScenario?.data.admin;
    if (!admin) {
      throw new Error("operator-admin scenario must include admin data");
    }

    expect(
      typedMockData.scenarios
        .filter((scenario) => scenario.data.admin)
        .map((scenario) => scenario.id)
    ).toEqual(["operator-admin"]);
    expect(
      admin.scopedOperations.map((operation) => operation.id).sort()
    ).toEqual(["add-member", "remove-member"]);
  });
});
