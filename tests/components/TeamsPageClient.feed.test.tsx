import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import { teamsCopy } from "@/app/teams/messages";
import { mapTeamsFeedToRuntimeState } from "@/lib/clients/teams";
import { TeamsFeedSchema, type TeamsFeed } from "@/lib/schemas/teams-feed";
import { renderWithProviders } from "@/tests/test-utils";

const { runtimeState } = vi.hoisted(() => ({
  runtimeState: {
    current: null as ReturnType<typeof mapTeamsFeedToRuntimeState> | null,
  },
}));

vi.mock("@/lib/hooks/useTeams", () => ({
  teamsKeys: {
    all: ["teams"] as const,
  },
  useTeamsDebugActions: () => ({
    replaceTeam: vi.fn(),
    setSelectedTeam: vi.fn(),
  }),
  useTeamsScenarioCatalog: () => ({
    data: [],
  }),
  useTeamsState: () => ({
    data: runtimeState.current
      ? {
          ...runtimeState.current,
          backend: "feed",
        }
      : null,
    error: null,
    isError: false,
    isLoading: runtimeState.current === null,
    isPending: runtimeState.current === null,
  }),
}));

vi.mock("@/lib/hooks/useTeamsWrites", () => ({
  useTeamsWrites: () => ({
    claimBonus: vi.fn(),
    claimFunding: vi.fn(),
    depositRevenue: vi.fn(),
    returnFunding: vi.fn(),
    state: { status: "idle" },
  }),
}));

vi.mock("@/lib/hooks/useTokenAllowance", () => ({
  useTokenAllowance: () => ({
    data: 0n,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useTokenApprove", () => ({
  useTokenApprove: () => ({
    isLoading: false,
    state: { status: "idle" },
    write: vi.fn(),
  }),
}));

function createFeedWithFinancialHistory(): TeamsFeed {
  const team = feedExample.teams[0]!;
  const currentPeriod = team.periods[0]!;
  const historicalPeriod = {
    ...currentPeriod,
    period: 1,
    startsAt: feedExample.periods.currentStartsAt - feedExample.periods.lengthSeconds,
    endsAt: feedExample.periods.currentStartsAt,
    financials: {
      revenueUsd: "100000000",
      costUsd: "30000000",
      profitUsd: "70000000",
      lossUsd: "0",
    },
    revenueDeposits: [],
    fundingApprovalIds: [],
    bonus: null,
  };
  const currentWithDistinctFinancials = {
    ...currentPeriod,
    financials: {
      revenueUsd: "125000000",
      costUsd: "50000000",
      profitUsd: "75000000",
      lossUsd: "0",
    },
  };
  const currentOnlyTeam = {
    ...team,
    index: 1,
    address: "0x4444444444444444444444444444444444444444",
    name: "Current Only",
    owner: "0x5555555555555555555555555555555555555555",
    periods: [
      {
        ...currentPeriod,
        financials: {
          revenueUsd: "7000000",
          costUsd: "3000000",
          profitUsd: "4000000",
          lossUsd: "0",
        },
        revenueDeposits: [],
        fundingApprovalIds: [],
        bonus: null,
      },
    ],
    lifetime: {
      revenueUsd: "7000000",
      costUsd: "3000000",
      profitUsd: "4000000",
      lossUsd: "0",
    },
  };

  return TeamsFeedSchema.parse({
    ...feedExample,
    periods: {
      ...feedExample.periods,
      indexed: [1, 2],
    },
    teams: [
      {
        ...team,
        periods: [historicalPeriod, currentWithDistinctFinancials],
        lifetime: {
          revenueUsd: "225000000",
          costUsd: "80000000",
          profitUsd: "145000000",
          lossUsd: "0",
        },
      },
      currentOnlyTeam,
    ],
    accountant: {
      ...feedExample.accountant,
      globalByPeriod: [
        {
          period: 1,
          financials: historicalPeriod.financials,
        },
        {
          period: 2,
          financials: currentWithDistinctFinancials.financials,
        },
      ],
      lifetime: {
        revenueUsd: "225000000",
        costUsd: "80000000",
        profitUsd: "145000000",
        lossUsd: "0",
      },
    },
    events: {
      ...feedExample.events,
      teamCount: 2,
    },
  });
}

describe("TeamsPageClient feed mode", () => {
  beforeEach(() => {
    const feed = createFeedWithFinancialHistory();
    runtimeState.current = mapTeamsFeedToRuntimeState(feed);
    window.history.replaceState(null, "", "/teams");
    window.localStorage.clear();
  });

  it("renders feed data without mock controls and opens a workspace locally", async () => {
    const { TeamsPageClient } = await import("@/app/teams/TeamsPageClient");
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />, { autoConnect: false });

    expect(screen.queryByRole("button", { name: /debug/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Example Team details" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("$125").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: "Open Example Team details" })
    );

    expect(
      await screen.findByRole("heading", { name: "Example Team", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: teamsCopy.workspace.financialHistory.title,
      })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(teamsCopy.directory.scope.periodLabel(1)).length
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Deposit unavailable" })).toBeDisabled();
  });

  it("switches directory financial scope between current, historical, and all-time values", async () => {
    const { TeamsPageClient } = await import("@/app/teams/TeamsPageClient");
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />, { autoConnect: false });

    await screen.findByRole("button", { name: "Open Example Team details" });

    let table = screen.getByRole("table");
    expect(screen.getByText("Current period #2 financials")).toBeInTheDocument();
    expect(within(table).getByText("$125")).toBeInTheDocument();

    await user.click(
      screen.getByRole("tab", {
        name: teamsCopy.directory.scope.lifetime,
      })
    );

    table = screen.getByRole("table");
    expect(screen.getByText("All-time financials")).toBeInTheDocument();
    expect(within(table).getByText("$225")).toBeInTheDocument();

    await user.click(
      screen.getByRole("tab", {
        name: teamsCopy.directory.scope.periodLabel(1),
      })
    );

    table = screen.getByRole("table");
    expect(screen.getByText("Period #1 financials")).toBeInTheDocument();
    expect(within(table).getByText("$100")).toBeInTheDocument();
    expect(
      within(table).getAllByText(
        teamsCopy.directory.scope.missingPeriodValue
      ).length
    ).toBeGreaterThan(0);
  });
});
