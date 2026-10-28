import { describe, expect, it } from "vitest";
import { getYbcVoteSummary } from "@/lib/clients/ybc/read-display";
import { cloneYbcMockScenarioData } from "@/lib/clients/ybc/mock";

describe("YBC vote display", () => {
  const base = cloneYbcMockScenarioData("observer").proposals.items[0]!;
  it("does not report a threshold met without votes", () => {
    expect(getYbcVoteSummary({ ...base, thresholdBps: 0, votes: { yea: "0", nay: "0", total: "0" } })).toEqual({ hasVotes: false, yeaPercent: 0, nayPercent: 0, thresholdMet: false });
  });
  it("does not round a near-threshold vote up into a passing result", () => {
    const summary = getYbcVoteSummary({ ...base, thresholdBps: 5000, votes: { yea: "999999999999999999.999999999999999999", nay: "1000000000000000000.000000000000000001", total: "2000000000000000000" } });
    expect(summary.thresholdMet).toBe(false);
    expect(summary.yeaPercent).toBe(49.99);
  });
  it("handles exact thresholds and fractions of a weight unit", () => {
    const summary = getYbcVoteSummary({ ...base, thresholdBps: 6000, votes: { yea: "0.000000000000000003", nay: "0.000000000000000002", total: "0.000000000000000005" } });
    expect(summary).toEqual({ hasVotes: true, yeaPercent: 60, nayPercent: 40, thresholdMet: true });
  });
});
