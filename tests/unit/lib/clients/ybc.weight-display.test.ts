import { describe, expect, it } from "vitest";
import { getYbcMemberDisplayState, getYbcWeightSummary } from "@/lib/clients/ybc/weight-display";
import { cloneYbcMockScenarioData } from "@/lib/clients/ybc/mock";
import { getYbcMockSnapshot, patchYbcMember, resetYbcMockStore } from "@/lib/clients/ybc/store";

const member = cloneYbcMockScenarioData("member-ramping").roster.members[0]!;
describe("YBC stake activation", () => {
  it("shows no activation or date for zero stake even with a stale mature flag", () => {
    expect(getYbcWeightSummary({ ...member.weight, rawStaked: "0.0", targetWeight: "0", effectiveWeight: "0", maturityBps: 10000 })).toEqual({ state: "empty", activeBps: 0, remainingWeight: "0", maturesAt: null });
    expect(getYbcMemberDisplayState({ ...member, status: "ramping", weight: { ...member.weight, rawStaked: "0" } })).toBe("empty");
  });
  it("keeps new stake at zero activation and retains existing active weight for partial ramps", () => {
    expect(getYbcWeightSummary({ ...member.weight, effectiveWeight: "0", maturityBps: 10000 })).toMatchObject({ state: "ramping", activeBps: 0, remainingWeight: "500" });
    expect(getYbcWeightSummary({ ...member.weight, effectiveWeight: "375", maturityBps: 0 })).toMatchObject({ state: "ramping", activeBps: 7500, remainingWeight: "125" });
  });
  it("does not round up an almost complete ramp or hide tiny positive stakes", () => {
    expect(getYbcWeightSummary({ ...member.weight, rawStaked: "1", targetWeight: "1", effectiveWeight: "0.999999999999999999" })).toMatchObject({ state: "ramping", activeBps: 9999, remainingWeight: "0.000000000000000001" });
    expect(getYbcWeightSummary({ ...member.weight, rawStaked: "0.000000000000000001", targetWeight: "0.000000000000000001", effectiveWeight: "0" })).toMatchObject({ state: "ramping", activeBps: 0 });
  });
  it("omits stale dates for fully active stake and keeps missing target data explicit", () => {
    expect(getYbcWeightSummary({ ...member.weight, effectiveWeight: "500" })).toEqual({ state: "active", activeBps: 10000, remainingWeight: "0", maturesAt: null });
    expect(getYbcWeightSummary({ ...member.weight, targetWeight: "0" }).state).toBe("unavailable");
  });
  it("preserves removal status independently from stake activation", () => {
    expect(getYbcMemberDisplayState({ ...member, status: "removed" })).toBe("removed");
    expect(getYbcMemberDisplayState({ ...member, status: "pending-removal" })).toBe("pending-removal");
  });
  it("does not count an empty stale ramp or let its old maturity date activate stake", () => {
    resetYbcMockStore({ scenarioId: "observer" });
    patchYbcMember(member.address, { weight: { rawStaked: "0", targetWeight: "0", effectiveWeight: "0", maturityBps: 10000, maturesAt: 1 } });
    const data = getYbcMockSnapshot().data;
    expect(data.roster.totals.rampingMemberCount).toBe(2);
    expect(data.roster.members[0]!.weight).toMatchObject({ rawStaked: "0", effectiveWeight: "0", maturityBps: 0, maturesAt: null });
  });
});
