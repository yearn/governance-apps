import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceMockTeamsTime,
  applyMockTeamsFundingClaim,
  applyMockTeamsFundingReturn,
  createMockTeamsClient,
  deriveTeamsViewerForTeam,
  getMockTeamsRuntimeState,
  patchMockTeamsFundingApproval,
  patchMockTeamsTeam,
  resetMockTeamsStore,
  resolveSelectedTeam,
  resolveTeamsFundingUnitPriceDecimalUsd,
  setMockTeamsCurrentPeriod,
  setMockTeamsNow,
  setMockTeamsPreset,
  setMockTeamsViewerRole,
} from "@/lib/clients/teams";
import { setFixedNow } from "@/lib/mocks/time";

const SECONDS_PER_DAY = 24 * 60 * 60;

describe("MockTeamsClient", () => {
  beforeEach(() => {
    resetMockTeamsStore();
  });

  it("lists the stable scenario catalog order", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });

    const catalog = await client.listScenarioCatalog();

    expect(catalog.map((entry) => entry.id)).toEqual([
      "directory-observer",
      "team-owner-funding",
      "bonus-available",
      "finance-operator-revenue",
      "retired-read-only",
      "operator-admin",
    ]);
  });

  it("returns cloned scenario payloads so local UI state cannot mutate the source data", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });

    const firstScenario = await client.getScenario("directory-observer");
    firstScenario.data.teams[0].name = "Changed";

    const secondScenario = await client.getScenario("directory-observer");

    expect(secondScenario.data.teams[0].name).toBe("Platform");
    expect(secondScenario.data.financialData).toMatchObject({
      status: "available",
      source: "mock",
    });
  });

  it("resolves the selected team from scenario defaults or explicit team ids", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");

    expect(resolveSelectedTeam(scenario.data)?.id).toBe("security");
    expect(resolveSelectedTeam(scenario.data, "security")?.name).toBe("Security");
    expect(resolveSelectedTeam(scenario.data, "does-not-exist")).toBeNull();
  });

  it("applies a mock funding claim without inventing a USD quote", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");

    expect(team).not.toBeNull();

    const updatedTeam = applyMockTeamsFundingClaim(
      team!,
      {
        approvalId: "approval-security-23",
        amount: "1.25",
        recipient: "0xcccc000000000000000000000000000000000099",
      },
      scenario.data.currentPeriod
    );
    const updatedApproval = updatedTeam.fundingApprovals.find(
      (approval) => approval.id === "approval-security-23"
    );

    expect(updatedApproval).toMatchObject({
      used: "1.25",
      claimable: "1.25",
      usedRaw: "1250000000000000000",
      claimableRaw: "1250000000000000000",
      claimedRaw: "1250000000000000000",
      returnableRaw: "1250000000000000000",
      status: "partially-claimed",
      recipient: "0xcccc000000000000000000000000000000000099",
      claimedCostUsd: null,
      refundValueUsd: null,
    });
    expect(updatedTeam.fundingSummary.claimableUsd).toBeNull();
    expect(updatedTeam.fundingSummary.refundableUsd).toBeNull();
  });

  it("rejects expired mock funding claims", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");

    expect(() =>
      applyMockTeamsFundingClaim(
        team!,
        {
          approvalId: "approval-security-21",
          amount: "1",
          recipient: "0xcccc000000000000000000000000000000000099",
        },
        scenario.data.currentPeriod
      )
    ).toThrow("Only a current-period approval can be claimed.");
  });

  it("applies a mock funding return without reopening claimable balance", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");

    expect(team).not.toBeNull();

    const updatedTeam = applyMockTeamsFundingReturn(team!, {
      approvalId: "approval-security-22",
      amount: "1000",
      returnedBy: "0xaaaa000000000000000000000000000000000002",
      currentPeriod: scenario.data.currentPeriod,
      createdAt: 1776200500,
    });
    const updatedApproval = updatedTeam.fundingApprovals.find(
      (approval) => approval.id === "approval-security-22"
    );

    expect(updatedApproval).toMatchObject({
      used: "18000",
      claimable: "32000",
      returnedRaw: "3500000000",
      returnableRaw: "14500000000",
      status: "partially-claimed",
      claimedCostUsd: "14500.00",
      refundValueUsd: "14500.00",
    });
    expect(updatedTeam.fundingSummary.claimableUsd).toBeNull();
    expect(updatedTeam.fundingSummary.refundableUsd).toBe("14500.00");
    expect(updatedTeam.fundingReturns[0]).toMatchObject({
      approvalId: "approval-security-22",
      amount: "1000",
      refundValueUsd: "1000.00",
      createdAt: 1776200500,
    });
  });

  it("uses prior raw returns when enforcing the remaining return maximum", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");

    expect(team).not.toBeNull();

    expect(() =>
      applyMockTeamsFundingReturn(team!, {
        approvalId: "approval-security-22",
        amount: "15500.000001",
        returnedBy: "0xaaaa000000000000000000000000000000000002",
        currentPeriod: scenario.data.currentPeriod,
      })
    ).toThrow("Return amount exceeds the outstanding token balance.");

    const fullyReturnedTeam = applyMockTeamsFundingReturn(team!, {
      approvalId: "approval-security-22",
      amount: "15500",
      returnedBy: "0xaaaa000000000000000000000000000000000002",
      currentPeriod: scenario.data.currentPeriod,
    });
    expect(
      fullyReturnedTeam.fundingApprovals.find(
        (approval) => approval.id === "approval-security-22"
      )?.returnableRaw
    ).toBe("0");
  });

  it("keeps one aggregate return selector for sibling approvals in the same cost bucket", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");
    const selector = team?.fundingApprovals.find(
      (approval) => approval.id === "approval-security-22"
    );

    expect(team).not.toBeNull();
    expect(selector).toBeDefined();

    const sibling = {
      ...selector!,
      id: "approval-security-99",
      idx: 99,
      usedRaw: "1000000000",
      claimableRaw: "49000000000",
      claimedRaw: "1000000000",
      returnedRaw: "2000000000",
      returnableRaw: "0",
      used: "1000",
      claimable: "49000",
      claimedCostUsd: "0.00",
      refundValueUsd: "0.00",
    };
    const bucketTeam = {
      ...team!,
      fundingApprovals: team!.fundingApprovals.map((approval) =>
        approval.id === selector!.id
          ? { ...approval, returnableRaw: "14500000000" }
          : approval
      ).concat(sibling),
    };

    const updatedTeam = applyMockTeamsFundingReturn(bucketTeam, {
      approvalId: selector!.id,
      amount: "1000",
      returnedBy: "0xaaaa000000000000000000000000000000000002",
      currentPeriod: scenario.data.currentPeriod,
    });
    const updatedSelector = updatedTeam.fundingApprovals.find(
      (approval) => approval.id === selector!.id
    );
    const updatedSibling = updatedTeam.fundingApprovals.find(
      (approval) => approval.id === sibling.id
    );

    expect(updatedSelector?.returnableRaw).toBe("13500000000");
    expect(updatedSibling).toMatchObject({
      returnedRaw: "2000000000",
      returnableRaw: "0",
    });
    expect(() =>
      applyMockTeamsFundingReturn(bucketTeam, {
        approvalId: sibling.id,
        amount: "1",
        returnedBy: "0xaaaa000000000000000000000000000000000002",
        currentPeriod: scenario.data.currentPeriod,
      })
    ).toThrow("Approval has no refundable funding");
  });

  it("does not infer a one-dollar price from a stable-looking symbol", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("finance-operator-revenue");
    const team = resolveSelectedTeam(scenario.data, "platform");

    expect(team).not.toBeNull();

    const approval = team!.fundingApprovals.find(
      (candidate) => candidate.id === "approval-platform-30"
    );

    expect(approval).toBeDefined();
    expect(resolveTeamsFundingUnitPriceDecimalUsd(approval!)).toBeNull();
  });

  it("bootstraps runtime presets, role changes, and admin visibility from the shared store", async () => {
    setMockTeamsPreset("operator-admin");
    setMockTeamsViewerRole("operator-admin");

    const runtime = getMockTeamsRuntimeState();

    expect(runtime.presetId).toBe("operator-admin");
    expect(runtime.data.viewer.role).toBe("operator-admin");
    expect(runtime.data.viewer.canUseAdmin).toBe(true);
    expect(runtime.data.admin).toBeDefined();
    expect(runtime.data.selectedTeamId).toBe("security");
  });

  it("tracks manual periods and shared time travel inside the runtime state", async () => {
    setMockTeamsCurrentPeriod(6);
    advanceMockTeamsTime(7);

    expect(getMockTeamsRuntimeState().data.currentPeriod).toBe(7);

    resetMockTeamsStore();
    expect(getMockTeamsRuntimeState().data.currentPeriod).toBe(4);
  });

  it("reclassifies mock approvals when the current period changes", () => {
    setMockTeamsPreset("team-owner-funding");
    setMockTeamsCurrentPeriod(5);

    const runtime = getMockTeamsRuntimeState();
    const team = resolveSelectedTeam(runtime.data, "security");
    const expired = team?.fundingApprovals.find(
      (approval) => approval.id === "approval-security-22"
    );
    const newlyCurrent = team?.fundingApprovals.find(
      (approval) => approval.id === "approval-security-24"
    );

    expect(expired).toMatchObject({
      status: "expired",
      claimableRaw: "0",
    });
    expect(newlyCurrent).toMatchObject({
      status: "claimable-current-period",
      claimableRaw: "18000000000",
    });
  });

  it("keeps inactive current funding explicit while preserving permissionless returns", () => {
    setMockTeamsPreset("team-owner-funding");
    patchMockTeamsTeam("security", {
      status: "retired",
      readOnlyReason: "retired",
    });

    const runtime = getMockTeamsRuntimeState();
    const team = resolveSelectedTeam(runtime.data, "security")!;
    const approval = team.fundingApprovals.find(
      (candidate) => candidate.id === "approval-security-22"
    );
    const viewer = deriveTeamsViewerForTeam(
      runtime.data.viewer,
      team,
      runtime.data.currentPeriod
    );

    expect(approval).toMatchObject({
      status: "current-unavailable",
      claimableRaw: "0",
      returnableRaw: "15500000000",
    });
    expect(team.fundingSummary.state).toBe("current-unavailable");
    expect(viewer.canClaimFunding).toBe(false);
    expect(viewer.canReturnFunding).toBe(true);
  });

  it("advances the displayed period on the first setNow call after reset", () => {
    const start = 1_725_000_000;

    setFixedNow(start);
    resetMockTeamsStore();
    setMockTeamsNow(start + 14 * SECONDS_PER_DAY);

    const runtime = getMockTeamsRuntimeState();

    expect(runtime.timeTravelDays).toBe(14);
    expect(runtime.data.currentPeriod).toBe(6);
  });

  it("keeps the Teams clock aligned when shared time travel is followed by setNow", () => {
    const start = 1_725_000_000;

    setFixedNow(start);
    resetMockTeamsStore();

    const sharedTimeTravelTarget = start + 7 * SECONDS_PER_DAY;
    setFixedNow(sharedTimeTravelTarget);
    setMockTeamsNow(sharedTimeTravelTarget);

    let runtime = getMockTeamsRuntimeState();
    expect(runtime.currentTimeSeconds).toBe(sharedTimeTravelTarget);
    expect(runtime.timeTravelDays).toBe(7);
    expect(runtime.data.currentPeriod).toBe(5);

    const laterBridgeTarget = start + 21 * SECONDS_PER_DAY;
    setMockTeamsNow(laterBridgeTarget);

    runtime = getMockTeamsRuntimeState();
    expect(runtime.currentTimeSeconds).toBe(laterBridgeTarget);
    expect(runtime.timeTravelDays).toBe(21);
    expect(runtime.data.currentPeriod).toBe(7);
  });

  it("reconciles funding summary totals when approval patches mutate the shared runtime", async () => {
    setMockTeamsPreset("team-owner-funding");

    patchMockTeamsFundingApproval("approval-security-22", {
      used: "50000",
      refundValueUsd: "0.00",
    });

    const runtime = getMockTeamsRuntimeState();
    const security = resolveSelectedTeam(runtime.data, "security");

    expect(security).not.toBeNull();
    expect(
      security?.fundingApprovals.find((approval) => approval.id === "approval-security-22")
    ).toMatchObject({
      claimable: "0",
      used: "50000",
      status: "fully-used",
    });
    expect(security?.fundingSummary.claimableUsd).toBeNull();
  });

  it("preserves sub-display-precision raw amounts through claim and return", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");
    const sourceApproval = team?.fundingApprovals.find(
      (approval) => approval.id === "approval-security-23"
    );

    expect(team).not.toBeNull();
    expect(sourceApproval).toBeDefined();

    const dustApproval = {
      ...sourceApproval!,
      amountRaw: "1",
      usedRaw: "0",
      claimableRaw: "1",
      claimedRaw: "0",
      returnedRaw: "0",
      returnableRaw: "0",
      totalApproved: "0",
      used: "0",
      claimable: "0",
      status: "claimable-current-period" as const,
    };
    const dustTeam = {
      ...team!,
      fundingApprovals: team!.fundingApprovals.map((approval) =>
        approval.id === dustApproval.id ? dustApproval : approval
      ),
    };
    const claimedTeam = applyMockTeamsFundingClaim(
      dustTeam,
      {
        approvalId: dustApproval.id,
        amount: "0.000000000000000001",
        recipient: "0xcccc000000000000000000000000000000000099",
      },
      scenario.data.currentPeriod
    );
    const claimedApproval = claimedTeam.fundingApprovals.find(
      (approval) => approval.id === dustApproval.id
    );

    expect(claimedApproval).toMatchObject({
      used: "0.000000000000000001",
      claimable: "0",
      usedRaw: "1",
      claimableRaw: "0",
      returnableRaw: "1",
    });

    const returnedTeam = applyMockTeamsFundingReturn(claimedTeam, {
      approvalId: dustApproval.id,
      amount: "0.000000000000000001",
      returnedBy: "0xaaaa000000000000000000000000000000000002",
      currentPeriod: scenario.data.currentPeriod,
    });
    expect(
      returnedTeam.fundingApprovals.find(
        (approval) => approval.id === dustApproval.id
      )
    ).toMatchObject({
      returnedRaw: "1",
      returnableRaw: "0",
    });
  });

  it("rejects returns from an approval outside the current period", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");

    expect(() =>
      applyMockTeamsFundingReturn(team!, {
        approvalId: "approval-security-21",
        amount: "1",
        returnedBy: "0xaaaa000000000000000000000000000000000002",
        currentPeriod: scenario.data.currentPeriod,
      })
    ).toThrow("Approval has no refundable funding");
  });
});
