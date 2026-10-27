import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProposalCard } from "@/app/ybc/components/ProposalCard";
import { ConnectedProposalVoters } from "@/app/ybc/components/ProposalVoters";
import { getYbcIdentityAddresses, YbcPageClient } from "@/app/ybc/YbcPageClient";
import { buildYbcIdentityMap } from "@/app/ybc/identity";
import { cloneYbcMockScenarioData } from "@/lib/clients/ybc/mock";
import { resetYbcMockStore } from "@/lib/clients/ybc/store";
import { useEnsIdentityLookup } from "@/lib/hooks/useEnsIdentities";
import { renderWithProviders } from "@/tests/test-utils";

vi.mock("@/lib/hooks/useEnsIdentities", () => ({
  useEnsIdentityLookup: vi.fn(),
  useEnsIdentities: () => ({}),
}));
const emptyLookup = { identities: {}, settled: true };

describe("YBC voting detail regressions", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    vi.mocked(useEnsIdentityLookup).mockReturnValue(emptyLookup);
    resetYbcMockStore({ scenarioId: "member-ramping" });
  });

  it("retains two decimals at the passing boundary", () => {
    const data = cloneYbcMockScenarioData("member-ramping");
    const proposal = { ...data.proposals.items[1]!, thresholdBps: 5000, votes: { yea: "49.99", nay: "50.01", total: "100" } };
    render(<ProposalCard proposal={proposal} identities={buildYbcIdentityMap(data.roster.members)} />);
    expect(screen.getByText("49.99% Yea")).toBeVisible();
    expect(screen.getByText("50% yea required · Below threshold")).toBeVisible();
    expect(screen.queryByText("50% Yea")).not.toBeInTheDocument();
  });

  it("prioritizes execution guidance for a member who already voted", async () => {
    const user = userEvent.setup();
    const data = cloneYbcMockScenarioData("member-ramping");
    const proposal = data.proposals.items.find((proposal) => proposal.phase === "awaiting-execution")!;
    render(<ProposalCard proposal={{ ...proposal, viewerVote: { hasVoted: true, choice: "yea" } }} identities={buildYbcIdentityMap(data.roster.members)} onExecute={vi.fn()} />);
    await user.click(screen.getByText("Details"));
    expect(screen.getByText(/Execute it before expiry/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Execute proposal" })).toBeVisible();
    expect(screen.getByText("You voted yea")).toBeVisible();
    expect(screen.queryByText(/You cannot vote again/)).not.toBeInTheDocument();
  });

  it("keeps completion feedback and focus when an active proposal moves to History", async () => {
    const user = userEvent.setup();
    renderWithProviders(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);
    const proposal = await screen.findByRole("article", { name: /YBC-6/ });
    await user.click(within(proposal).getByText("Details"));
    await user.click(within(proposal).getByRole("button", { name: "Execute proposal" }));
    expect(screen.queryByRole("article", { name: /YBC-6/ })).not.toBeInTheDocument();
    const completion = screen.getByText("YBC-6 is executed. The proposal is now in History.").parentElement!;
    expect(completion).toHaveFocus();
    await user.click(within(completion).getByRole("button", { name: "View proposal" }));
    expect(screen.getByRole("tab", { name: /History/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("article", { name: /YBC-6/ })).toBeInTheDocument();
  });

  it("keeps historical voters out of the primary ENS batch and resolves each visible voter page", async () => {
    const user = userEvent.setup();
    const data = cloneYbcMockScenarioData("member-ramping");
    const proposal = data.proposals.items[1]!;
    proposal.voteRecords = Array.from({ length: 75 }, (_, i) => ({
      id: String(i), voter: `0x${(i + 1).toString(16).padStart(40, "0")}` as `0x${string}`,
      choice: "yea", weight: "1", timestamp: null, transactionHash: null,
    }));
    const primary = getYbcIdentityAddresses(data, false);
    expect(primary).toContain(data.roster.members[0]!.address);
    expect(primary).not.toContain(proposal.voteRecords[0]!.voter);
    const identities = buildYbcIdentityMap(data.roster.members, [], { visibleAddresses: getYbcIdentityAddresses(data) });
    renderWithProviders(<ConnectedProposalVoters proposal={proposal} identities={identities} />);
    expect(vi.mocked(useEnsIdentityLookup).mock.calls.at(-1)?.[1]).toEqual(proposal.voteRecords.slice(0, 10).map((row) => row.voter));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(vi.mocked(useEnsIdentityLookup).mock.calls.at(-1)?.[1]).toEqual(proposal.voteRecords.slice(10, 20).map((row) => row.voter));
    expect(screen.getByText("Page 2 of 8")).toBeVisible();
  });
});
