import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceMockTeamsTime,
  applyMockTeamsFundingClaim,
  applyMockTeamsFundingReturn,
  createMockTeamsClient,
  getMockTeamsRuntimeState,
  patchMockTeamsFundingApproval,
  resetMockTeamsStore,
  resolveSelectedTeam,
  resolveTeamsFundingUnitPriceUsd,
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
  });

  it("resolves the selected team from scenario defaults or explicit team ids", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");

    expect(resolveSelectedTeam(scenario.data)?.id).toBe("security");
    expect(resolveSelectedTeam(scenario.data, "security")?.name).toBe("Security");
    expect(resolveSelectedTeam(scenario.data, "does-not-exist")).toBeNull();
  });

  it("applies a mock funding claim and preserves USD summary reconciliation for non-stable approvals", async () => {
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
      status: "partially-claimed",
      recipient: "0xcccc000000000000000000000000000000000099",
    });
    expect(updatedTeam.fundingSummary.claimableUsd).toBe("43000.00");
    expect(updatedTeam.fundingSummary.refundableUsd).toBe("27000.00");
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
      status: "partially-claimed",
      claimedCostUsd: "17000.00",
      refundValueUsd: "17000.00",
    });
    expect(updatedTeam.fundingSummary.claimableUsd).toBe("43000.00");
    expect(updatedTeam.fundingSummary.refundableUsd).toBe("26000.00");
    expect(updatedTeam.fundingReturns[0]).toMatchObject({
      approvalId: "approval-security-22",
      amount: "1000",
      refundValueUsd: "1000.00",
      createdAt: 1776200500,
    });
  });

  it("rejects a mock funding return above remaining refundable value", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");
    const team = resolveSelectedTeam(scenario.data, "security");

    expect(team).not.toBeNull();

    const partiallyReturnedTeam = applyMockTeamsFundingReturn(team!, {
      approvalId: "approval-security-22",
      amount: "17999",
      returnedBy: "0xaaaa000000000000000000000000000000000002",
      currentPeriod: scenario.data.currentPeriod,
    });

    expect(() =>
      applyMockTeamsFundingReturn(partiallyReturnedTeam, {
        approvalId: "approval-security-22",
        amount: "2",
        returnedBy: "0xaaaa000000000000000000000000000000000002",
        currentPeriod: scenario.data.currentPeriod,
      })
    ).toThrow("Return amount exceeds the refundable value.");
  });

  it("reuses the same funding unit price fallback for UI estimates and mock accounting", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("finance-operator-revenue");
    const team = resolveSelectedTeam(scenario.data, "platform");

    expect(team).not.toBeNull();

    const approval = team!.fundingApprovals.find(
      (candidate) => candidate.id === "approval-platform-30"
    );

    expect(approval).toBeDefined();
    expect(resolveTeamsFundingUnitPriceUsd(approval!)).toBe(1);
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
      claimable: "0",
      status: "fully-used",
      refundValueUsd: "0.00",
    });

    const runtime = getMockTeamsRuntimeState();
    const security = resolveSelectedTeam(runtime.data, "security");

    expect(security).not.toBeNull();
    expect(
      security?.fundingApprovals.find((approval) => approval.id === "approval-security-22")
    ).toMatchObject({
      claimable: "0",
      status: "fully-used",
    });
    expect(security?.fundingSummary.claimableUsd).toBe("11000.00");
  });
});
