import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { resetYbcMockStore } from "@/lib/clients/ybc/store";
import { renderWithProviders } from "@/tests/test-utils";

async function getScenarioData(scenarioId: YbcPrototypeScenarioId) {
  const client = createMockYbcClient({ latencyMs: 0 });
  const state = await client.getPageState({ scenarioId });
  return state.data;
}

function installHashScrollMock() {
  const scrollIntoView = vi.fn();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
  window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0)) as typeof window.requestAnimationFrame;

  return {
    scrollIntoView,
    restore: () => {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
      window.requestAnimationFrame = originalRequestAnimationFrame;
    },
  };
}

async function dispatchYbcHash(hash: string, scrollIntoView: ReturnType<typeof vi.fn>) {
  scrollIntoView.mockClear();

  act(() => {
    window.history.replaceState(null, "", `/ybc#${hash}`);
    window.dispatchEvent(new Event("hashchange"));
  });

  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalled();
  });
}

describe("YbcPageClient", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    resetYbcMockStore({ scenarioId: "observer" });
  });

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
    expect(screen.queryByText("Accepted shell map")).not.toBeInTheDocument();
    expect(screen.queryByText("Mock interactions")).not.toBeInTheDocument();
    expect(screen.queryByText("Mock MVP scope")).not.toBeInTheDocument();
    expect(screen.getAllByText(ybcCopy.hero.perspective.observerTitle).length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText(ybcCopy.members.states.you)).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: ybcCopy.proposalBoard.title,
        level: 2,
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(ybcCopy.operatorPanel.operatorsTitle)).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Table/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
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

  it("loads the saved YBC member view", async () => {
    const data = await getScenarioData("observer");
    window.localStorage.setItem("yearn.ybc.members.view", "visual");

    render(<YbcPageContent data={data} />);

    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Cards/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("renders the member perspective with distinct current and target weight", async () => {
    const data = await getScenarioData("member-ramping");

    render(<YbcPageContent data={data} />);

    expect(screen.getAllByText(ybcCopy.hero.perspective.memberTitle).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText("250 weight").length).toBeGreaterThan(0);
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

  it("renders operator rewards with the operator bonus period and operator viewer label", async () => {
    const data = await getScenarioData("operator-admin");

    render(<YbcPageContent data={data} />);

    expect(screen.getAllByText(ybcCopy.rewards.states.operator).length).toBeGreaterThan(0);
    expect(screen.getByText(ybcCopy.rewards.states.operatorBonus)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.rewards.rows.role)).toBeInTheDocument();
    expect(screen.getAllByText("5 YFI").length).toBeGreaterThan(0);
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
        name: ybcCopy.rewards.disabledClaimCta,
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

  it("keeps the operator panel hidden for non-operator perspectives", async () => {
    const data = await getScenarioData("observer");

    render(<YbcPageContent data={data} />);

    expect(
      screen.queryByText(ybcCopy.operatorPanel.operatorsTitle)
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Mock MVP scope")).not.toBeInTheDocument();
  });

  it("preserves YBC member, proposal, and reward hash links", async () => {
    const hashScroll = installHashScrollMock();
    const data = await getScenarioData("observer");

    try {
      window.history.replaceState(null, "", "/ybc#members");
      render(<YbcPageContent data={data} />);

      expect(document.getElementById("members")).not.toBeNull();
      expect(
        screen.getByRole("heading", {
          name: ybcCopy.members.title,
          level: 2,
        })
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(hashScroll.scrollIntoView).toHaveBeenCalled();
      });

      await dispatchYbcHash("proposals", hashScroll.scrollIntoView);
      expect(document.getElementById("proposals")).not.toBeNull();
      expect(
        screen.getByRole("heading", {
          name: ybcCopy.proposalBoard.title,
          level: 2,
        })
      ).toBeInTheDocument();

      await dispatchYbcHash("rewards", hashScroll.scrollIntoView);
      expect(document.getElementById("rewards")).not.toBeNull();
      expect(
        screen.getByRole("heading", {
          name: ybcCopy.rewards.title,
          level: 2,
        })
      ).toBeInTheDocument();
    } finally {
      hashScroll.restore();
    }
  });

  it("keeps the YBC admin hash scoped to operator viewers", async () => {
    const hashScroll = installHashScrollMock();
    const observerData = await getScenarioData("observer");

    try {
      window.history.replaceState(null, "", "/ybc#admin");
      render(<YbcPageContent data={observerData} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: ybcCopy.members.title })).toBeInTheDocument();
      });
      expect(document.getElementById("admin")).toBeNull();
      expect(screen.queryByText(ybcCopy.operatorPanel.operatorsTitle)).not.toBeInTheDocument();
      expect(hashScroll.scrollIntoView).not.toHaveBeenCalled();
    } finally {
      hashScroll.restore();
    }
  });

  it("opens the YBC admin hash for operator viewers", async () => {
    const hashScroll = installHashScrollMock();
    const operatorData = await getScenarioData("operator-admin");

    try {
      window.history.replaceState(null, "", "/ybc#admin");
      render(<YbcPageContent data={operatorData} />);

      expect(document.getElementById("admin")).not.toBeNull();
      expect(
        await screen.findByText(ybcCopy.operatorPanel.operatorsTitle)
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(hashScroll.scrollIntoView).toHaveBeenCalled();
      });
    } finally {
      hashScroll.restore();
    }
  });

  it("renders the proposal board with visible thresholds and timeline states", async () => {
    renderWithProviders(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

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
    expect(
      screen.getByRole("button", {
        name: ybcCopy.proposalBoard.proposeAdditionCta,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Add member" })
    ).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Remove member" }));
    expect(
      screen.getByRole("button", {
        name: ybcCopy.proposalBoard.proposeExpulsionCta,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.thresholdTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.terminalTitle)).toBeInTheDocument();
    expect(screen.getAllByText("Threshold marker").length).toBeGreaterThan(0);
    expect(screen.queryByText("Mock interactions")).not.toBeInTheDocument();

    const proposal = screen.getByRole("article", {
      name: /YBC-4/i,
    });
    expect(screen.getByRole("article", { name: /YBC-8/i })).toHaveAttribute(
      "open"
    );
    expect(proposal).not.toHaveAttribute("open");
    expect(within(proposal).getByText("Expired")).toBeInTheDocument();
    fireEvent.click(within(proposal).getByText("Details"));
    expect(proposal).toHaveAttribute("open");
    expect(
      within(proposal).getByText(/start a new proposal instead/i)
    ).toBeInTheDocument();
  });

  it("moves empty-board coverage into the debug panel", async () => {
    renderWithProviders(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

    await screen.findByRole("button", {
      name: /debug/i,
    });

    fireEvent.click(screen.getByRole("button", { name: /debug/i }));
    fireEvent.click(screen.getByRole("button", { name: "Empty board" }));

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.emptyBody)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.proposalBoard.emptyHint)).toBeInTheDocument();
  });

  it("supports mock propose, retract, vote, and execute actions", async () => {
    renderWithProviders(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

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

  it("moves operator coverage into the debug panel", async () => {
    renderWithProviders(<YbcPageClient scenarioOverride="observer" latencyMs={0} />);

    await screen.findByRole("button", {
      name: /debug/i,
    });

    fireEvent.click(screen.getByRole("button", { name: /debug/i }));
    fireEvent.click(screen.getAllByRole("button", { name: "Operator" })[0]);

    await screen.findByText(ybcCopy.operatorPanel.operationsTitle);

    expect(
      screen.queryByText(ybcCopy.operatorPanel.accessCard.title)
    ).not.toBeInTheDocument();
    expect(screen.getByText(ybcCopy.operatorPanel.operatorsTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.operatorPanel.hooksTitle)).toBeInTheDocument();
    expect(
      screen.getByText(ybcCopy.operatorPanel.rewardStatus.funded)
    ).toBeInTheDocument();
    expect(screen.getAllByText("bobby-ybc.eth").length).toBeGreaterThan(0);
    expect(screen.getAllByText(ybcCopy.operatorPanel.roles.you).length).toBeGreaterThan(0);
    expect(
      screen.getByText("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: ybcCopy.operatorPanel.operations.addMember.cta,
      })
    );

    expect(
      screen.getByRole("article", {
        name: /YBC-9/i,
      })
    ).toBeInTheDocument();
  });

  it("can seed the empty-board scenario with a new mock proposal", async () => {
    renderWithProviders(<YbcPageClient scenarioOverride="member-ramping" latencyMs={0} />);

    await screen.findByRole("button", {
      name: /debug/i,
    });

    fireEvent.click(screen.getByRole("button", { name: /debug/i }));
    fireEvent.click(screen.getByRole("button", { name: "Empty board" }));
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
