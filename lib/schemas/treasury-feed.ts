import { z } from "./zod";
import { TreasuryFeedSchema } from "./treasury-feed.generated";

export { TreasuryFeedSchema } from "./treasury-feed.generated";
export const TREASURY_FEED_MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
export const TREASURY_FEED_STALE_SECONDS = 45 * 60;
export type TreasuryFeed = z.infer<typeof TreasuryFeedSchema>;
export type TreasuryFeedWire = TreasuryFeed;
export type TreasuryHolding = TreasuryFeed["holdings"][number];
export type TreasuryAllocation = TreasuryFeed["allocations"][number];
export type TreasuryAsset = TreasuryHolding["asset"];
const UINT256_MAX = (1n << 256n) - 1n;
const YFI_ADDRESS = "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e";

export class TreasuryFeedError extends Error {
  constructor(public readonly kind: "incompatible" | "invalid" | "unavailable" | "oversized" | "timeout", message: string) {
    super(message);
    this.name = "TreasuryFeedError";
  }
}

function requireFact(condition: boolean, message: string): asserts condition {
  if (!condition) throw new TreasuryFeedError("invalid", message);
}

/** Fixed precision comparison preserves token and USD amounts above Number.MAX_SAFE_INTEGER. */
function usdUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}

function assetKey(asset: TreasuryAsset): string {
  return `${asset.chainId}:${asset.address?.toLowerCase() ?? "native"}`;
}

function checkRaw(raw: string): void {
  requireFact(BigInt(raw) <= UINT256_MAX, "Token amount exceeds uint256.");
}

function checkUnique(values: string[], label: string): void {
  requireFact(new Set(values).size === values.length, `Duplicate ${label}.`);
}

function assertSummary(actual: string | null, knownValues: string[], empty: boolean): void {
  if (!knownValues.length && !empty) {
    requireFact(actual === null, "An unknown portfolio subtotal must be null.");
    return;
  }
  const sum = knownValues.reduce((total, value) => total + usdUnits(value), 0n);
  requireFact(actual !== null && usdUnits(actual) === sum, "Portfolio subtotal does not match holdings.");
}

/** Validate accounting relationships, without deriving protocol values in the browser. */
export function validateTreasuryFeedSemantics(feed: TreasuryFeed): void {
  requireFact(feed.blockTimestamp <= feed.generatedAt, "Snapshot block follows observation time.");
  checkUnique(feed.accounts.map((a) => a.id), "account ID");
  checkUnique(feed.accounts.map((a) => a.address.toLowerCase()), "account address");
  checkUnique(feed.teams.map((t) => t.id), "team ID");
  checkUnique(feed.holdings.map((h) => h.id), "holding ID");
  checkUnique([...feed.allocations, ...feed.history].map((p) => p.id), "position ID");
  checkUnique(feed.holdings.map((h) => `${h.accountId}:${assetKey(h.asset)}`), "custody balance");
  const accounts = new Set(feed.accounts.map((a) => a.id));
  const teams = new Set(feed.teams.map((t) => t.id));
  const positionIds = new Set([...feed.allocations, ...feed.history].map((p) => p.id));
  const assetDecimals = new Map<string, number>();
  const checkAsset = (asset: TreasuryAsset): void => {
    const key = assetKey(asset);
    requireFact(!assetDecimals.has(key) || assetDecimals.get(key) === asset.decimals, "Conflicting asset decimals.");
    assetDecimals.set(key, asset.decimals);
    requireFact(asset.address !== null || asset.decimals === 18, "Native asset decimals must be 18.");
  };
  const checkAmounts = (amounts: TreasuryAllocation["originalFunding"]): void => {
    checkUnique(amounts.map((a) => assetKey(a.asset)), "asset in amount list");
    for (const amount of amounts) { checkRaw(amount.raw); checkAsset(amount.asset); }
  };

  for (const h of feed.holdings) {
    requireFact(accounts.has(h.accountId), "Unknown holding account.");
    requireFact(h.accountableTeamId === null || teams.has(h.accountableTeamId), "Unknown accountable team.");
    requireFact(h.positionKey === null || !positionIds.has(h.positionKey), "An external or closed position cannot be included in portfolio holdings.");
    requireFact(h.asset.chainId === 1, "Portfolio holdings must be on Ethereum.");
    checkAsset(h.asset);
    checkRaw(h.balanceRaw);
    requireFact(BigInt(h.balanceRaw) > 0n, "Portfolio must omit zero balances.");
    if (h.underlying) {
      requireFact(h.underlying.asset.chainId === 1, "Portfolio underlying must be on Ethereum.");
      requireFact(assetKey(h.underlying.asset) !== assetKey(h.asset), "A receipt cannot be its own underlying.");
      checkAmounts([h.underlying]);
    }
    const v = h.valuation;
    if (v.status === "unavailable") {
      requireFact(v.usdValue === null && v.usdValueExcludingYfi === null && v.source === null && v.asOf === null, "Unavailable valuation must remain null.");
    } else {
      requireFact(v.usdValue !== null && v.source !== null && v.asOf !== null, "A valuation needs an amount and dated source.");
      requireFact(v.asOf <= feed.blockTimestamp, "Valuation follows the snapshot block.");
      requireFact(v.usdValueExcludingYfi === null || usdUnits(v.usdValueExcludingYfi) <= usdUnits(v.usdValue), "Excluding-YFI valuation exceeds the full value.");
      if (h.asset.address?.toLowerCase() === YFI_ADDRESS) {
        requireFact(v.usdValueExcludingYfi !== null && usdUnits(v.usdValueExcludingYfi) === 0n, "Direct YFI must be excluded from the excluding-YFI valuation.");
      }
    }
  }

  for (const allocation of feed.allocations) {
    requireFact(teams.has(allocation.accountableTeamId), "Unknown allocation team.");
    checkAmounts(allocation.originalFunding);
    checkAmounts(allocation.plannedFunding);
    checkAmounts(allocation.expectedReturn.amounts);
    const o = allocation.outstanding;
    if (o.sourceKind === "unavailable") {
      requireFact(o.amounts === null && o.asOf === null, "Unavailable outstanding amount must remain null.");
    } else {
      requireFact(o.amounts !== null && o.amounts.length > 0 && o.asOf !== null, "An outstanding amount needs a dated source.");
      requireFact(o.asOf <= (o.sourceKind === "onchain" ? feed.blockTimestamp : feed.generatedAt), "Outstanding observation follows snapshot.");
      checkAmounts(o.amounts);
    }
    if (allocation.status === "pending") {
      requireFact(allocation.originalFunding.length === 0 && o.amounts === null, "Pending allocations cannot claim funding or an outstanding balance.");
    }
  }
  for (const item of feed.history) {
    requireFact(item.closedAt === null || item.closedAt <= feed.generatedAt, "Closure follows snapshot.");
  }
  const priced = feed.holdings.flatMap((h) => h.valuation.usdValue === null ? [] : [h.valuation.usdValue]);
  const excluding = feed.holdings.flatMap((h) => h.valuation.usdValueExcludingYfi === null ? [] : [h.valuation.usdValueExcludingYfi]);
  const unpriced = feed.holdings.length - priced.length;
  const unknownYfi = feed.holdings.filter((h) => h.valuation.usdValue !== null && h.valuation.usdValueExcludingYfi === null).length;
  requireFact(feed.summary.holdingCount === feed.holdings.length, "Holding count differs from inventory.");
  requireFact(feed.summary.unpricedHoldingCount === unpriced, "Unpriced count differs from inventory.");
  requireFact(feed.summary.unknownYfiSplitCount === unknownYfi, "Unknown YFI split count differs from inventory.");
  assertSummary(feed.summary.pricedUsdValue, priced, feed.holdings.length === 0);
  assertSummary(feed.summary.pricedUsdValueExcludingYfi, excluding, feed.holdings.length === 0);
  const valuationCoverage = !feed.holdings.length || !unpriced ? "complete" : !priced.length ? "unavailable" : "partial";
  requireFact(feed.coverage.valuation === valuationCoverage, "Valuation coverage differs from inventory.");
}

export function parseTreasuryFeed(value: unknown): TreasuryFeed {
  if (typeof value === "object" && value !== null && "version" in value && value.version !== 1) {
    throw new TreasuryFeedError("incompatible", "Unsupported treasury feed version.");
  }
  const parsed = TreasuryFeedSchema.safeParse(value);
  if (!parsed.success) throw new TreasuryFeedError("invalid", "Invalid treasury feed envelope.");
  validateTreasuryFeedSemantics(parsed.data);
  return parsed.data;
}

export function parseTreasuryFeedResponse(text: string): TreasuryFeed {
  if (new TextEncoder().encode(text).length > TREASURY_FEED_MAX_PAYLOAD_BYTES) {
    throw new TreasuryFeedError("oversized", "Treasury feed exceeds its size limit.");
  }
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new TreasuryFeedError("invalid", "Treasury feed is not JSON."); }
  return parseTreasuryFeed(value);
}
