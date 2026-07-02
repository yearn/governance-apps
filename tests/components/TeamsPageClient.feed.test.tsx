import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import { mapTeamsFeedToRuntimeState } from "@/lib/clients/teams";
import { TeamsFeedSchema } from "@/lib/schemas/teams-feed";

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

describe("TeamsPageClient feed mode", () => {
  beforeEach(() => {
    const feed = TeamsFeedSchema.parse(feedExample);
    runtimeState.current = mapTeamsFeedToRuntimeState(feed);
    window.history.replaceState(null, "", "/teams");
  });

  it("renders feed data without mock controls and opens a workspace locally", async () => {
    const { TeamsPageClient } = await import("@/app/teams/TeamsPageClient");
    const user = userEvent.setup();

    render(<TeamsPageClient />);

    expect(screen.queryByRole("button", { name: /debug/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Example Team workspace" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("$125").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: "Open Example Team workspace" })
    );

    expect(
      await screen.findByRole("heading", { name: "Example Team", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deposit unavailable" })).toBeDisabled();
  });
});
