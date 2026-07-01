import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import { mapTeamsFeedToPageData, mapTeamsFeedToRuntimeState } from "@/lib/clients/teams";
import { TeamsFeedSchema, type TeamsFeed } from "@/lib/schemas/teams-feed";

function parseFeed(value: unknown): TeamsFeed {
  return TeamsFeedSchema.parse(value);
}

describe("Teams feed mapper", () => {
  it("maps a feed into the existing observer page state", () => {
    const data = mapTeamsFeedToPageData(parseFeed(feedExample));
    const team = data.teams[0]!;

    expect(data.currentPeriod).toBe(2);
    expect(data.viewer.role).toBe("observer");
    expect(data.viewer.canDepositRevenue).toBe(false);
    expect(data.selectedTeamId).toBe("example-team");
    expect(data.totals.activeTeamCount).toBe(1);
    expect(data.totals.currentPeriod.revenueUsd).toBe("125");
    expect(team.currentPeriod.profitUsd).toBe("75");
    expect(team.revenueHistory[0]).toEqual(
      expect.objectContaining({
        amount: "125",
        creditedUsd: "125",
        symbol: "USDC",
      })
    );
  });

  it("overlays the connected team owner perspective without enabling writes", () => {
    const data = mapTeamsFeedToPageData(
      parseFeed(feedExample),
      "0x2222222222222222222222222222222222222222"
    );

    expect(data.viewer.role).toBe("team-owner");
    expect(data.viewer.teamId).toBe("example-team");
    expect(data.viewer.canDepositRevenue).toBe(false);
    expect(data.viewer.canClaimFunding).toBe(false);
    expect(data.viewer.canClaimBonus).toBe(false);
  });

  it("maps funding approvals and bonus periods from base-unit feed values", () => {
    const data = mapTeamsFeedToPageData(parseFeed(feedExample));
    const team = data.teams[0]!;
    const approval = team.fundingApprovals[0]!;
    const bonusPeriod = team.bonus.periods[0]!;

    expect(approval.totalApproved).toBe("50");
    expect(approval.claimable).toBe("50");
    expect(approval.status).toBe("claimable-current-period");
    expect(team.fundingSummary.claimableUsd).toBe("50.00");
    expect(data.admin?.fundingQueue[0]?.teamId).toBe("example-team");
    expect(team.bonus.status).toBe("claimable");
    expect(team.bonus.totalClaimable).toBe("1");
    expect(bonusPeriod.claimableYfi).toBe("1");
    expect(bonusPeriod.spotPriceUsd).toBe("7500");
    expect(bonusPeriod.ybcSplitBps).toBe(1000);
  });

  it("maps operator access and empty feed runtime safely", () => {
    const feed = parseFeed({
      ...feedExample,
      revenueRecipient: {
        ...feedExample.revenueRecipient,
        operator: "0x9999999999999999999999999999999999999999",
      },
    });
    const data = mapTeamsFeedToPageData(
      feed,
      "0x9999999999999999999999999999999999999999"
    );

    expect(data.viewer.role).toBe("operator-admin");
    expect(data.viewer.canUseAdmin).toBe(true);
    expect(data.admin?.whitelistedRevenueTokens[0]?.symbol).toBe("USDC");

    const emptyRuntime = mapTeamsFeedToRuntimeState({
      ...feed,
      teams: [],
      accountant: {
        ...feed.accountant,
        lifetime: {
          revenueUsd: "0",
          costUsd: "0",
          profitUsd: "0",
          lossUsd: "0",
        },
      },
      events: {
        ...feed.events,
        teamCount: 0,
      },
    });
    expect(emptyRuntime.isEmpty).toBe(true);
    expect(emptyRuntime.data.teams).toEqual([]);
  });
});
