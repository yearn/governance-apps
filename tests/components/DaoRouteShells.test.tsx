import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DAO_MOCK_FEED,
  deriveDaoProposerState,
  getDaoMockFixture,
} from "@/lib/clients/dao";
import { DaoBoardView } from "@/app/dao/DaoPageClient";
import { DaoProposalView } from "@/app/dao/proposals/[id]/DaoProposalPageClient";
import { DaoProposeView } from "@/app/dao/propose/DaoProposePageClient";

describe("DAO proposal board shell", () => {
  it("renders production-shaped loading and disconnected states", () => {
    render(
      <DaoBoardView
        isConnected={false}
        onRetry={vi.fn()}
        proposalCount={0}
        state="loading"
      />
    );

    expect(
      screen.getByRole("heading", { name: "DAO Governance", level: 1 })
    ).toBeVisible();
    expect(screen.getByText("Wallet not connected")).toBeVisible();
    expect(screen.getByText("Loading proposal data")).toBeVisible();
    expect(screen.queryByText(/mock|prototype/i)).not.toBeInTheDocument();
  });

  it("renders the empty shell with a proposal entry point", () => {
    render(
      <DaoBoardView
        isConnected
        onRetry={vi.fn()}
        proposalCount={0}
        state="empty"
      />
    );

    expect(
      screen.getByRole("heading", { name: "No proposals yet" })
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Create proposal" })[0]
    ).toHaveAttribute("href", "/dao/propose");
  });

  it("renders a retryable error without exposing raw errors", () => {
    const onRetry = vi.fn();
    render(
      <DaoBoardView
        isConnected
        onRetry={onRetry}
        proposalCount={0}
        state="error"
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Retry proposal data" })
    );
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
  });

  it("renders the typed ready count and forum navigation", () => {
    render(
      <DaoBoardView
        isConnected
        onRetry={vi.fn()}
        proposalCount={22}
        state="ready"
      />
    );

    expect(screen.getByText("22 proposals are available.")).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Open the Yearn discussion forum in a new tab",
      })
    ).toHaveAttribute("href", "https://gov.yearn.fi/");
    expect(
      document.querySelector('a[href*="dao.yearn.fi"]')
    ).not.toBeInTheDocument();
  });
});

describe("DAO proposal detail shell", () => {
  const proposal = DAO_MOCK_FEED.proposals.find(
    (entry) => entry.ref.proposalId === 2n
  );

  if (!proposal) {
    throw new Error("DAO fixture proposal #2 is required for route tests.");
  }

  it("renders a minimal client-backed proposal summary", () => {
    render(
      <DaoProposalView
        isConnected
        onRetry={vi.fn()}
        proposal={proposal}
        proposalId="2"
        state="ready"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Fund protocol research" })
    ).toBeVisible();
    expect(screen.getAllByText("Voting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Executable").length).toBeGreaterThan(0);

    const proposalIdLabel = screen.getByText("Proposal ID", { exact: true });
    const statusLabel = screen.getByText("Status", { exact: true });
    const typeLabel = screen.getByText("Type", { exact: true });
    expect(proposalIdLabel).toHaveClass("text-text-secondary");
    expect(statusLabel).toHaveClass("text-text-secondary");
    expect(typeLabel).toHaveClass("text-text-secondary");
    expect(proposalIdLabel.nextElementSibling).toHaveClass("font-number");
    expect(statusLabel.nextElementSibling).not.toHaveClass("font-number");
    expect(typeLabel.nextElementSibling).not.toHaveClass("font-number");
    expect(
      screen.getByRole("link", {
        name: "Open this proposal's forum discussion in a new tab",
      })
    ).toHaveAttribute("target", "_blank");
  });

  it("renders loading and disconnected detail states together", () => {
    render(
      <DaoProposalView
        isConnected={false}
        onRetry={vi.fn()}
        proposal={null}
        proposalId="2"
        state="loading"
      />
    );

    expect(screen.getByText("Wallet not connected")).toBeVisible();
    expect(screen.getByText("Loading proposal details")).toBeVisible();
  });

  it("renders a safe proposal not-found shell", () => {
    render(
      <DaoProposalView
        isConnected
        onRetry={vi.fn()}
        proposal={null}
        proposalId="999"
        state="not_found"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Proposal not found" })
    ).toBeVisible();
    expect(screen.getByText("Proposal #999")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Return to proposals" })
    ).toHaveAttribute("href", "/dao");
  });

  it("renders a retryable proposal error shell", () => {
    const onRetry = vi.fn();
    render(
      <DaoProposalView
        isConnected
        onRetry={onRetry}
        proposal={null}
        proposalId="2"
        state="error"
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Retry proposal details" })
    );
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("DAO proposal authoring shell", () => {
  const proposer = deriveDaoProposerState(
    getDaoMockFixture("discussion").proposer
  );

  it("renders a disconnected authoring shell without a form", () => {
    render(
      <DaoProposeView
        onRetry={vi.fn()}
        proposer={null}
        state="disconnected"
      />
    );

    expect(screen.getByText("Wallet not connected")).toBeVisible();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("renders loading and retryable error authoring shells", () => {
    const { rerender } = render(
      <DaoProposeView
        onRetry={vi.fn()}
        proposer={null}
        state="loading"
      />
    );
    expect(screen.getByText("Checking proposal eligibility")).toBeVisible();

    const onRetry = vi.fn();
    rerender(
      <DaoProposeView
        onRetry={onRetry}
        proposer={null}
        state="error"
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry eligibility check" })
    );
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders eligibility without M2 authoring interactions", () => {
    render(
      <DaoProposeView
        onRetry={vi.fn()}
        proposer={proposer}
        state="ready"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Before you propose" })
    ).toBeVisible();
    expect(screen.getByText("Your wallet can create a proposal")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
