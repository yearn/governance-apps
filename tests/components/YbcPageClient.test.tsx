import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  YbcPageClient,
  YbcPageContent,
  YbcPageErrorState,
  YbcPageLoadingState,
} from "@/app/ybc/YbcPageClient";
import { ybcCopy } from "@/app/ybc/messages";
import {
  createMockYbcClient,
  type YbcPrototypeScenarioId,
} from "@/lib/clients/ybc";

async function getScenarioData(scenarioId: YbcPrototypeScenarioId) {
  const client = createMockYbcClient({ latencyMs: 0 });
  const state = await client.getPageState({ scenarioId });
  return state.data;
}

describe("YbcPageClient", () => {
  it("renders the loading state while the mock overview is resolving", () => {
    render(<YbcPageLoadingState />);

    expect(screen.getByText(ybcCopy.page.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.page.loadingBody)).toBeInTheDocument();
  });

  it("renders an explicit error state when the mock state cannot be loaded", () => {
    render(<YbcPageErrorState errorMessage="fixture load failed" />);

    expect(screen.getByText(ybcCopy.page.errorTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.page.errorBody)).toBeInTheDocument();
    expect(screen.getByText("fixture load failed")).toBeInTheDocument();
  });

  it("renders the observer overview with separate internal and delegated influence", async () => {
    const data = await getScenarioData("observer");

    render(<YbcPageContent data={data} />);

    expect(
      screen.getByRole("heading", {
        name: ybcCopy.app.displayLabel,
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.routeKey)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.hero.summary.internalLabel)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.hero.summary.delegatedLabel)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.hero.summary.totalLabel)).toBeInTheDocument();
    expect(screen.getAllByText(ybcCopy.hero.perspective.observerTitle).length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText(ybcCopy.members.states.you)).not.toBeInTheDocument();

    const sectionNav = screen.getByRole("navigation", { name: "YBC sections" });
    for (const section of ybcCopy.sections) {
      expect(within(sectionNav).getByRole("link", { name: section.label }))
        .toHaveAttribute("href", `#${section.id}`);
    }
    for (const section of ybcCopy.sections.slice(2)) {
      expect(
        screen.getByRole("heading", { name: section.title, level: 2 })
      ).toBeInTheDocument();
    }

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.rawStaked,
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.effectiveWeight,
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.targetWeight,
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.maturity,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("5,650 weight").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("100,000 weight").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the member perspective with distinct current and target weight", async () => {
    const data = await getScenarioData("member-ramping");

    render(<YbcPageContent data={data} />);

    expect(screen.getAllByText(ybcCopy.hero.perspective.memberTitle).length).toBeGreaterThan(
      0
    );
    expect(screen.getByText("250 weight")).toBeInTheDocument();
    expect(screen.getAllByText("500 weight").length).toBeGreaterThan(0);
    expect(screen.getByText(ybcCopy.members.states.you)).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
  });

  it("renders member rewards with a shared-claim handoff across host surfaces", async () => {
    const data = await getScenarioData("member-matured");
    const { rerender } = render(
      <YbcPageContent data={data} hostname="app.dao-ops.com" />
    );

    expect(
      screen.getByRole("heading", {
        name: ybcCopy.rewards.title,
        level: 2,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.rewards.handoffBody)).toBeInTheDocument();
    expect(screen.getByText("Epoch 10")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: data.rewards.claim.ctaLabel,
      })
    ).toHaveAttribute("href", "/styfi");

    rerender(<YbcPageContent data={data} hostname="ybc-beta.dao-ops.com" />);
    expect(
      screen.getByRole("link", {
        name: data.rewards.claim.ctaLabel,
      })
    ).toHaveAttribute("href", "https://styfi-beta.dao-ops.com");

    rerender(<YbcPageContent data={data} hostname="ybc.yearn.fi" />);
    expect(
      screen.getByRole("link", {
        name: data.rewards.claim.ctaLabel,
      })
    ).toHaveAttribute("href", "https://styfi.yearn.fi");
  });

  it("keeps rewards visible but disables the handoff for non-members", async () => {
    const data = await getScenarioData("observer");

    render(<YbcPageContent data={data} />);

    expect(
      screen.getByText(ybcCopy.rewards.states.emptyObserverTitle)
    ).toBeInTheDocument();
    expect(
      screen.getByText(ybcCopy.rewards.states.emptyObserverBody)
    ).toBeInTheDocument();
    expect(screen.getByText(data.rewards.claim.disabledReason ?? "")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: data.rewards.claim.ctaLabel,
      })
    ).toBeDisabled();
  });

  it("renders the empty members state when no roster data is seeded", async () => {
    const data = await getScenarioData("empty");

    render(<YbcPageContent data={data} />);

    expect(screen.getByText(ybcCopy.members.states.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.members.states.emptyBody)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the unseeded rewards state when no reward periods are available", async () => {
    const data = await getScenarioData("empty");

    render(<YbcPageContent data={data} />);

    expect(
      screen.getByText(ybcCopy.rewards.states.emptyUnseededTitle)
    ).toBeInTheDocument();
    expect(
      screen.getByText(ybcCopy.rewards.states.emptyUnseededBody)
    ).toBeInTheDocument();
  });

  it("renders the proposal board with visible thresholds and timeline states", async () => {
    render(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

    await screen.findByRole("heading", {
      name: ybcCopy.proposalBoard.title,
      level: 2,
    });

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

  it("renders an explicit empty-board scenario", async () => {
    render(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

    await screen.findByRole("button", {
      name: /Empty proposal board/i,
    });

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

  it("supports mock propose, retract, vote, and execute actions", async () => {
    render(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

    await screen.findByRole("button", {
      name: ybcCopy.proposalBoard.proposeAdditionCta,
    });

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

  it("can seed the empty-board scenario with a new mock proposal", async () => {
    render(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

    await screen.findByRole("button", {
      name: /Empty proposal board/i,
    });

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
