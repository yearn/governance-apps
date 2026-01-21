import { formatUnits } from "viem";
import { nowSeconds as getNowSeconds } from "@/lib/mocks/time";

/**
 * Human-friendly token amount formatter.
 * Defaults to 18 decimals; callers can override for tokens with other precisions.
 */
export function formatTokenAmount(
  amount: bigint,
  decimals = 18,
  maximumFractionDigits = 4
): string {
  const asNumber = Number.parseFloat(formatUnits(amount, decimals));
  return Number.isFinite(asNumber)
    ? asNumber.toLocaleString("en-US", {
        maximumFractionDigits,
      })
    : "0";
}

/**
 * USD formatting helper. Assumes 18 decimals unless provided otherwise.
 */
export function formatUsd(
  amount: bigint,
  decimals = 18,
  maximumFractionDigits = 2
): string {
  const asNumber = Number.parseFloat(formatUnits(amount, decimals));
  return Number.isFinite(asNumber)
    ? asNumber.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits,
      })
    : "$0";
}

/**
 * Percent formatter; expects a fractional input (e.g. 0.05 -> "5%").
 */
export function formatPercent(
  value: number,
  maximumFractionDigits = 2
): string {
  return Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        style: "percent",
        maximumFractionDigits,
      })
    : "0%";
}

export function getCurrentEpoch(
  genesis: bigint,
  epochLengthSeconds: number,
  nowSecondsInput?: number
): number {
  const epochLength = BigInt(epochLengthSeconds);
  const now = BigInt(nowSecondsInput ?? getNowSeconds());
  const timeSinceGenesis = now > genesis ? now - genesis : 0n;

  return Number(timeSinceGenesis / epochLength);
}

export function getEpochInfo(
  genesis: bigint,
  epochLengthSeconds: number,
  nowSecondsInput?: number
): { currentEpoch: number; epochStart: number; epochEnd: number } {
  const epochLength = BigInt(epochLengthSeconds);
  const currentEpoch = getCurrentEpoch(
    genesis,
    epochLengthSeconds,
    nowSecondsInput
  );
  const epochStart = genesis + BigInt(currentEpoch) * epochLength;
  const epochEnd = epochStart + epochLength;

  return {
    currentEpoch,
    epochStart: Number(epochStart),
    epochEnd: Number(epochEnd),
  };
}
