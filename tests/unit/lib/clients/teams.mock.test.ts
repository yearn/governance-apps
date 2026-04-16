import { describe, expect, it } from "vitest";
import {
  applyMockTeamsFundingClaim,
  applyMockTeamsFundingReturn,
  createMockTeamsClient,
  resolveSelectedTeam,
} from "@/lib/clients/teams";

describe("MockTeamsClient", () => {
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

  it("applies a mock funding return, reopens claimable balance, and records history", async () => {
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
      used: "17000",
      claimable: "33000",
      status: "partially-claimed",
      claimedCostUsd: "17000.00",
      refundValueUsd: "17000.00",
    });
    expect(updatedTeam.fundingSummary.claimableUsd).toBe("44000.00");
    expect(updatedTeam.fundingSummary.refundableUsd).toBe("26000.00");
    expect(updatedTeam.fundingReturns[0]).toMatchObject({
      approvalId: "approval-security-22",
      amount: "1000",
      refundValueUsd: "1000.00",
      createdAt: 1776200500,
    });
  });
});
