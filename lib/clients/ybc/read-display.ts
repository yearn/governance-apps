import { parseUnits } from "viem";
import type { YbcProposalRecord } from "./types";

export function getYbcVoteSummary(proposal: YbcProposalRecord) {
  const total = parseUnits(proposal.votes.total, 18);
  const yea = parseUnits(proposal.votes.yea, 18);
  const nay = parseUnits(proposal.votes.nay, 18);
  return {
    hasVotes: total > 0n,
    yeaPercent: total > 0n ? Number(yea * 10_000n / total) / 100 : 0,
    nayPercent: total > 0n ? Number(nay * 10_000n / total) / 100 : 0,
    thresholdMet: total > 0n && yea * 10_000n >= total * BigInt(proposal.thresholdBps),
  };
}

export function getYbcProposalGroup(proposal: YbcProposalRecord): "active" | "history" {
  return ["discussion", "voting", "awaiting-execution"].includes(proposal.phase) ? "active" : "history";
}
