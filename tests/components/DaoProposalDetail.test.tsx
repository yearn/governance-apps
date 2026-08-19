import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProposalDetail } from "@/app/dao/proposals/[id]/ProposalDetail";
import { formatUtcDateTime } from "@/lib/date";
import {
  DAO_MOCK_FEED,
  type DaoDisplayStatus,
  type DaoProposal,
  type DaoProposalReadEnvelope,
} from "@/lib/clients/dao";

const PINNED_VOTING_ABI_SOURCE =
  "yearn/stYFI@9395d5e6fffdfe21fda32af94d32fca1a4f7840b/contracts/governance/Voting.vy";

describe("DAO proposal detail", () => {
  it.each([
    [4n, "approved"],
    [6n, "executed"],
    [7n, "rejected"],
    [8n, "rejected"],
    [9n, "expired"],
    [10n, "retracted"],
    [11n, "flagged"],
    [12n, "vetoed"],
    [13n, "vetoed"],
  ] satisfies Array<[bigint, DaoDisplayStatus]>) (
    "renders terminal proposal #%s as %s with lifecycle and results",
    (proposalId, displayStatus) => {
      const value = proposal(proposalId);
      const { unmount } = render(
        <ProposalDetail envelope={envelope(value)} />
      );

      expect(
        screen.getAllByText(statusLabel(displayStatus), { exact: true }).length
      ).toBeGreaterThan(0);
      expect(
        screen.getByRole("heading", { name: "Vote results" })
      ).toBeVisible();
      expect(screen.getByText(/of votes cast · \d/)).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "Lifecycle" })
      ).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "Immutable proposal content" })
      ).toBeVisible();
      unmount();
    }
  );

  it("presents an approved signal without implying execution", () => {
    render(
      <ProposalDetail envelope={envelope(proposal(4n))} />
    );

    expect(screen.getAllByText("Approved", { exact: true }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("No executable actions", { exact: true }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Signal proposals do not contain calls and do not need execution analysis."
      )
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Ordered calls" })
    ).not.toBeInTheDocument();
  });

  it("exposes the vote breakdown once to assistive technology", () => {
    render(<ProposalDetail envelope={envelope(proposal(2n))} />);

    expect(screen.queryByRole("img", { name: /Yea.*Nay/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Yea.*Nay/i)).toBeVisible();
  });

  it.each([
    [14n, "Immutable content could not be retrieved", "Content gateway"],
    [
      15n,
      "Immutable content did not pass validation",
      "yearn.dao.proposal.v1",
    ],
  ])(
    "keeps the onchain record visible for content failure #%s",
    (proposalId, warningTitle, errorFragment) => {
      render(
        <ProposalDetail envelope={envelope(proposal(proposalId))} />
      );

      expect(screen.getAllByText(warningTitle).length).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/The onchain proposal remains visible/).length
      ).toBeGreaterThan(0);
      expect(screen.getByText(new RegExp(errorFragment, "i"))).toBeVisible();
      expect(
        screen.getAllByText(`Proposal #${proposalId.toString()}`).length
      ).toBeGreaterThan(0);
      expect(screen.getByText("Voting contract")).toBeInTheDocument();
    }
  );

  it("renders pending analysis as pending without inventing calls", () => {
    render(
      <ProposalDetail envelope={envelope(proposal(16n))} />
    );

    expect(screen.getByText("Analysis pending", { exact: true })).toBeVisible();
    expect(screen.getByText("Pending", { exact: true })).toBeVisible();
    expect(screen.queryByText("Safe", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown call")).not.toBeInTheDocument();
  });

  it("shows verified provenance and raw data for a partially decoded script", () => {
    render(
      <ProposalDetail envelope={envelope(proposal(17n))} />
    );

    expect(
      screen.getByText("Partially decoded · simulation succeeded")
    ).toBeVisible();
    expect(screen.getByText("Verified decoding")).toBeVisible();
    expect(screen.getByText("Unknown call")).toBeVisible();
    expect(screen.getByText("Unknown contract")).toBeVisible();
    expect(screen.getByText("No verified ABI source")).toBeVisible();
    expect(screen.getByText("Selector")).toBeVisible();
    expect(screen.getByText("Calldata")).toBeVisible();
    expect(screen.getByText("Reference block")).toBeVisible();
    expect(screen.getByText(PINNED_VOTING_ABI_SOURCE)).toBeVisible();
  });

  it("keeps simulation failure separate from decoding", () => {
    render(
      <ProposalDetail envelope={envelope(proposal(18n))} />
    );

    expect(screen.getAllByText("Simulation failed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verified decoding").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/reverted in the recorded proposal-time simulation/i)
    ).toBeVisible();
    expect(
      screen.getByText("Target call reverted during atomic simulation.")
    ).toBeVisible();
  });

  it("keeps default analysis labels production-shaped", () => {
    render(
      <ProposalDetail envelope={envelope(proposal(2n))} />
    );

    expect(
      screen.queryByText(/\b(mock|fixture|prototype|qa|implementation)\b/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText("anvil")).toBeVisible();
    expect(screen.getAllByText("Voting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("epoch()").length).toBeGreaterThan(0);
    expect(screen.getAllByText("threshold()").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(PINNED_VOTING_ABI_SOURCE).length
    ).toBeGreaterThan(0);
  });

  it("renders producer provenance verbatim without casing or marker rewrites", () => {
    const feed = structuredClone(DAO_MOCK_FEED);
    const value = feed.proposals.find(
      (entry) => entry.ref.proposalId === 2n
    );
    if (!value) throw new Error("Missing proposal #2.");
    value.analysis.proposalSimulation.engine = "reth/v1.2.3+prod";
    value.analysis.calls[0] = {
      ...value.analysis.calls[0],
      contractName: "vaultFactory.v2",
      functionSignature: "rebalance_v2()",
      abiSource: "sourcify://mainnet/0xAbC",
    };

    render(<ProposalDetail envelope={envelope(value, feed)} />);

    expect(screen.getByText("reth/v1.2.3+prod", { exact: true })).toBeVisible();
    expect(screen.getByText("vaultFactory.v2", { exact: true })).toBeVisible();
    expect(screen.getByText("rebalance_v2()", { exact: true })).toBeVisible();
    expect(
      screen.getByText("sourcify://mainnet/0xAbC", { exact: true })
    ).toBeVisible();
  });

  it("labels canonical block time as the feed snapshot instead of generatedAt", () => {
    const feed = structuredClone(DAO_MOCK_FEED);
    feed.generatedAt = "2030-01-02T03:04:05Z";
    feed.canonicalBlock.timestamp = DAO_MOCK_FEED.canonicalBlock.timestamp - 3_600;
    const value = feed.proposals.find(
      (entry) => entry.ref.proposalId === 17n
    );
    if (!value) throw new Error("Missing proposal #17.");

    render(<ProposalDetail envelope={envelope(value, feed)} />);
    fireEvent.click(screen.getByText("Technical details", { exact: true }));

    expect(
      screen.getByText(formatUtcDateTime(feed.canonicalBlock.timestamp), {
        exact: true,
      })
    ).toBeVisible();
    expect(screen.queryByText(feed.generatedAt)).not.toBeInTheDocument();
  });

  it("uses runtime time for lifecycle copy without rewriting snapshot provenance", () => {
    const feed = structuredClone(DAO_MOCK_FEED);
    const value = feed.proposals.find(
      (entry) => entry.ref.proposalId === 2n
    );
    if (!value) throw new Error("Missing proposal #2.");

    render(
      <ProposalDetail
        envelope={envelope(value, feed)}
        now={feed.canonicalBlock.timestamp + 3_600}
      />
    );

    expect(screen.getByText("Voting ends in 5 hours")).toBeVisible();
    fireEvent.click(screen.getByText("Technical details", { exact: true }));
    expect(
      screen.getByText(formatUtcDateTime(feed.canonicalBlock.timestamp), {
        exact: true,
      })
    ).toBeVisible();
  });

  it("makes a script hash mismatch explicit", () => {
    render(
      <ProposalDetail envelope={envelope(proposal(19n))} />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Event script does not match the stored script hash"
    );
  });

  it("provides accessible rules and technical disclosures with copy controls", () => {
    const value = proposal(17n);
    render(<ProposalDetail envelope={envelope(value)} />);

    const rulesSummary = screen.getByText("Proposal rules").closest("summary");
    expect(rulesSummary).not.toBeNull();
    fireEvent.click(rulesSummary!);
    expect(screen.getByText("No minimum turnout is required.")).toBeVisible();

    const technicalSummary = screen
      .getByText("Technical details")
      .closest("summary");
    expect(technicalSummary).not.toBeNull();
    fireEvent.click(technicalSummary!);

    const details = technicalSummary!.closest("details");
    expect(details).not.toBeNull();
    expect(within(details!).getByText("Proposal identity")).toBeVisible();
    expect(within(details!).getByText("Raw contract status")).toBeVisible();
    expect(within(details!).getByText("Content CID")).toBeVisible();
    expect(within(details!).getByText("Content digest")).toBeVisible();
    expect(within(details!).getByText("Script hash")).toBeVisible();
    expect(within(details!).getByText("Event script")).toBeVisible();
    expect(within(details!).getByText("Feed snapshot block")).toBeVisible();
    expect(
      within(details!).getByRole("button", { name: "Copy script hash" })
    ).toHaveClass("size-10");
  });
});

function proposal(id: bigint): DaoProposal {
  const value = DAO_MOCK_FEED.proposals.find(
    (entry) => entry.ref.proposalId === id
  );
  if (!value) throw new Error(`Missing DAO proposal #${id.toString()}.`);
  return value;
}

function envelope(
  value: DaoProposal,
  feed = DAO_MOCK_FEED
): DaoProposalReadEnvelope {
  return { feed, proposal: value };
}

function statusLabel(status: DaoDisplayStatus) {
  if (status === "approved") return "Approved";
  if (status === "executed") return "Executed";
  if (status === "rejected") return "Rejected";
  if (status === "expired") return "Expired";
  if (status === "retracted") return "Retracted";
  if (status === "flagged") return "Flagged";
  if (status === "vetoed") return "Vetoed";
  if (status === "discussion") return "Discussion";
  if (status === "voting") return "Voting";
  return "Not found";
}
