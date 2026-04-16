import { describe, expect, it } from "vitest";
import {
  cloneYbcMockScenarioData,
  createEmptyYbcMockScenarioData,
  createYbcMockProposal,
  executeYbcMockProposal,
  getYbcProposalThresholdState,
  retractYbcMockProposal,
  voteOnYbcMockProposal,
} from "@/lib/clients/ybc/mock";

describe("YBC mock proposal helpers", () => {
  it("creates a new discussion proposal with retract enabled", () => {
    const initial = cloneYbcMockScenarioData("member-ramping");

    const next = createYbcMockProposal(initial, "expulsion");

    expect(next.proposals.items[0]).toEqual(
      expect.objectContaining({
        id: "YBC-9",
        type: "expulsion",
        phase: "discussion",
        outcome: "pending",
      })
    );
    expect(next.proposals.items[0].actions).toEqual(
      expect.objectContaining({
        canRetract: true,
        nextAction: "retract",
      })
    );
    expect(next.proposals.summary.activeCount).toBe(
      initial.proposals.summary.activeCount + 1
    );
    expect(next.hero.activeProposalCount).toBe(next.proposals.summary.activeCount);
  });

  it("retracts mock discussion proposals into a terminal state", () => {
    const initial = cloneYbcMockScenarioData("member-ramping");

    const next = retractYbcMockProposal(initial, "YBC-8");
    const proposal = next.proposals.items.find((item) => item.id === "YBC-8");

    expect(proposal).toEqual(
      expect.objectContaining({
        phase: "retracted",
        outcome: "failed",
      })
    );
    expect(proposal?.actions.disabledReason).toMatch(/terminal/i);
    expect(next.proposals.summary.activeCount).toBe(
      initial.proposals.summary.activeCount - 1
    );
  });

  it("records mock votes using the viewer's effective weight", () => {
    const initial = cloneYbcMockScenarioData("member-ramping");

    const next = voteOnYbcMockProposal(initial, "YBC-7", "yea");
    const proposal = next.proposals.items.find((item) => item.id === "YBC-7");

    expect(proposal?.votes.total).toBe("20250");
    expect(proposal?.votes.yea).toBe("11250");
    expect(proposal?.votes.nay).toBe("9000");
    expect(proposal?.actions.canVote).toBe(false);
    expect(proposal?.actions.disabledReason).toMatch(/mock yea vote/i);
  });

  it("executes awaiting-execution proposals into a terminal state", () => {
    const initial = cloneYbcMockScenarioData("member-ramping");

    const next = executeYbcMockProposal(initial, "YBC-6");
    const proposal = next.proposals.items.find((item) => item.id === "YBC-6");

    expect(proposal).toEqual(
      expect.objectContaining({
        phase: "executed",
        outcome: "passed",
      })
    );
    expect(proposal?.timing.executedAt).toBe(next.asOf);
    expect(next.proposals.summary.awaitingExecutionCount).toBe(
      initial.proposals.summary.awaitingExecutionCount - 1
    );
  });

  it("derives threshold progress from yea versus total vote weight", () => {
    const initial = cloneYbcMockScenarioData("member-ramping");
    const proposal = initial.proposals.items.find((item) => item.id === "YBC-7");

    if (!proposal) {
      throw new Error("Expected YBC-7 fixture to exist");
    }

    expect(getYbcProposalThresholdState(proposal)).toEqual({
      currentBps: 5500,
      currentRatio: 0.55,
      thresholdBps: 5000,
      thresholdRatio: 0.5,
      thresholdMet: true,
    });
  });

  it("builds an explicit empty proposal board scenario", () => {
    const empty = createEmptyYbcMockScenarioData();

    expect(empty.proposals).toEqual({
      summary: {
        activeCount: 0,
        awaitingExecutionCount: 0,
        terminalCount: 0,
      },
      items: [],
    });
    expect(empty.hero.activeProposalCount).toBe(0);
    expect(empty.hero.awaitingExecutionCount).toBe(0);
    expect(empty.me.canPropose).toBe(true);
  });
});
