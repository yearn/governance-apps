import { describe, expect, it } from "vitest";
import { groupTreasuryAccounts, treasuryAssetIconUrl, groupTreasuryHoldings, formatTreasuryAmount, formatTreasuryUsd, isTreasuryStale, selectTreasuryHoldings } from "@/lib/clients/treasury/display";
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
  it("formats compact mobile balances without turning tiny positive quantities into zero", () => {
    expect(formatTreasuryAmount("999319223819", 6, 2)).toBe("999,319.22");
    expect(formatTreasuryAmount("375242721985751", 18, 4)).toBe("0.0003");
    expect(formatTreasuryAmount("1", 18, 4)).toBe("<0.0001");
    expect(formatTreasuryAmount("0", 18, 4)).toBe("0");
    expect(formatTreasuryAmount("1", 18, 0)).toBe("<1");
    expect(() => formatTreasuryAmount("1", 18, -1)).toThrow(RangeError);
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

describe("compact treasury presentation", () => {
  const row = (id: string, value: string | null, purpose: "unspecified" | "operating" | "strategic" = "operating") => {
    const template = createTreasuryMockFeed().holdings[0];
    return { ...template, id, accountId: "ychad", positionKey: null, accountableTeamId: null, purposeNote: null, purpose,
      valuation: { ...template.valuation, usdValue: value, usdValueExcludingYfi: value } };
  };

  it("collapses priced dust without treating unknown prices as dust", () => {
    const rows = [row("small", "99.999999999999999999"), row("visible", "100"), row("known-unpriced", null), row("unclassified", null, "unspecified"), row("strategic-small", "1", "strategic"), { ...row("zero", "0"), balanceRaw: "0" }];
    const groups = groupTreasuryHoldings(rows);
    expect(groups.primary.map(h => h.id)).toEqual(["visible", "known-unpriced"]);
    expect(groups.small.map(h => h.id)).toEqual(["small", "strategic-small"]);
    expect(groups.other.map(h => h.id)).toEqual(["unclassified"]);
    expect(rows).toHaveLength(6);
  });

  it("retains curated positions and leaves display buckets stable when excluding YFI", () => {
    const curated = { ...row("curated", null), positionKey: "seed" };
    const yfi = { ...row("yfi", "1000"), valuation: { ...row("yfi", "1000").valuation, usdValueExcludingYfi: "0" } };
    const groups = groupTreasuryHoldings([curated, yfi], true);
    expect(groups.primary.map(h => h.id)).toEqual(["yfi", "curated"]);
    expect(groups.small).toHaveLength(0);
  });

  it("combines Robo custody, omits empty addresses, and includes collapsed values in exact subtotals", () => {
    const feed = createTreasuryMockFeed();
    feed.accounts = [feed.accounts[0], { id: "robo-treasury", label: "Robo", address: "0x1111111111111111111111111111111111111111", kind: "wallet" }, { id: "bucket", label: "Bucket", address: "0x2222222222222222222222222222222222222222", kind: "robo-inventory" }, { id: "empty", label: "Empty", address: "0x3333333333333333333333333333333333333333", kind: "wallet" }];
    feed.holdings = [{ ...row("a", "9007199254740993.000000000000000001"), accountId: "robo-treasury" }, { ...row("b", "0.000000000000000002"), accountId: "bucket" }, { ...row("c", null, "unspecified"), accountId: "bucket" }];
    const before = JSON.stringify(feed);
    const groups = groupTreasuryAccounts(feed, feed.holdings);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: "robo-treasury", kind: "robo", pricedUsdValue: "9007199254740993.000000000000000003", unpricedCount: 1 });
    expect(groups[0].accounts.map(a => a.id)).toEqual(["robo-treasury", "bucket"]);
    expect(groups[0].small.map(h => h.id)).toEqual(["b"]);
    expect(groups[0].other.map(h => h.id)).toEqual(["c"]);
    expect(selectTreasuryHoldings(feed, { accountId: "robo-treasury", teamId: "" })).toHaveLength(3);
    expect(JSON.stringify(feed)).toBe(before);
  });

  it("keeps annotated positions visible without inferring a policy or team", () => {
    const annotated = { ...row("annotated", null, "unspecified"), purposeNote: "Verified vault identity; valuation unavailable." };
    expect(groupTreasuryHoldings([annotated]).primary).toEqual([annotated]);
    expect(annotated.purpose).toBe("unspecified");
    expect(annotated.accountableTeamId).toBeNull();
  });

  it("keeps a wholly unvalued group subtotal unknown and a measured zero distinct", () => {
    const feed = createTreasuryMockFeed();
    expect(groupTreasuryAccounts(feed, [row("a", null)])[0].pricedUsdValue).toBeNull();
    expect(groupTreasuryAccounts(feed, [row("a", "0")])[0].pricedUsdValue).toBe("0");
    expect(groupTreasuryAccounts(feed, [])).toEqual([]);
  });

  it("uses chain and token identity for icons, never symbols or remote metadata URLs", () => {
    const asset = row("a", "1").asset;
    expect(treasuryAssetIconUrl({ ...asset, address: "0xAbCd000000000000000000000000000000000000", symbol: "https://untrusted.example/logo" })).toBe("https://token-assets-one.vercel.app/api/tokens/1/0xabcd000000000000000000000000000000000000/logo-128.png");
    expect(treasuryAssetIconUrl({ ...asset, address: null })).toBe("https://token-assets-one.vercel.app/api/chains/1/logo-128.png");
  });
});
