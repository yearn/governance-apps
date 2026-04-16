import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsPageClient } from "@/app/teams/TeamsPageClient";
import { teamsCopy } from "@/app/teams/messages";
import { renderWithProviders } from "@/tests/test-utils";

describe("TeamsPageClient", () => {
  const directoryMixLabel = teamsCopy.controls.scenarioNames["directory-observer"];
  const revenueWorkspaceLabel =
    teamsCopy.controls.scenarioNames["finance-operator-revenue"];
  const ownerWorkspaceLabel = teamsCopy.controls.scenarioNames["team-owner-funding"];
  const retiredWorkspaceLabel =
    teamsCopy.controls.scenarioNames["retired-read-only"];
  const twoTeamSnapshotLabel =
    teamsCopy.controls.scenarioNames["operator-admin"];

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
    expect(
      screen.getByRole("heading", { name: teamsCopy.revenue.title, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenue" })).toHaveAttribute(
      "href",
      "#revenue"
    );
  });

  it("exposes deterministic loading and empty coverage through the prototype controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await screen.findByRole("button", { name: directoryMixLabel });
    expect(await screen.findByText("#4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Loading" }));
    expect(screen.getByText(teamsCopy.directory.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.revenue.loadingTitle)).toBeInTheDocument();
    expect(screen.queryByText("#4")).not.toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(5);

    await user.click(screen.getByRole("button", { name: "Empty" }));
    expect(screen.getByText(teamsCopy.directory.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.noTeamsTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.revenue.emptyTitle)).toBeInTheDocument();
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

  it("switches to the retired workspace scenario and keeps the read-only deposit blocker visible", async () => {
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
    expect(screen.getByText("Read-only after retirement")).toBeInTheDocument();
    expect(screen.getAllByText("Retired").length).toBeGreaterThan(0);
    expect(
      screen.getByText(teamsCopy.revenue.unavailable.readOnlyBody)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(teamsCopy.revenue.unavailable.viewerBody)
    ).not.toBeInTheDocument();
  });

  it("renders the revenue preview, validation, and success state for the revenue scenario", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: revenueWorkspaceLabel,
      })
    );

    expect(
      await screen.findByRole("heading", { name: teamsCopy.revenue.title, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.revenue.permissionless.title)).toBeInTheDocument();
    expect(screen.getAllByText("$9,985.40").length).toBeGreaterThan(0);

    const amountInput = screen.getByRole("textbox", {
      name: teamsCopy.revenue.form.amountLabel,
    });

    await user.clear(amountInput);
    await user.click(
      screen.getByRole("button", { name: teamsCopy.revenue.form.submit })
    );

    expect(screen.getByText(teamsCopy.revenue.form.amountError)).toBeInTheDocument();

    await user.type(amountInput, "2500");
    await user.click(
      screen.getByRole("button", { name: teamsCopy.revenue.form.submit })
    );

    expect(screen.getByText(teamsCopy.revenue.success.title)).toBeInTheDocument();
    expect(screen.getByText(/Current period #4:/)).toBeInTheDocument();
    expect(screen.getAllByText("$2,496.35").length).toBeGreaterThan(0);
  });

  it("shows the explicit empty history state when the selected team has no deposits yet", async () => {
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
    expect(screen.getByText(teamsCopy.revenue.history.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.revenue.history.emptyBody)).toBeInTheDocument();
  });

  it("renders funding approval states and separate claim and return flows for the owner scenario", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: ownerWorkspaceLabel,
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: teamsCopy.funding.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.funding.headers.token)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.funding.headers.totalApproved)).toBeInTheDocument();
    expect(screen.getAllByText("Current period #4 claimable now").length).toBeGreaterThan(0);
    expect(screen.getByText("Period #3 late-claim window")).toBeInTheDocument();
    expect(screen.getByText("Queued for period #5")).toBeInTheDocument();
    expect(screen.getByText("Late liquid")).toBeInTheDocument();
    expect(screen.getByText("50,000 USDC")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: teamsCopy.funding.claimForm.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: teamsCopy.funding.returnForm.title,
        level: 3,
      })
    ).toBeInTheDocument();
  });

  it("validates and completes the mock funding claim flow", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: ownerWorkspaceLabel,
      })
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Use approval-security-23 in claim flow",
      })
    );

    const recipientInput = screen.getByLabelText(teamsCopy.funding.claimForm.recipient);
    const claimAmountInput = screen.getByLabelText(teamsCopy.funding.claimForm.amount);

    await user.clear(recipientInput);
    await user.clear(claimAmountInput);
    await user.type(claimAmountInput, "1.25");
    await user.click(
      screen.getByRole("button", {
        name: teamsCopy.funding.claimForm.submit,
      })
    );

    expect(
      screen.getByText(teamsCopy.funding.claimForm.errors.recipientRequired)
    ).toBeInTheDocument();

    await user.type(
      recipientInput,
      "0xcccc000000000000000000000000000000000099"
    );
    await user.click(
      screen.getByRole("button", {
        name: teamsCopy.funding.claimForm.submit,
      })
    );

    expect(
      await screen.findByText(
        "Claimed 1.25 YFI from approval-security-23 to 0xcccc...0099."
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("1.25 YFI").length).toBeGreaterThanOrEqual(2);
  });

  it("validates and completes the mock funding return flow", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: ownerWorkspaceLabel,
      })
    );

    const returnAmountInput = await screen.findByLabelText(
      teamsCopy.funding.returnForm.amount
    );

    await user.clear(returnAmountInput);
    await user.type(returnAmountInput, "19000");
    await user.click(
      screen.getByRole("button", {
        name: teamsCopy.funding.returnForm.submit,
      })
    );

    expect(
      screen.getByText(teamsCopy.funding.returnForm.errors.amountExceeds)
    ).toBeInTheDocument();

    await user.clear(returnAmountInput);
    await user.type(returnAmountInput, "1000");
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: teamsCopy.funding.returnForm.submit,
      })
    );

    expect(
      await screen.findByText(
        "Returned 1,000 USDC from approval-security-22 for $1,000.00."
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Returned by:/).length).toBe(2);
  });

  it("clears claim and return success feedback when switching approvals", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: ownerWorkspaceLabel,
      })
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Use approval-security-23 in claim flow",
      })
    );

    const recipientInput = screen.getByLabelText(teamsCopy.funding.claimForm.recipient);
    const claimAmountInput = screen.getByLabelText(teamsCopy.funding.claimForm.amount);

    await user.clear(recipientInput);
    await user.type(
      recipientInput,
      "0xcccc000000000000000000000000000000000099"
    );
    await user.clear(claimAmountInput);
    await user.type(claimAmountInput, "1.25");
    await user.click(
      screen.getByRole("button", {
        name: teamsCopy.funding.claimForm.submit,
      })
    );

    const claimSuccessMessage =
      "Claimed 1.25 YFI from approval-security-23 to 0xcccc...0099.";
    expect(await screen.findByText(claimSuccessMessage)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Use approval-security-21 in claim flow",
      })
    );

    expect(screen.queryByText(claimSuccessMessage)).not.toBeInTheDocument();

    const returnAmountInput = screen.getByLabelText(teamsCopy.funding.returnForm.amount);
    await user.clear(returnAmountInput);
    await user.type(returnAmountInput, "1000");
    await user.click(
      screen.getByRole("button", {
        name: teamsCopy.funding.returnForm.submit,
      })
    );

    const returnSuccessMessage =
      "Returned 1,000 USDC from approval-security-22 for $1,000.00.";
    expect(await screen.findByText(returnSuccessMessage)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Use approval-security-21 in return flow",
      })
    );

    expect(screen.queryByText(returnSuccessMessage)).not.toBeInTheDocument();
  });
});
