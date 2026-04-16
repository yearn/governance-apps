import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsPageClient } from "@/app/teams/TeamsPageClient";
import { teamsCopy } from "@/app/teams/messages";
import { renderWithProviders } from "@/tests/test-utils";

describe("TeamsPageClient", () => {
  it("renders the Team Finances shell, directory states, and overview cards", async () => {
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
  });

  it("exposes deterministic loading and empty coverage through the prototype controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await screen.findByRole("button", {
      name: "Observer directory with active, retiring, and retired teams",
    });

    await user.click(screen.getByRole("button", { name: "Loading" }));
    expect(screen.getByText(teamsCopy.directory.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.loadingTitle)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Empty" }));
    expect(screen.getByText(teamsCopy.directory.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.noTeamsTitle)).toBeInTheDocument();
  });

  it("switches to the retired workspace scenario and keeps the read-only state visible", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: "Retired team workspace in read-only mode",
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Grants Archive", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText("Read-only after retirement")).toBeInTheDocument();
    expect(screen.getAllByText("Retired").length).toBeGreaterThan(0);
  });
});
