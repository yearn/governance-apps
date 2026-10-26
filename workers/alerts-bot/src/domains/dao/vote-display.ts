import { daoProposalPasses } from "../../../../../lib/clients/dao/domain";
import type { DaoVoteTally } from "./types";

function hundredths(value: bigint): string {
  return `${value / 100n}${value % 100n ? "." + (value % 100n).toString().padStart(2, "0").replace(/0$/, "") : ""}`;
}

export function approval(tally: DaoVoteTally): string {
  const total = BigInt(tally.votes), yea = BigInt(tally.yea);
  if (total === 0n) return "no cast weight";
  if (yea === 0n) return "0%";
  if (yea === total) return "100%";
  if (yea * 10_000n < total) return "<0.01%";
  if (yea * 10_000n > total * 9_999n) return ">99.99%";
  return `${hundredths((yea * 10_000n + total / 2n) / total)}%`;
}

export function approvalChange(before: DaoVoteTally, after: DaoVoteTally): string {
  const oldTotal = BigInt(before.votes), total = BigInt(after.votes);
  if (oldTotal === 0n || total === 0n) return "";
  const numerator = BigInt(after.yea) * oldTotal - BigInt(before.yea) * total;
  if (numerator === 0n) return " (unchanged)";
  const absolute = numerator < 0n ? -numerator : numerator;
  const denominator = oldTotal * total;
  const tiny = absolute * 10_000n < denominator;
  const points = (absolute * 10_000n + denominator / 2n) / denominator;
  return ` (${numerator > 0n ? "+" : "−"}${tiny ? "<0.01" : hundredths(points)} pp)`;
}

/** The marker and bar are approximate; status always uses exact contract arithmetic. */
export function approvalBar(tally: DaoVoteTally, threshold: number): string {
  const total = BigInt(tally.votes);
  const filled = total === 0n ? 0 : Number(BigInt(tally.yea) * 20n / total);
  const marker = Math.round(threshold / 500);
  const cells = "█".repeat(filled) + "░".repeat(20 - filled);
  return `0%       50%     100%\n${cells.slice(0, marker)}│${cells.slice(marker)}\n${" ".repeat(marker)}↑ required ${hundredths(BigInt(threshold))}%`;
}

export function thresholdStatus(tally: DaoVoteTally, threshold: number): string {
  const total = BigInt(tally.votes), yea = BigInt(tally.yea);
  if (total === 0n) return "No votes yet";
  const passes = daoProposalPasses(total, yea, threshold);
  const difference = yea * 10_000n - total * BigInt(threshold);
  if (difference === 0n) return "Currently passing · At threshold";
  const absolute = difference < 0n ? -difference : difference;
  const points = absolute < total ? "<0.01" : hundredths((absolute + total / 2n) / total);
  return passes ? `Currently passing · ${points} pp above threshold` : `Below threshold · ${points} pp short`;
}
