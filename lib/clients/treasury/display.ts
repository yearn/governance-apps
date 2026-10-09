import { formatUnits } from "viem";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryFilter, TreasuryHolding } from "./types";
import { TREASURY_FEED_STALE_SECONDS } from "./feed";

export function formatTreasuryAmount(raw: string, decimals: number, maxFractionDigits = 6): string {
  if (!Number.isInteger(maxFractionDigits) || maxFractionDigits < 0 || maxFractionDigits > 36) throw new RangeError("Invalid display precision");
  const value = formatUnits(BigInt(raw), decimals);
  const [whole, fraction = ""] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const significant = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  if (whole === "0" && fraction && !significant) return maxFractionDigits === 0 ? "<1" : "<0." + "0".repeat(maxFractionDigits - 1) + "1";
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
    (!filters.accountId || holding.accountId === filters.accountId || (filters.accountId === "robo-treasury" && feed.accounts.some((account) => account.id === holding.accountId && account.kind === "robo-inventory"))) &&
    (!filters.teamId || holding.accountableTeamId === filters.teamId));
}

export function isTreasuryStale(feed: TreasuryFeed, now: number): boolean {
  return now - Math.min(feed.generatedAt, feed.blockTimestamp) > TREASURY_FEED_STALE_SECONDS;
}

export function treasuryAddressHref(address: string): string {
  return "https://etherscan.io/address/" + address;
}

const USD_SCALE = 10n ** 18n;
export const TREASURY_SMALL_BALANCE_USD = "100";

function usdUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * USD_SCALE + BigInt(fraction.padEnd(18, "0"));
}

function compareUsd(left: string, right: string): number {
  const a = usdUnits(left), b = usdUnits(right);
  return a === b ? 0 : a > b ? -1 : 1;
}

function sortHoldings(holdings: TreasuryHolding[], excludeYfi = false): TreasuryHolding[] {
  return holdings.sort((a, b) => {
    const left = excludeYfi ? a.valuation.usdValueExcludingYfi : a.valuation.usdValue;
    const right = excludeYfi ? b.valuation.usdValueExcludingYfi : b.valuation.usdValue;
    if (left !== null && right !== null) return compareUsd(left, right) || a.id.localeCompare(b.id);
    if (left !== null) return -1;
    if (right !== null) return 1;
    return a.asset.symbol.localeCompare(b.asset.symbol) || a.id.localeCompare(b.id);
  });
}

/** Display buckets only. Unknown prices never imply a small or worthless balance. */
export function groupTreasuryHoldings(holdings: TreasuryHolding[], excludeYfi = false) {
  const primary: TreasuryHolding[] = [], small: TreasuryHolding[] = [], other: TreasuryHolding[] = [];
  for (const holding of holdings) {
    if (BigInt(holding.balanceRaw) === 0n) continue;
    const curated = Boolean(holding.purposeNote?.trim()) || holding.positionKey !== null || holding.accountableTeamId !== null || ["strategic", "product-seed"].includes(holding.purpose);
    const value = holding.valuation.usdValue;
    if (value !== null) (usdUnits(value) < usdUnits(TREASURY_SMALL_BALANCE_USD) ? small : primary).push(holding);
    else (curated || holding.purpose === "operating" ? primary : other).push(holding);
  }
  return { primary: sortHoldings(primary, excludeYfi), small: sortHoldings(small, excludeYfi), other: sortHoldings(other, excludeYfi) };
}

export type TreasuryAccountGroup = {
  id: string;
  kind: "wallet" | "robo";
  accounts: TreasuryFeed["accounts"];
  primary: TreasuryHolding[];
  small: TreasuryHolding[];
  other: TreasuryHolding[];
  pricedUsdValue: string | null;
  unpricedCount: number;
};

/** Sum already-valued rows exactly; this is a display subtotal, never protocol valuation. */
function subtotal(holdings: TreasuryHolding[], excludeYfi: boolean): string | null {
  const values = holdings.map((holding) => excludeYfi ? holding.valuation.usdValueExcludingYfi : holding.valuation.usdValue).filter((value): value is string => value !== null);
  if (!values.length) return null;
  const sum = values.reduce((total, value) => total + usdUnits(value), 0n);
  const fraction = (sum % USD_SCALE).toString().padStart(18, "0").replace(/0+$/, "");
  return (sum / USD_SCALE).toString() + (fraction ? "." + fraction : "");
}

/** Combine Robo custody under one heading, retaining each holding's actual address. */
export function groupTreasuryAccounts(feed: TreasuryFeed, holdings: TreasuryHolding[], excludeYfi = false): TreasuryAccountGroup[] {
  const result = new Map<string, { accounts: TreasuryFeed["accounts"]; holdings: TreasuryHolding[]; kind: "wallet" | "robo" }>();
  for (const account of feed.accounts) {
    const rows = holdings.filter((holding) => holding.accountId === account.id && BigInt(holding.balanceRaw) > 0n);
    if (!rows.length) continue;
    const robo = account.id === "robo-treasury" || account.kind === "robo-inventory";
    const id = robo ? "robo-treasury" : account.id;
    const group = result.get(id) ?? { accounts: [], holdings: [], kind: robo ? "robo" : "wallet" };
    group.accounts.push(account);
    group.holdings.push(...rows);
    result.set(id, group);
  }
  return Array.from(result, ([id, group]) => ({
    id, kind: group.kind, accounts: group.accounts,
    ...groupTreasuryHoldings(group.holdings, excludeYfi),
    pricedUsdValue: subtotal(group.holdings, excludeYfi),
    unpricedCount: group.holdings.filter((holding) => (excludeYfi ? holding.valuation.usdValueExcludingYfi : holding.valuation.usdValue) === null).length,
  }));
}

/** The token service used by yearn.fi. Never accept image URLs from token metadata. */
export function treasuryAssetIconUrl(asset: TreasuryHolding["asset"]): string {
  const base = "https://token-assets-one.vercel.app/api";
  return asset.address === null
    ? base + "/chains/" + asset.chainId + "/logo-128.png"
    : base + "/tokens/" + asset.chainId + "/" + asset.address.toLowerCase() + "/logo-128.png";
}
