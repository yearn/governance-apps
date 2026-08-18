import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProposalBoard } from "@/app/dao/components/ProposalBoard";
import { DAO_MOCK_FEED, type DaoDisplayGroup } from "@/lib/clients/dao";

const now = DAO_MOCK_FEED.canonicalBlock.timestamp;

describe("DAO proposal board", () => {
  it("renders domain-provided active proposals with scanning facts", () => {
    render(<ProposalBoard now={now} proposals={DAO_MOCK_FEED.proposals} />);

    expect(
      screen.getByRole("heading", { name: "Proposal board" })
    ).toBeVisible();
    const activeTab = screen.getByRole("tab", { name: /Active/ });
    expect(activeTab).toHaveAttribute("aria-selected", "true");

    const activePanel = screen.getByRole("tabpanel", {
      name: /Active/,
    });
    const activeCount = countFor("active");
    expect(within(activePanel).getAllByRole("article")).toHaveLength(activeCount);

    const proposal = within(activePanel).getByRole("article", {
      name: /Fund protocol research/,
    });
    expect(within(proposal).getByText("Voting", { exact: true })).toBeVisible();
    expect(within(proposal).getByText("Executable", { exact: true })).toBeVisible();
    expect(within(proposal).getByText("Voting ends in 5 days")).toBeVisible();
    expect(within(proposal).getByText("68.2% Yea · 31.8% Nay")).toBeVisible();
    expect(
      within(proposal).getByText("of votes cast · 55% approval threshold")
    ).toBeVisible();
  });

  it("switches Upcoming and Closed with mouse and keyboard tab semantics", () => {
    render(<ProposalBoard now={now} proposals={DAO_MOCK_FEED.proposals} />);

    const activeTab = screen.getByRole("tab", { name: /Active/ });
    activeTab.focus();
    fireEvent.keyDown(activeTab, { key: "ArrowRight" });

    const upcomingTab = screen.getByRole("tab", { name: /Upcoming/ });
    expect(upcomingTab).toHaveFocus();
    expect(upcomingTab).toHaveAttribute("aria-selected", "true");
    const upcomingPanel = screen.getByRole("tabpanel", { name: /Upcoming/ });
    expect(within(upcomingPanel).getAllByRole("article")).toHaveLength(
      countFor("upcoming")
    );
    expect(
      within(upcomingPanel).getByRole("link", {
        name: /Adopt the contributor budget policy/,
      })
    ).toHaveAttribute("href", "/dao/proposals/1");

    fireEvent.click(screen.getByRole("tab", { name: /Closed/ }));
    const closedPanel = screen.getByRole("tabpanel", { name: /Closed/ });
    expect(within(closedPanel).getAllByRole("article")).toHaveLength(
      countFor("closed")
    );
    const approvedSignal = within(closedPanel).getByRole("article", {
      name: /Approve the contributor charter/,
    });
    expect(
      within(approvedSignal).getByText("Approved", { exact: true })
    ).toBeVisible();
    expect(
      within(approvedSignal).getByText("No executable actions")
    ).toBeVisible();
  });

  it("keeps failed content records visible and names each failure", () => {
    render(<ProposalBoard now={now} proposals={DAO_MOCK_FEED.proposals} />);

    const unavailable = screen.getByRole("article", {
      name: /Proposal #14/,
    });
    expect(
      within(unavailable).getByText(
        "Content unavailable · onchain record shown"
      )
    ).toBeVisible();
    expect(
      within(unavailable).getByRole("link", {
        name: /Open proposal #14/,
      })
    ).toHaveAttribute("href", "/dao/proposals/14");

    const invalid = screen.getByRole("article", {
      name: /Proposal #15/,
    });
    expect(
      within(invalid).getByText("Content invalid · onchain record shown")
    ).toBeVisible();
  });

  it("covers every proposal display status without using color alone", () => {
    render(<ProposalBoard now={now} proposals={DAO_MOCK_FEED.proposals} />);

    for (const filter of ["Active", "Upcoming", "Closed"]) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(filter) }));
      const panel = screen.getByRole("tabpanel", { name: new RegExp(filter) });
      for (const article of within(panel).queryAllByRole("article")) {
        expect(within(article).getAllByText(/Proposal #\d+/).length).toBeGreaterThan(
          0
        );
      }
      const group = filter.toLowerCase() as DaoDisplayGroup;
      for (const proposal of DAO_MOCK_FEED.proposals.filter(
        (entry) => entry.displayGroup === group
      )) {
        const status = statusLabel(proposal.displayStatus);
        expect(within(panel).getAllByText(status, { exact: true }).length).toBeGreaterThan(
          0
        );
      }
    }
  });
});

function countFor(group: DaoDisplayGroup) {
  return DAO_MOCK_FEED.proposals.filter(
    (proposal) => proposal.displayGroup === group
  ).length;
}

function statusLabel(status: string) {
  return status === "not_found"
    ? "Not found"
    : `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}
