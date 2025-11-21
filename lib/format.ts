import { formatUnits } from "viem";

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
