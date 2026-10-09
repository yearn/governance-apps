import { formatUnits } from "viem";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryFilter, TreasuryHolding } from "./types";
import { TREASURY_FEED_STALE_SECONDS } from "./feed";

export function formatTreasuryAmount(raw: string, decimals: number): string {
  const value = formatUnits(BigInt(raw), decimals);
  const [whole, fraction = ""] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const significant = fraction.slice(0, 6).replace(/0+$/, "");
  if (whole === "0" && fraction && !significant) return "<0.000001";
  return significant ? grouped + "." + significant : grouped;
}

export function formatTreasuryUsd(value: string | null): string {
  if (value === null) return "Unavailable";
  const [whole, fraction = ""] = value.split(".");
  const dollars = BigInt(whole);
  if (dollars === 0n && /[1-9]/.test(fraction)) {
    const cents = BigInt(fraction.padEnd(2, "0").slice(0, 2));
    if (cents === 0n) return "<$0.01";
    const roundedCents = cents + (Number(fraction[2] ?? "0") >= 5 ? 1n : 0n);
    if (roundedCents < 100n) return "$0." + roundedCents.toString().padStart(2, "0");
  }
  const rounded = dollars + (Number(fraction[0] ?? "0") >= 5 ? 1n : 0n);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(rounded);
}

export function selectTreasuryHoldings(feed: TreasuryFeed, filters: TreasuryFilter): TreasuryHolding[] {
  return feed.holdings.filter((holding) =>
    (!filters.accountId || holding.accountId === filters.accountId) &&
    (!filters.teamId || holding.accountableTeamId === filters.teamId));
}

export function isTreasuryStale(feed: TreasuryFeed, now: number): boolean {
  return now - Math.min(feed.generatedAt, feed.blockTimestamp) > TREASURY_FEED_STALE_SECONDS;
}

export function treasuryAddressHref(address: string): string {
  return "https://etherscan.io/address/" + address;
}

function compareUsd(left: string, right: string): number {
  const units = (value: string) => { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0")); };
  const a = units(left), b = units(right);
  return a === b ? 0 : a > b ? -1 : 1;
}

/** Display ordering only; values and summary remain producer-owned. */
export function groupTreasuryHoldings(holdings: TreasuryHolding[]) {
  const primary: TreasuryHolding[] = [];
  const other: TreasuryHolding[] = [];
  for (const holding of holdings) {
    const prominent = holding.valuation.usdValue !== null || holding.positionKey !== null || holding.accountableTeamId !== null || ["operating", "strategic", "product-seed"].includes(holding.purpose);
    (prominent ? primary : other).push(holding);
  }
  primary.sort((a, b) => {
    const left = a.valuation.usdValue, right = b.valuation.usdValue;
    if (left !== null && right !== null) return compareUsd(left, right) || a.id.localeCompare(b.id);
    if (left !== null) return -1;
    if (right !== null) return 1;
    return a.asset.symbol.localeCompare(b.asset.symbol) || a.id.localeCompare(b.id);
  });
  other.sort((a, b) => a.asset.symbol.localeCompare(b.asset.symbol) || a.id.localeCompare(b.id));
  return { primary, other };
}
