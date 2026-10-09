import { describe, expect, it } from "vitest";
import { groupTreasuryHoldings, formatTreasuryAmount, formatTreasuryUsd, isTreasuryStale, selectTreasuryHoldings } from "@/lib/clients/treasury/display";
import { createTreasuryMockFeed } from "@/lib/clients/treasury/mock";
import { TREASURY_FEED_STALE_SECONDS } from "@/lib/schemas/treasury-feed";

describe("treasury display", () => {
  it("sorts values exactly beyond Number precision without mutating inventory", () => {
    const template = createTreasuryMockFeed().holdings[0];
    const rows = ["9007199254740993.000000000000000001", "9007199254740993.000000000000000002"].map((value, index) => ({ ...template, id: "priced-" + index, valuation: { ...template.valuation, usdValue: value } }));
    expect(groupTreasuryHoldings(rows).primary.map(h => h.id)).toEqual(["priced-1", "priced-0"]);
    expect(rows[0].id).toBe("priced-0");
  });
  it("preserves the integer part of balances above the safe number range", () => {
    expect(formatTreasuryAmount("9007199254740993000000000000000001", 18)).toBe("9,007,199,254,740,993");
    expect(formatTreasuryAmount("1", 18)).toBe("<0.000001");
    expect(formatTreasuryAmount("33000000000000000000", 18)).toBe("33");
  });
  it("distinguishes unavailable valuation from a real zero", () => {
    expect(formatTreasuryUsd(null)).toBe("Unavailable");
    expect(formatTreasuryUsd("0")).toBe("$0");
    expect(formatTreasuryUsd("9007199254740993.55")).toBe("$9,007,199,254,740,994");
    expect(formatTreasuryUsd("0.009")).toBe("<$0.01");
    expect(formatTreasuryUsd("0.1")).toBe("$0.10");
  });
  it("filters only rows, leaving the producer summary unchanged", () => {
    const feed = createTreasuryMockFeed();
    const summary = JSON.stringify(feed.summary);
    expect(selectTreasuryHoldings(feed, { accountId: "treasury", teamId: "vaults" })).toHaveLength(2);
    expect(selectTreasuryHoldings(feed, { accountId: "ychad", teamId: "vaults" })).toHaveLength(0);
    expect(JSON.stringify(feed.summary)).toBe(summary);
  });
  it("uses observation time for freshness, including when the last fetch succeeded", () => {
    const feed = createTreasuryMockFeed();
    expect(isTreasuryStale(feed, feed.blockTimestamp + TREASURY_FEED_STALE_SECONDS)).toBe(false);
    expect(isTreasuryStale(feed, feed.generatedAt + TREASURY_FEED_STALE_SECONDS + 1)).toBe(true);
  });
  it.each(["ready", "empty", "stale", "partial", "long-metadata"] as const)("keeps the %s fixture schema-valid", (scenario) => {
    const feed = createTreasuryMockFeed(scenario);
    expect(feed.mode).toBe("fixture");
    if (scenario === "partial") expect(feed.summary.pricedUsdValue).toBeNull();
  });
});
