import { formatUnits } from "viem";
import { nowSeconds as getNowSeconds } from "@/lib/mocks/time";

export const UNAVAILABLE_VALUE = "--";

type RoundedDecimal = {
  kind: "value" | "dust";
  negative: boolean;
  text: string;
};

/**
 * Human-friendly token amount formatter.
 * Defaults to 18 decimals; callers can override for tokens with other precisions.
 */
export function formatTokenAmount(
  amount: bigint,
  decimals = 18,
  maximumFractionDigits = 4,
): string {
  const formatted = formatBigIntUnits(amount, decimals, maximumFractionDigits);
  if (!formatted) return "0";
  if (formatted.kind === "dust") {
    return formatted.negative ? `>-${formatted.text}` : `<${formatted.text}`;
  }
  return `${formatted.negative ? "-" : ""}${formatted.text}`;
}

/**
 * Formats an exact decimal string without converting through JavaScript Number.
 */
export function formatDecimalAmount(
  value: string | null | undefined,
  maximumFractionDigits = 4,
): string {
  const parsed = parseDecimalString(value);
  if (!parsed) return UNAVAILABLE_VALUE;
  return formatTokenAmount(parsed.amount, parsed.decimals, maximumFractionDigits);
}

/**
 * Exact formatter for input values without floating point rounding.
 * Trims trailing zeros for display.
 */
export function formatInputAmount(amount: bigint, decimals = 18): string {
  const raw = formatUnits(amount, decimals);
  if (!raw.includes(".")) return raw;
  const trimmed = raw.replace(/\.?0+$/, "");
  return trimmed.length ? trimmed : "0";
}

/**
 * USD formatting helper. Assumes 18 decimals unless provided otherwise.
 */
export function formatUsd(
  amount: bigint,
  decimals = 18,
  maximumFractionDigits = 2,
): string {
  const minimumFractionDigits = Math.min(
    2,
    normalizeMaximumFractionDigits(maximumFractionDigits),
  );
  const formatted = formatBigIntUnits(
    amount,
    decimals,
    maximumFractionDigits,
    minimumFractionDigits,
  );
  if (!formatted) return "$0";
  if (formatted.kind === "dust") {
    return formatted.negative ? `>-$${formatted.text}` : `<$${formatted.text}`;
  }
  return `${formatted.negative ? "-$" : "$"}${formatted.text}`;
}

export function formatUsdDecimal(
  value: string | null | undefined,
  maximumFractionDigits = 2,
): string {
  const parsed = parseDecimalString(value);
  if (!parsed) return UNAVAILABLE_VALUE;
  return formatUsd(parsed.amount, parsed.decimals, maximumFractionDigits);
}

/**
 * Percent formatter; expects a fractional input (e.g. 0.05 -> "5%").
 */
export function formatPercent(
  value: number,
  maximumFractionDigits = 2,
): string {
  return Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        style: "percent",
        maximumFractionDigits,
      })
    : "0%";
}

/**
 * Formats an address to look like "0x1234...5678"
 * Matches yearn.fi's truncateHex(address, 4)
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  // Slice 0-6 gets "0x" + 4 characters
  // Slice -4 gets the last 4 characters
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBigIntUnits(
  amount: bigint,
  decimals: number,
  maximumFractionDigits: number,
  minimumFractionDigits = 0,
): RoundedDecimal | null {
  if (!isValidDecimals(decimals)) return null;

  const maximumPrecision = normalizeMaximumFractionDigits(
    maximumFractionDigits,
  );
  const precision = Math.min(decimals, maximumPrecision);
  const minimumPrecision = Math.min(
    maximumPrecision,
    Math.max(0, Math.trunc(minimumFractionDigits)),
  );
  const negative = amount < 0n;
  const absoluteAmount = negative ? -amount : amount;
  const discardedDecimals = decimals - precision;
  const roundingScale = 10n ** BigInt(discardedDecimals);
  const roundedAmount =
    discardedDecimals === 0
      ? absoluteAmount
      : (absoluteAmount + roundingScale / 2n) / roundingScale;

  if (absoluteAmount > 0n && roundedAmount === 0n) {
    return {
      kind: "dust",
      negative,
      text: smallestVisibleValue(precision),
    };
  }

  const displayScale = 10n ** BigInt(precision);
  const integer = roundedAmount / displayScale;
  const fraction = roundedAmount % displayScale;
  const groupedInteger = groupInteger(integer.toString());
  let fractionText =
    precision > 0 ? fraction.toString().padStart(precision, "0") : "";

  while (
    fractionText.length > minimumPrecision &&
    fractionText.endsWith("0")
  ) {
    fractionText = fractionText.slice(0, -1);
  }
  fractionText = fractionText.padEnd(minimumPrecision, "0");

  return {
    kind: "value",
    negative,
    text: fractionText
      ? `${groupedInteger}.${fractionText}`
      : groupedInteger,
  };
}

function parseDecimalString(
  value: string | null | undefined,
): { amount: bigint; decimals: number } | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) return null;

  const [, sign, integer, fraction = ""] = match;
  if (!isValidDecimals(fraction.length)) return null;

  const amount =
    BigInt(`${integer}${fraction}`) * (sign === "-" ? -1n : 1n);
  return { amount, decimals: fraction.length };
}

function isValidDecimals(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 255;
}

function normalizeMaximumFractionDigits(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.trunc(value)));
}

function smallestVisibleValue(decimals: number): string {
  return decimals === 0
    ? "1"
    : `0.${"0".repeat(Math.max(0, decimals - 1))}1`;
}

function groupInteger(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function getCurrentEpoch(
  genesis: bigint,
  epochLengthSeconds: number,
  nowSecondsInput?: number,
): number {
  const epochLength = BigInt(epochLengthSeconds);
  const now = BigInt(nowSecondsInput ?? getNowSeconds());
  const timeSinceGenesis = now > genesis ? now - genesis : 0n;

  return Number(timeSinceGenesis / epochLength);
}

export function getEpochInfo(
  genesis: bigint,
  epochLengthSeconds: number,
  nowSecondsInput?: number,
): { currentEpoch: number; epochStart: number; epochEnd: number } {
  const epochLength = BigInt(epochLengthSeconds);
  const currentEpoch = getCurrentEpoch(
    genesis,
    epochLengthSeconds,
    nowSecondsInput,
  );
  const epochStart = genesis + BigInt(currentEpoch) * epochLength;
  const epochEnd = epochStart + epochLength;

  return {
    currentEpoch,
    epochStart: Number(epochStart),
    epochEnd: Number(epochEnd),
  };
}
