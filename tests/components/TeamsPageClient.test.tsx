import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsPageClient } from "@/app/teams/TeamsPageClient";
import { teamsCopy } from "@/app/teams/messages";
import { renderWithProviders } from "@/tests/test-utils";

describe("TeamsPageClient", () => {
  const directoryMixLabel = teamsCopy.controls.scenarioNames["directory-observer"];
  const bonusAvailableLabel = teamsCopy.controls.scenarioNames["bonus-available"];
  const revenueWorkspaceLabel =
    teamsCopy.controls.scenarioNames["finance-operator-revenue"];
  const ownerWorkspaceLabel = teamsCopy.controls.scenarioNames["team-owner-funding"];
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
    expect(
      screen.getByRole("heading", { name: teamsCopy.revenue.title, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenue" })).toHaveAttribute(
      "href",
      "#revenue"
    );
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.getByText(teamsCopy.controls.adminHint)).toBeInTheDocument();

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

  it("renders the admin console only in the operator/admin scenario", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    expect(
      screen.queryByRole("heading", {
        name: teamsCopy.admin.title,
        level: 2,
      })
    ).not.toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", {
        name: twoTeamSnapshotLabel,
      })
    );

    const adminLink = await screen.findByRole("link", { name: "Admin" });
    expect(adminLink).toHaveAttribute("href", "#admin");

    const adminSection = document.getElementById("admin");
    expect(adminSection).not.toBeNull();
    expect(
      within(adminSection!).getByRole("heading", {
        name: teamsCopy.admin.title,
        level: 2,
      })
    ).toBeInTheDocument();
    expect(
      await within(adminSection!).findByRole("heading", {
        name: teamsCopy.admin.registry.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      within(adminSection!).getByRole("heading", {
        name: teamsCopy.admin.revenue.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      within(adminSection!).getByRole("heading", {
        name: teamsCopy.admin.fundingOps.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      within(adminSection!).getByRole("heading", {
        name: teamsCopy.admin.bonusOps.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(
      within(adminSection!).queryByText(teamsCopy.admin.accessCard.title)
    ).not.toBeInTheDocument();
  });

  it("shows bucket usage, whitelisted tokens, and queue summaries in the admin scenario", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: twoTeamSnapshotLabel,
      })
    );

    const adminSection = document.getElementById("admin");
    expect(adminSection).not.toBeNull();

    expect(
      await within(adminSection!).findByText(teamsCopy.admin.summary.title)
    ).toBeInTheDocument();
    expect(
      within(adminSection!).getByText(teamsCopy.admin.revenue.bucketLabels.rewards)
    ).toBeInTheDocument();
    expect(
      within(adminSection!).getByText(teamsCopy.admin.revenue.bucketLabels.recovery)
    ).toBeInTheDocument();
    expect(
      within(adminSection!).getByText("0x7777777777777777777777777777777777777777")
    ).toBeInTheDocument();
    expect(within(adminSection!).getByText("approval-security-21")).toBeInTheDocument();
    expect(within(adminSection!).getByText("platform")).toBeInTheDocument();
    expect(
      within(adminSection!).getByText(teamsCopy.admin.operatorAttention.required.label)
    ).toBeInTheDocument();
    expect(
      within(adminSection!).getByText(teamsCopy.admin.finalizationState.required.label)
    ).toBeInTheDocument();
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
    expect(document.getElementById("bonus")).not.toBeNull();
    expect(document.getElementById("lifecycle")).not.toBeNull();
    expect(screen.queryByText("#4")).not.toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(5);

    await user.click(screen.getByRole("button", { name: "Empty" }));
    expect(screen.getByText(teamsCopy.directory.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.noTeamsTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.revenue.emptyTitle)).toBeInTheDocument();
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
    expect(
      within(lifecycleCard!).getAllByText("No migration needed").length
    ).toBeGreaterThan(0);

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
        name: revenueWorkspaceLabel,
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
    expect(screen.getAllByText("Read-only after retirement").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Retired").length).toBeGreaterThan(0);
    expect(
      screen.getByText(teamsCopy.revenue.unavailable.readOnlyBody)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(teamsCopy.revenue.unavailable.viewerBody)
    ).not.toBeInTheDocument();
    const lifecycleCard = document.getElementById("lifecycle");
    expect(lifecycleCard).not.toBeNull();
    expect(
      within(lifecycleCard!).getAllByText("Migration completed").length
    ).toBeGreaterThan(0);
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
      await screen.findByText(teamsCopy.revenue.permissionless.title)
    ).toBeInTheDocument();
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
