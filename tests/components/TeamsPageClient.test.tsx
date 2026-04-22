import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TeamsPageClient } from "@/app/teams/TeamsPageClient";
import { teamsCopy } from "@/app/teams/messages";
import {
  resetMockTeamsStore,
  setMockTeamsEmpty,
  setMockTeamsLoading,
  setMockTeamsPreset,
} from "@/lib/clients/teams";
import { teamsKeys } from "@/lib/hooks/useTeams";
import { renderWithProviders } from "@/tests/test-utils";

async function syncTeamsRuntime(
  queryClient: ReturnType<typeof renderWithProviders>["queryClient"],
  mutate: () => void
) {
  mutate();

  await act(async () => {
    await queryClient.invalidateQueries({
      queryKey: teamsKeys.all,
      refetchType: "all",
    });
  });
}

describe("TeamsPageClient", () => {
  beforeEach(() => {
    resetMockTeamsStore();
  });

  it("renders the Team Finances shell, keeps prototype controls off-route, and opens a workspace", async () => {
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
    expect(
      screen.queryByRole("button", {
        name: teamsCopy.controls.scenarioNames["operator-admin"],
      })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /debug/i })).toBeInTheDocument();

    const openPlatformButton = await screen.findByRole("button", {
      name: "Open Platform workspace",
    });
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
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
    expect(screen.getByText(teamsCopy.bonus.noPeriods)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: teamsCopy.bonus.action.noneCta,
      })
    ).toBeDisabled();
    expect(document.querySelectorAll("#lifecycle")).toHaveLength(1);
  });

  it("mounts Teams controls inside the shared debug panel", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TeamsPageClient />);

    await screen.findByRole("button", { name: "Open Platform workspace" });
    await user.click(screen.getByRole("button", { name: /debug/i }));

    expect(screen.getByText("App Specific")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: teamsCopy.controls.scenarioNames["operator-admin"],
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Directory only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No tokens" })).toBeInTheDocument();
  });

  it("renders the admin console only when the runtime exposes operator/admin access", async () => {
    setMockTeamsPreset("operator-admin");

    renderWithProviders(<TeamsPageClient />);

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
  });

  it("exposes deterministic loading and empty coverage through the shared runtime", async () => {
    setMockTeamsLoading(true);
    const { queryClient } = renderWithProviders(<TeamsPageClient />);

    expect(await screen.findByText(teamsCopy.directory.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.revenue.loadingTitle)).toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(5);

    await syncTeamsRuntime(queryClient, () => {
      setMockTeamsLoading(false);
      setMockTeamsEmpty(true);
    });

    expect(await screen.findByText(teamsCopy.directory.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.workspace.noTeamsTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.revenue.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.bonus.placeholders.empty)).toBeInTheDocument();
    expect(screen.getByText(teamsCopy.lifecycle.placeholders.empty)).toBeInTheDocument();
  });

  it("keeps explicit admin empty coverage available under operator access", async () => {
    setMockTeamsPreset("operator-admin");
    setMockTeamsEmpty(true);

    renderWithProviders(<TeamsPageClient />);

    expect(await screen.findByText(teamsCopy.admin.emptyTitle)).toBeInTheDocument();
    const adminSection = document.getElementById("admin");
    expect(adminSection).not.toBeNull();
    expect(
      within(adminSection!).getByText(teamsCopy.admin.emptyBody)
    ).toBeInTheDocument();
  });

  it("resets workspace selection to the preset default when the runtime preset changes", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<TeamsPageClient />);

    await user.click(
      await screen.findByRole("button", {
        name: "Open Research workspace",
      })
    );
    expect(
      await screen.findByRole("heading", { name: "Research", level: 2 })
    ).toBeInTheDocument();

    await syncTeamsRuntime(queryClient, () => {
      setMockTeamsPreset("operator-admin");
    });

    expect(
      await screen.findByRole("heading", { name: "Security", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Research", level: 2 })
    ).not.toBeInTheDocument();
  });

  it("shows claimable bonus detail and resets staged bonus state when the preset changes", async () => {
    const user = userEvent.setup();
    setMockTeamsPreset("bonus-available");
    const { queryClient } = renderWithProviders(<TeamsPageClient />);

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

    await syncTeamsRuntime(queryClient, () => {
      setMockTeamsPreset("finance-operator-revenue");
    });

    expect(
      await screen.findByRole("heading", { name: "Platform", level: 2 })
    ).toBeInTheDocument();
    expect(
      within(bonusCard!).queryByRole("button", {
        name: teamsCopy.bonus.action.stagedCta,
      })
    ).not.toBeInTheDocument();
    expect(
      within(bonusCard!).getByRole("button", {
        name: teamsCopy.bonus.action.noneCta,
      })
    ).toBeDisabled();
  });

  it("covers claimed and pending-finalization bonus states in the operator preset", async () => {
    const user = userEvent.setup();
    setMockTeamsPreset("operator-admin");

    renderWithProviders(<TeamsPageClient />);

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

  it("keeps the read-only revenue blocker visible in the retired preset", async () => {
    setMockTeamsPreset("retired-read-only");

    renderWithProviders(<TeamsPageClient />);

    expect(
      await screen.findByRole("heading", { name: "Grants Archive", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Read-only after retirement").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Retired").length).toBeGreaterThan(0);
    expect(screen.getByText(teamsCopy.revenue.unavailable.readOnlyBody)).toBeInTheDocument();
  });

  it("renders the revenue preview, validation, and success state for the operator revenue preset", async () => {
    const user = userEvent.setup();
    setMockTeamsPreset("finance-operator-revenue");

    renderWithProviders(<TeamsPageClient />);

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

  it("shows the explicit empty revenue history state when a selected team has no deposits", async () => {
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

  it("renders funding approval states and the separate claim and return flows for the owner preset", async () => {
    setMockTeamsPreset("team-owner-funding");

    renderWithProviders(<TeamsPageClient />);

    expect(
      await screen.findByRole("heading", {
        name: teamsCopy.funding.title,
        level: 3,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("50,000 USDC")).toBeInTheDocument();
    expect(screen.getByText("Period #3 late-claim window")).toBeInTheDocument();
    expect(screen.getByText("Queued for period #5")).toBeInTheDocument();
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

  it("validates and completes the funding claim flow", async () => {
    const user = userEvent.setup();
    setMockTeamsPreset("team-owner-funding");

    renderWithProviders(<TeamsPageClient />);

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
  });

  it("validates and completes the funding return flow and clears feedback when switching approvals", async () => {
    const user = userEvent.setup();
    setMockTeamsPreset("team-owner-funding");

    renderWithProviders(<TeamsPageClient />);

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
