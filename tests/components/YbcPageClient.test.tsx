import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { YbcPageClient } from "@/app/ybc/YbcPageClient";
import { ybcCopy } from "@/app/ybc/messages";

describe("YbcPageClient", () => {
  it("renders the WP0 naming, route, rollout gate, and section shell", () => {
    render(<YbcPageClient />);

    expect(
      screen.getByRole("heading", {
        name: ybcCopy.app.displayLabel,
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.routeKey)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.page.productionGate)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.betaHost)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.productionHost)).toBeInTheDocument();

    const sectionNav = screen.getByRole("navigation", { name: "YBC sections" });
    for (const section of ybcCopy.sections) {
      expect(within(sectionNav).getByRole("link", { name: section.label }))
        .toHaveAttribute("href", `#${section.id}`);
      expect(
        screen.getAllByRole("heading", { name: section.title, level: 2 }).length
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the overview section as the default landing state", () => {
    render(<YbcPageClient />);

    expect(
      screen.getAllByText(ybcCopy.page.defaultSection).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(ybcCopy.sections[0].body).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders the proposal board with visible thresholds and timeline states", () => {
    render(<YbcPageClient />);

    expect(
      screen.getByRole("heading", {
        name: ybcCopy.proposalBoard.title,
        level: 2,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.thresholdTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.terminalTitle)).toBeInTheDocument();

    const proposal = screen.getByRole("article", {
      name: /YBC-4/i,
    });
    expect(within(proposal).getByText("Expired")).toBeInTheDocument();
    expect(
      within(proposal).getByText(/start a new proposal instead/i)
    ).toBeInTheDocument();
  });

  it("renders an explicit empty-board scenario", () => {
    render(<YbcPageClient />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Empty proposal board/i,
      })
    );

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.emptyBody)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.emptyHint)).toBeInTheDocument();
  });

  it("supports mock propose, retract, vote, and execute actions", () => {
    render(<YbcPageClient />);

    fireEvent.click(
      screen.getByRole("button", {
        name: ybcCopy.proposalBoard.proposeAdditionCta,
      })
    );

    const createdProposal = screen.getByRole("article", { name: /YBC-9/i });
    expect(
      within(createdProposal).getByText(/Add member proposal/i)
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("article", { name: /YBC-8/i })).getByRole("button", {
        name: /Retract proposal/i,
      })
    );
    expect(
      within(screen.getByRole("article", { name: /YBC-8/i })).getByText("Retracted")
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("article", { name: /YBC-7/i })).getByRole("button", {
        name: /Vote yea/i,
      })
    );
    expect(
      within(screen.getByRole("article", { name: /YBC-7/i })).getByText(
        /Mock yea vote recorded/i
      )
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("article", { name: /YBC-6/i })).getByRole("button", {
        name: /Execute proposal/i,
      })
    );
    expect(
      within(screen.getByRole("article", { name: /YBC-6/i })).getByText("Executed")
    ).toBeInTheDocument();
  });

  it("can seed the empty-board scenario with a new mock proposal", () => {
    render(<YbcPageClient />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Empty proposal board/i,
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: ybcCopy.proposalBoard.proposeAdditionCta,
      })
    );

    expect(
      screen.getByRole("article", {
        name: /YBC-1/i,
      })
    ).toBeInTheDocument();
  });
});
