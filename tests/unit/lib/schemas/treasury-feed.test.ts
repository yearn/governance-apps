import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import { execFileSync } from "node:child_process";
import schema from "@/docs/apps/treasury/feed.schema.json";
import example from "@/docs/apps/treasury/examples/treasury.example.json";
import registry from "@/docs/apps/treasury/registry.json";
import { parseTreasuryFeed, parseTreasuryFeedResponse, TREASURY_FEED_MAX_PAYLOAD_BYTES, type TreasuryFeed } from "@/lib/schemas/treasury-feed";

// The contract uses the common subset of 2020-12 and draft-07. Ajv 6 is already a repo dependency.
const accepts = new Ajv({ allErrors: true }).compile({ ...schema, $schema: "http://json-schema.org/draft-07/schema#" });
const wire = () => structuredClone(example) as TreasuryFeed;
const unavailable = { usdValue: null, usdValueExcludingYfi: null, source: null, asOf: null, status: "unavailable" as const };

describe("treasury wire contract", () => {
  it("accepts the shared fixture through JSON Schema and the actual consumer", () => {
    expect(accepts(example), JSON.stringify(accepts.errors)).toBe(true);
    const feed = parseTreasuryFeedResponse(JSON.stringify(example));
    expect(feed.holdings).toHaveLength(6);
    expect(feed.summary.pricedUsdValue).toBe("8974235.824807");
    expect(feed.allocations).toHaveLength(8);
    expect(feed.history).toHaveLength(20);
  });
  it("keeps generated boundary types synchronized with the public contract", () => {
    expect(() => execFileSync(process.execPath, ["scripts/generate-treasury-contract.mjs", "--check"])).not.toThrow();
  });
  it.each(["-1", "00", "1e18", "1.5", " 1", ""])("rejects malformed raw amount %j in both validators", raw => {
    const feed = wire(); feed.holdings[0].balanceRaw = raw;
    expect(accepts(feed)).toBe(false);
    expect(() => parseTreasuryFeed(feed)).toThrow();
  });
  it("preserves exact uint256 amounts and rejects overflow", () => {
    const feed = wire(); feed.holdings[0].balanceRaw = ((1n << 256n) - 1n).toString();
    expect(parseTreasuryFeed(feed).holdings[0].balanceRaw).toBe(feed.holdings[0].balanceRaw);
    feed.holdings[0].balanceRaw = (1n << 256n).toString();
    expect(() => parseTreasuryFeed(feed)).toThrow(/uint256/);
  });
  it("rejects duplicate custody, unknown owners and inconsistent asset decimals", () => {
    const duplicate = wire(); duplicate.holdings.push({ ...duplicate.holdings[0], id: "different-display-key" });
    expect(() => parseTreasuryFeed(duplicate)).toThrow(/custody/);
    const reference = wire(); reference.holdings[0].accountId = "unknown";
    expect(() => parseTreasuryFeed(reference)).toThrow(/account/);
    const decimals = wire(); decimals.allocations.find(a => a.id === "aerodrome-liquidity-loan")!.originalFunding[0].asset.decimals = 6;
    expect(() => parseTreasuryFeed(decimals)).toThrow(/decimals/);
  });
  it("rejects a partial subtotal presented as a full valuation", () => {
    const feed = wire(); feed.holdings[0].valuation = unavailable;
    expect(() => parseTreasuryFeed(feed)).toThrow(/count/);
    feed.summary.unpricedHoldingCount = 1;
    feed.summary.pricedUsdValue = "2974235.824807";
    feed.coverage.valuation = "partial";
    expect(parseTreasuryFeed(feed).holdings[0].valuation.usdValue).toBeNull();
    feed.summary.pricedUsdValue = "8974235.824807";
    expect(() => parseTreasuryFeed(feed)).toThrow(/subtotal/);
  });
  it("keeps an unknown portfolio value distinct from an empty portfolio", () => {
    const feed = wire(); feed.holdings.forEach(h => { h.valuation = unavailable; });
    feed.summary = { holdingCount: 6, unpricedHoldingCount: 6, unknownYfiSplitCount: 0, pricedUsdValue: null, pricedUsdValueExcludingYfi: null };
    feed.coverage.valuation = "unavailable";
    expect(parseTreasuryFeed(feed).summary.pricedUsdValue).toBeNull();
    feed.summary.pricedUsdValue = "0";
    expect(() => parseTreasuryFeed(feed)).toThrow(/unknown/);
    feed.holdings = [];
    feed.summary = { holdingCount: 0, unpricedHoldingCount: 0, unknownYfiSplitCount: 0, pricedUsdValue: "0", pricedUsdValueExcludingYfi: "0" };
    feed.coverage.valuation = "complete";
    expect(parseTreasuryFeed(feed).summary.pricedUsdValue).toBe("0");
  });
  it("requires direct YFI exclusion and reports unknown wrapper exposure separately", () => {
    const feed = wire(); feed.holdings[0].valuation.usdValueExcludingYfi = "1";
    expect(() => parseTreasuryFeed(feed)).toThrow(/Direct YFI/);
    const wrapper = wire(); wrapper.holdings[2].valuation.usdValueExcludingYfi = null;
    wrapper.summary.unknownYfiSplitCount = 1;
    wrapper.summary.pricedUsdValueExcludingYfi = "1942188.935801";
    expect(parseTreasuryFeed(wrapper).summary.unknownYfiSplitCount).toBe(1);
  });
  it("rejects future observations and funding invented for pending allocations", () => {
    const future = wire(); future.holdings[0].valuation.asOf = future.blockTimestamp + 1;
    expect(() => parseTreasuryFeed(future)).toThrow(/follows/);
    const pending = wire(); const stonk = pending.allocations.find(a => a.status === "pending")!;
    stonk.originalFunding = stonk.plannedFunding;
    expect(() => parseTreasuryFeed(pending)).toThrow(/Pending/);
  });
  it("keeps closed and external allocations out of wallet positions", () => {
    const feed = wire(); feed.holdings[0].positionKey = feed.allocations[0].id;
    expect(() => parseTreasuryFeed(feed)).toThrow(/external or closed/);
    feed.holdings[0].positionKey = feed.history[0].id;
    expect(() => parseTreasuryFeed(feed)).toThrow(/external or closed/);
  });
  it.each(["javascript:alert(1)", "https://github.com.evil.example/x", "https://github.com@evil.example/x", "https://github.com/\nx", "http://etherscan.io/x"])("rejects unsafe evidence URL %s", url => {
    const feed = wire(); feed.allocations[0].evidence[0].url = url;
    expect(accepts(feed)).toBe(false);
    expect(() => parseTreasuryFeed(feed)).toThrow();
  });
  it("rejects incompatible, oversized and non-JSON responses", () => {
    expect(() => parseTreasuryFeed({ version: 2 })).toThrow(/Unsupported/);
    expect(() => parseTreasuryFeedResponse(" ".repeat(TREASURY_FEED_MAX_PAYLOAD_BYTES + 1))).toThrow(/size/);
    expect(() => parseTreasuryFeedResponse("broken")).toThrow(/JSON/);
  });
});

describe("reviewed treasury decisions", () => {
  it("assigns each of the twelve open or pending positions to the agreed team", () => {
    const assignments = [...registry.allocations, ...registry.portfolioPositions];
    expect(Object.fromEntries(registry.teams.map(team => [team.id, assignments.filter(p => p.accountableTeamId === team.id).map(p => p.id).sort()]))).toEqual({
      ylockers: ["aerodrome-liquidity-loan", "lqty-delegated-stake", "resupply-loan", "ycrv-liquidity", "ycrv-otc-inventory"],
      vaults: ["flex-usdc-seed", "ybold-investment-proceeds", "yvusd-seed"],
      curation: ["sherlock-bounty-deposit", "stonk-usdg-allocation"],
      "dao-ops": ["veyfi-matching-reserve", "ybc-strategic-allocation"],
    });
  });
  it("preserves the Aerodrome original-asset target and the YBC conditional return", () => {
    const aerodrome = registry.allocations.find(a => a.id === "aerodrome-liquidity-loan")!;
    expect(aerodrome.expectedReturn.terms).toBe("provisional");
    expect(aerodrome.expectedReturn.amounts.map(a => [a.asset.symbol, a.raw])).toEqual([["YFI", "33000000000000000000"], ["WETH", "61000000000000000000"]]);
    const ybc = registry.allocations.find(a => a.id === "ybc-strategic-allocation")!;
    expect(ybc.originalFunding[0].raw).toBe("200000000000000000000");
    expect(ybc.expectedReturn.amounts).toEqual([]);
    expect(ybc.expectedReturn.terms).toBe("unknown");
    expect(ybc.expectedReturn.note).toMatch(/YIP/);
    expect(ybc.outstanding.amounts).toBeNull();
  });
});
