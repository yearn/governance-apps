import { describe, expect, it } from "vitest";
import mockData from "@/docs/apps/teams/examples/mock-data.example.json";
import type {
  BonusPeriodStatus,
  BucketStatus,
  FundingApprovalStatus,
  PeriodFinalizationStatus,
  RevenueTokenAdminStatus,
  TeamBonusStatus,
  TeamFundingSummaryState,
  TeamLifecycleStatus,
  TeamMigrationReadiness,
  TeamReadOnlyReason,
  TeamRecord,
  TeamsMockDataV1,
  TeamsMockExampleScenariosV1,
  TeamsMockScenarioId,
  TeamsRegistryStatus,
  TeamsViewerRole,
} from "@/lib/clients/teams/types";

const expectedScenarioIds: TeamsMockScenarioId[] = [
  "directory-observer",
  "team-owner-funding",
  "bonus-available",
  "retired-read-only",
  "operator-admin",
];

const expectedFundingStatuses: FundingApprovalStatus[] = [
  "claimable-current-period",
  "fully-used",
  "late-liquid",
  "not-current-period",
  "partially-claimed",
];

const expectedBonusStatuses: TeamBonusStatus[] = [
  "claimable",
  "claimed",
  "none",
  "pending-finalization",
];

const expectedBonusPeriodStatuses: BonusPeriodStatus[] = [
  "claimed",
  "finalized-claimable",
  "finalized-zero",
  "pending-finalization",
];

const expectedLifecycleStatuses: TeamLifecycleStatus[] = [
  "active",
  "retired",
  "retiring",
];

const expectedViewerRoles: TeamsViewerRole[] = [
  "finance-operator",
  "observer",
  "operator-admin",
  "team-owner",
];

const expectedReadOnlyReasons: TeamReadOnlyReason[] = [
  "retired",
  "successor-active",
];

const expectedMigrationReadiness: TeamMigrationReadiness[] = [
  "completed",
  "not-needed",
  "pending",
  "ready",
];

const expectedFundingSummaryStates: TeamFundingSummaryState[] = [
  "fully-used",
  "has-claimable",
  "late-liquid-available",
  "no-approvals",
  "partially-claimed",
];

const expectedRegistryStatuses: TeamsRegistryStatus[] = [
  "active",
  "deprecated",
  "paused",
];

const expectedPeriodFinalizationStatuses: PeriodFinalizationStatus[] = [
  "finalized",
  "open",
  "ready",
];

const expectedBucketStatuses: BucketStatus[] = [
  "healthy",
  "limit-reached",
  "watch",
];

const expectedRevenueTokenStatuses: RevenueTokenAdminStatus[] = [
  "active",
  "paused",
];

function parseTeamsMockData(): TeamsMockExampleScenariosV1 {
  const value: unknown = mockData;
  assertTeamsMockExampleScenariosV1(value);
  return value;
}

function assertTeamsMockExampleScenariosV1(
  value: unknown
): asserts value is TeamsMockExampleScenariosV1 {
  assertRecord(value);
  expect(value.version).toBe(1);
  assertNumber(value.generatedAt);
  assertArray(value.scenarios);

  for (const scenario of value.scenarios) {
    assertRecord(scenario);
    expectOneOf(scenario.id, expectedScenarioIds);
    assertString(scenario.label);
    assertTeamsMockDataV1(scenario.data);
  }
}

function assertTeamsMockDataV1(value: unknown): asserts value is TeamsMockDataV1 {
  assertRecord(value);
  expect(value.version).toBe(1);
  assertNumber(value.generatedAt);
  assertNumber(value.currentPeriod);
  assertViewerContext(value.viewer);
  assertNullableString(value.selectedTeamId);
  assertTotals(value.totals);
  assertArray(value.teams);

  for (const team of value.teams) {
    assertTeamRecord(team);
  }

  if (value.admin !== undefined) {
    assertAdminRecord(value.admin);
  }
}

function assertViewerContext(value: unknown): void {
  assertRecord(value);
  expectOneOf(value.role, expectedViewerRoles);
  assertNullableString(value.address);
  assertNullableString(value.teamId);
  assertBoolean(value.canDepositRevenue);
  assertBoolean(value.canClaimFunding);
  assertBoolean(value.canReturnFunding);
  assertBoolean(value.canClaimBonus);
  assertBoolean(value.canUseAdmin);
}

function assertTotals(value: unknown): void {
  assertRecord(value);
  assertDecimalString(value.globalRevenueUsd);
  assertDecimalString(value.globalCostUsd);
  assertDecimalString(value.globalProfitUsd);
  assertDecimalString(value.globalLossUsd);
  assertNumber(value.activeTeamCount);
  assertNumber(value.retiringTeamCount);
  assertNumber(value.retiredTeamCount);
}

function assertTeamRecord(value: unknown): asserts value is TeamRecord {
  assertRecord(value);
  assertString(value.id);
  assertString(value.name);
  assertAddress(value.address);
  assertAddress(value.owner);
  assertNullableString(value.pendingOwner);
  expectOneOf(value.status, expectedLifecycleStatuses);
  assertNullableOneOf(value.readOnlyReason, expectedReadOnlyReasons);
  assertFinancials(value.currentPeriod);
  assertFinancials(value.lifetime);
  assertLifecycleState(value.lifecycle);
  assertArray(value.revenueOptions);
  assertArray(value.revenueHistory);
  assertFundingSummary(value.fundingSummary);
  assertArray(value.fundingApprovals);
  assertArray(value.fundingReturns);
  assertBonusState(value.bonus);

  for (const option of value.revenueOptions) {
    assertRevenueOption(option);
  }

  for (const entry of value.revenueHistory) {
    assertRevenueHistoryEntry(entry);
  }

  for (const approval of value.fundingApprovals) {
    assertFundingApproval(approval);
  }

  for (const entry of value.fundingReturns) {
    assertFundingReturnEntry(entry);
  }
}

function assertFinancials(value: unknown): void {
  assertRecord(value);
  assertDecimalString(value.revenueUsd);
  assertDecimalString(value.costUsd);
  assertDecimalString(value.profitUsd);
  assertDecimalString(value.lossUsd);
}

function assertLifecycleState(value: unknown): void {
  assertRecord(value);
  expectOneOf(value.migrationReadiness, expectedMigrationReadiness);
  assertNullableString(value.successorTeamId);
  assertNullableNumber(value.retirementAnnouncedAt);
  assertNullableNumber(value.retirementEffectivePeriod);
}

function assertRevenueOption(value: unknown): void {
  assertRecord(value);
  assertString(value.symbol);
  assertAddress(value.tokenAddress);
  assertNumber(value.decimals);
  assertBoolean(value.isConvertible);
  assertNullableString(value.convertToSymbol);
  assertDecimalString(value.oraclePriceUsd);
  assertDecimalString(value.previewAmount);
  assertDecimalString(value.estimatedCreditUsd);
}

function assertRevenueHistoryEntry(value: unknown): void {
  assertRecord(value);
  assertString(value.id);
  assertNumber(value.period);
  assertString(value.symbol);
  assertDecimalString(value.amount);
  assertDecimalString(value.creditedUsd);
  assertNullableString(value.convertedToSymbol);
  assertAddress(value.depositedBy);
  assertNumber(value.createdAt);
}

function assertFundingSummary(value: unknown): void {
  assertRecord(value);
  expectOneOf(value.state, expectedFundingSummaryStates);
  assertDecimalString(value.claimableUsd);
  assertDecimalString(value.refundableUsd);
}

function assertFundingApproval(value: unknown): void {
  assertRecord(value);
  assertString(value.id);
  assertNumber(value.idx);
  assertNumber(value.approvedPeriod);
  assertString(value.symbol);
  assertAddress(value.tokenAddress);
  assertDecimalString(value.totalApproved);
  assertDecimalString(value.used);
  assertDecimalString(value.claimable);
  assertNumber(value.streamDurationDays);
  expectOneOf(value.status, expectedFundingStatuses);
  assertNullableString(value.recipient);
  assertDecimalString(value.claimedCostUsd);
  assertDecimalString(value.refundValueUsd);
  assertNullableDecimalString(value.averageClaimPriceUsd);
}

function assertFundingReturnEntry(value: unknown): void {
  assertRecord(value);
  assertString(value.id);
  assertString(value.approvalId);
  assertNumber(value.period);
  assertString(value.symbol);
  assertDecimalString(value.amount);
  assertDecimalString(value.refundValueUsd);
  assertAddress(value.returnedBy);
  assertNumber(value.createdAt);
}

function assertBonusState(value: unknown): void {
  assertRecord(value);
  expect(value.tokenSymbol).toBe("YFI");
  expectOneOf(value.status, expectedBonusStatuses);
  assertDecimalString(value.totalClaimable);
  assertNumber(value.includedPeriodCount);
  assertArray(value.periods);

  for (const period of value.periods) {
    assertBonusPeriod(period);
  }
}

function assertBonusPeriod(value: unknown): void {
  assertRecord(value);
  assertNumber(value.period);
  expectOneOf(value.status, expectedBonusPeriodStatuses);
  assertBoolean(value.finalized);
  assertBoolean(value.claimed);
  assertDecimalString(value.profitUsd);
  assertDecimalString(value.spotPriceUsd);
  assertDecimalString(value.adjustedPriceUsd);
  assertNumber(value.growthFactorBps);
  assertNumber(value.ybcSplitBps);
  assertDecimalString(value.claimableYfi);
}

function assertAdminRecord(value: unknown): void {
  assertRecord(value);
  expectOneOf(value.registryStatus, expectedRegistryStatuses);
  expectOneOf(
    value.periodFinalizationStatus,
    expectedPeriodFinalizationStatuses
  );
  assertBucket(value.rewardsBucket);
  assertBucket(value.treasuryBucket);
  assertBucket(value.recoveryBucket);
  assertArray(value.whitelistedRevenueTokens);
  assertArray(value.fundingQueue);
  assertArray(value.bonusQueue);

  for (const token of value.whitelistedRevenueTokens) {
    assertRevenueTokenAdminRecord(token);
  }

  for (const entry of value.fundingQueue) {
    assertAdminFundingQueueEntry(entry);
  }

  for (const entry of value.bonusQueue) {
    assertAdminBonusQueueEntry(entry);
  }
}

function assertBucket(value: unknown): void {
  assertRecord(value);
  assertDecimalString(value.budget);
  assertDecimalString(value.used);
  assertDecimalString(value.remaining);
  expectOneOf(value.status, expectedBucketStatuses);
}

function assertRevenueTokenAdminRecord(value: unknown): void {
  assertRecord(value);
  assertString(value.symbol);
  assertAddress(value.tokenAddress);
  assertAddress(value.oracle);
  if (value.converter !== null) {
    assertAddress(value.converter);
  }
  expectOneOf(value.status, expectedRevenueTokenStatuses);
}

function assertAdminFundingQueueEntry(value: unknown): void {
  assertRecord(value);
  assertString(value.approvalId);
  assertString(value.teamId);
  expectOneOf(value.status, expectedFundingStatuses);
  assertBoolean(value.requiresOperatorAttention);
}

function assertAdminBonusQueueEntry(value: unknown): void {
  assertRecord(value);
  assertString(value.teamId);
  assertNumber(value.period);
  expectOneOf(value.status, expectedBonusPeriodStatuses);
  assertBoolean(value.requiresFinalization);
}

function assertString(value: unknown): asserts value is string {
  expect(typeof value).toBe("string");
}

function assertAddress(value: unknown): void {
  assertString(value);
  expect(value).toMatch(/^0x[a-fA-F0-9]{40}$/);
}

function assertDecimalString(value: unknown): asserts value is string {
  assertString(value);
  expect(value).toMatch(/^\d+(\.\d+)?$/);
}

function assertNullableDecimalString(value: unknown): void {
  if (value !== null) {
    assertDecimalString(value);
  }
}

function assertBoolean(value: unknown): asserts value is boolean {
  expect(typeof value).toBe("boolean");
}

function assertNumber(value: unknown): asserts value is number {
  expect(typeof value).toBe("number");
}

function assertNullableString(value: unknown): void {
  if (value !== null) {
    assertString(value);
  }
}

function assertNullableNumber(value: unknown): void {
  if (value !== null) {
    assertNumber(value);
  }
}

function assertNullableOneOf<T extends string>(
  value: unknown,
  allowedValues: readonly T[]
): void {
  if (value !== null) {
    expectOneOf(value, allowedValues);
  }
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected object record");
  }
}

function assertArray(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected array");
  }
}

function expectOneOf<T extends string>(
  value: unknown,
  allowedValues: readonly T[]
): asserts value is T {
  expect(typeof value).toBe("string");
  expect(allowedValues).toContain(value as T);
}

describe("Team Finances mock data contract", () => {
  it("binds the example JSON to the exported v1 TypeScript contract", () => {
    const teamsMockData = parseTeamsMockData();

    expect(teamsMockData.version).toBe(1);
    expect(teamsMockData.scenarios.map((scenario) => scenario.id)).toEqual(
      expectedScenarioIds
    );
  });

  it("covers the stable Teams scenario and status sets", () => {
    const teamsMockData = parseTeamsMockData();
    const fundingStatuses = new Set<FundingApprovalStatus>();
    const bonusStatuses = new Set<TeamBonusStatus>();
    const bonusPeriodStatuses = new Set<BonusPeriodStatus>();
    const lifecycleStatuses = new Set<TeamLifecycleStatus>();

    for (const scenario of teamsMockData.scenarios) {
      for (const team of scenario.data.teams) {
        lifecycleStatuses.add(team.status);
        bonusStatuses.add(team.bonus.status);

        for (const approval of team.fundingApprovals) {
          fundingStatuses.add(approval.status);
        }

        for (const period of team.bonus.periods) {
          bonusPeriodStatuses.add(period.status);
        }
      }
    }

    expect([...fundingStatuses].sort()).toEqual(expectedFundingStatuses);
    expect([...bonusStatuses].sort()).toEqual(expectedBonusStatuses);
    expect([...bonusPeriodStatuses].sort()).toEqual(
      expectedBonusPeriodStatuses
    );
    expect([...lifecycleStatuses].sort()).toEqual(expectedLifecycleStatuses);
  });

  it("keeps route-ready mock invariants explicit", () => {
    const teamsMockData = parseTeamsMockData();

    for (const scenario of teamsMockData.scenarios) {
      const teamIds = new Set(scenario.data.teams.map((team) => team.id));

      if (scenario.data.selectedTeamId) {
        expect(teamIds.has(scenario.data.selectedTeamId)).toBe(true);
      }

      for (const team of scenario.data.teams) {
        if (team.status === "retired") {
          expect(team.readOnlyReason).not.toBeNull();
        }

        for (const period of team.bonus.periods) {
          if (period.status === "pending-finalization") {
            expect(period.claimableYfi).toBe("0");
          }
        }
      }
    }
  });
});
