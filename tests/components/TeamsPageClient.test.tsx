import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsPageClient } from "@/app/teams/TeamsPageClient";
import { teamsCopy } from "@/app/teams/messages";
import { renderWithProviders } from "@/tests/test-utils";

describe("TeamsPageClient", () => {
  const directoryMixLabel = teamsCopy.controls.scenarioNames["directory-observer"];
  const bonusAvailableLabel = teamsCopy.controls.scenarioNames["bonus-available"];
  const retiredWorkspaceLabel =
    teamsCopy.controls.scenarioNames["retired-read-only"];
  const twoTeamSnapshotLabel =
    teamsCopy.controls.scenarioNames["operator-admin"];

  it("renders the Team Finances shell, directory states, and workspace cards", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    expect(
      screen.getByRole("heading", {
        name: teamsCopy.app.displayLabel,
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.app.routeKey)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.page.productionGate)).toBeInTheDocument();

    const openPlatformButton = await screen.findByRole("button", {
      name: "Open Platform workspace",
    });

    expect(screen.getByText("Retiring")).toBeInTheDocument();
    expect(screen.getByText("Retired")).toBeInTheDocument();

    await user.click(openPlatformButton);

    expect(
      await screen.findByRole("heading", { name: "Platform", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: teamsCopy.workspace.cards.current,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: teamsCopy.workspace.cards.lifetime,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: teamsCopy.bonus.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: teamsCopy.lifecycle.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.bonus.noPeriods)).toBeInTheDocument();
  });

  it("exposes deterministic loading and empty coverage through the prototype controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await screen.findByRole("button", { name: directoryMixLabel });
    expect(await screen.findByText("#4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Loading" }));
    expect(screen.getByText(teamsCopy.directory.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.loadingTitle)).toBeInTheDocument();
    expect(screen.queryByText("#4")).not.toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(5);

    await user.click(screen.getByRole("button", { name: "Empty" }));
    expect(screen.getByText(teamsCopy.directory.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.noTeamsTitle)).toBeInTheDocument();
    expect(screen.queryByText("#4")).not.toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(5);
  });

  it("resets workspace selection to the scenario default when switching scenarios", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: "Open Research workspace",
      })
    );
    expect(
      await screen.findByRole("heading", { name: "Research", level: 2 })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: twoTeamSnapshotLabel }));

    expect(
      await screen.findByRole("heading", { name: "Security", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Research", level: 2 })
    ).not.toBeInTheDocument();
  });

  it("shows claimable bonus detail and lifecycle state in the bonus scenario", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: bonusAvailableLabel,
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Platform", level: 2 })
    ).toBeInTheDocument();
    const bonusCard = document.getElementById("bonus");
    const lifecycleCard = document.getElementById("lifecycle");
    expect(bonusCard).not.toBeNull();
    expect(lifecycleCard).not.toBeNull();
    expect(within(bonusCard!).getAllByText("14.5 YFI").length).toBeGreaterThan(0);
    expect(within(bonusCard!).getByText("2 periods")).toBeInTheDocument();
    expect(within(bonusCard!).getByText("1 period")).toBeInTheDocument();
    expect(within(lifecycleCard!).getByText("No retirement scheduled")).toBeInTheDocument();
    expect(within(lifecycleCard!).getAllByText("No migration needed").length).toBeGreaterThan(0);

    await user.click(screen.getByText(teamsCopy.bonus.periodDetailSummary));

    expect(screen.getByText("Period 3")).toBeInTheDocument();
    expect(screen.getByText("Period 4")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: teamsCopy.bonus.mathTrigger })
    ).toHaveLength(2);
  });

  it("switches to the retired workspace scenario and keeps the read-only state visible", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: retiredWorkspaceLabel,
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Grants Archive", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Read-only after retirement").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Retired").length).toBeGreaterThan(0);
    const lifecycleCard = document.getElementById("lifecycle");
    expect(lifecycleCard).not.toBeNull();
    expect(within(lifecycleCard!).getAllByText("Migration completed").length).toBeGreaterThan(0);
  });
});
