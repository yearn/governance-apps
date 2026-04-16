import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsPageClient } from "@/app/teams/TeamsPageClient";
import { teamsCopy } from "@/app/teams/messages";
import { renderWithProviders } from "@/tests/test-utils";

describe("TeamsPageClient", () => {
  const directoryMixLabel = teamsCopy.controls.scenarioNames["directory-observer"];
  const bonusAvailableLabel = teamsCopy.controls.scenarioNames["bonus-available"];
  const operatorWorkspaceLabel =
    teamsCopy.controls.scenarioNames["finance-operator-revenue"];
  const retiredWorkspaceLabel =
    teamsCopy.controls.scenarioNames["retired-read-only"];
  const twoTeamSnapshotLabel = teamsCopy.controls.scenarioNames["operator-admin"];

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
    const bonusSection = document.getElementById("bonus");
    const lifecycleSection = document.getElementById("lifecycle");

    expect(bonusSection).not.toBeNull();
    expect(lifecycleSection).not.toBeNull();
    expect(
      within(bonusSection!).getByRole("heading", {
        name: teamsCopy.bonus.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      within(lifecycleSection!).getByRole("heading", {
        name: teamsCopy.lifecycle.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      within(bonusSection!).getByText(teamsCopy.bonus.placeholders.unselected)
    ).toBeInTheDocument();
    expect(
      within(lifecycleSection!).getByText(teamsCopy.lifecycle.placeholders.unselected)
    ).toBeInTheDocument();

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
    expect(
      screen.getByRole("button", {
        name: teamsCopy.bonus.action.noneCta,
      })
    ).toBeDisabled();
    expect(document.querySelectorAll("#lifecycle")).toHaveLength(1);
  });

  it("exposes deterministic loading and empty coverage through the prototype controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await screen.findByRole("button", { name: directoryMixLabel });
    expect(await screen.findByText("#4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Loading" }));
    expect(screen.getByText(teamsCopy.directory.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.loadingTitle)).toBeInTheDocument();
    expect(document.getElementById("bonus")).not.toBeNull();
    expect(document.getElementById("lifecycle")).not.toBeNull();
    expect(screen.queryByText("#4")).not.toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(5);

    await user.click(screen.getByRole("button", { name: "Empty" }));
    expect(screen.getByText(teamsCopy.directory.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.noTeamsTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.bonus.placeholders.empty)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.lifecycle.placeholders.empty)).toBeInTheDocument();
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
    const claimButton = within(bonusCard!).getByRole("button", {
      name: teamsCopy.bonus.action.claimCta,
    });
    expect(claimButton).toBeEnabled();
    expect(within(lifecycleCard!).getByText("No retirement scheduled")).toBeInTheDocument();
    expect(within(lifecycleCard!).getAllByText("No migration needed").length).toBeGreaterThan(0);

    await user.click(claimButton);

    expect(
      within(bonusCard!).getByRole("button", {
        name: teamsCopy.bonus.action.stagedCta,
      })
    ).toBeDisabled();
    expect(within(bonusCard!).getByText(teamsCopy.bonus.action.stagedBody)).toBeInTheDocument();

    await user.click(screen.getByText(teamsCopy.bonus.periodDetailSummary));

    expect(screen.getByText("Period 3")).toBeInTheDocument();
    expect(screen.getByText("Period 4")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: teamsCopy.bonus.mathTrigger })
    ).toHaveLength(2);
  });

  it("resets the staged mock bonus action when the same team fixture changes", async () => {
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

    const bonusSection = document.getElementById("bonus");
    expect(bonusSection).not.toBeNull();

    await user.click(
      within(bonusSection!).getByRole("button", {
        name: teamsCopy.bonus.action.claimCta,
      })
    );

    expect(
      within(bonusSection!).getByRole("button", {
        name: teamsCopy.bonus.action.stagedCta,
      })
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: operatorWorkspaceLabel,
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Platform", level: 2 })
    ).toBeInTheDocument();
    expect(
      within(bonusSection!).queryByRole("button", {
        name: teamsCopy.bonus.action.stagedCta,
      })
    ).not.toBeInTheDocument();
    expect(
      within(bonusSection!).getByRole("button", {
        name: teamsCopy.bonus.action.noneCta,
      })
    ).toBeDisabled();
    expect(within(bonusSection!).getByText(teamsCopy.bonus.action.noneBody)).toBeInTheDocument();
  });

  it("covers claimed and pending-finalization bonus states in the operator scenario", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: twoTeamSnapshotLabel,
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Security", level: 2 })
    ).toBeInTheDocument();
    const bonusSection = document.getElementById("bonus");
    expect(bonusSection).not.toBeNull();
    expect(
      within(bonusSection!).getByRole("button", {
        name: teamsCopy.bonus.action.claimedCta,
      })
    ).toBeDisabled();
    expect(within(bonusSection!).getByText(teamsCopy.bonus.action.claimedBody)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Open Research workspace",
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Research", level: 2 })
    ).toBeInTheDocument();
    expect(
      within(bonusSection!).getByRole("button", {
        name: teamsCopy.bonus.action.pendingCta,
      })
    ).toBeDisabled();
    expect(within(bonusSection!).getByText(teamsCopy.bonus.action.pendingBody)).toBeInTheDocument();
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
