import { formatUnits, parseUnits } from "viem";
import type { YbcMemberRecord, YbcWeightRecord } from "./types";

export type YbcWeightState = "empty" | "ramping" | "active" | "unavailable";

export function getYbcWeightSummary(weight: YbcWeightRecord) {
  const staked = parseUnits(weight.rawStaked, 18);
  const target = parseUnits(weight.targetWeight, 18);
  const effective = parseUnits(weight.effectiveWeight, 18);
  const hasStake = staked > 0n;
  const state: YbcWeightState = !hasStake ? "empty" : target <= 0n ? "unavailable" : effective < target ? "ramping" : "active";
  // Basis points are a display ratio, never an eligibility or write input.
  // Floor it so a nearly complete position cannot claim 100% activation.
  const activeBps = !hasStake || target <= 0n ? 0 : Math.min(10_000, Number(effective * 10_000n / target));
  return {
    state,
    activeBps,
    remainingWeight: state === "ramping" ? formatUnits(target - effective, 18) : "0",
    maturesAt: state === "ramping" ? weight.maturesAt : null,
  };
}

export function getYbcMemberDisplayState(member: YbcMemberRecord) {
  if (member.status === "removed" || member.status === "pending-removal") return member.status;
  return getYbcWeightSummary(member.weight).state;
}
