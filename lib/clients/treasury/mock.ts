import example from "@/docs/apps/treasury/examples/treasury.example.json";
import { parseTreasuryFeed, type TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryClient } from "./types";

export type TreasuryMockScenario = "ready" | "loading" | "error" | "empty" | "stale" | "partial" | "long-metadata" | "redemption" | "redemption-funded";
export function parseTreasuryMockScenario(value: string | null): TreasuryMockScenario {
  return value === "loading" || value === "error" || value === "empty" || value === "stale" || value === "partial" || value === "long-metadata" || value === "redemption" || value === "redemption-funded" ? value : "ready";
}

/** Fixed example data. Never selected as a fallback for a failed live request. */
export function createTreasuryMockFeed(scenario: TreasuryMockScenario = "ready"): TreasuryFeed {
  const feed = structuredClone(parseTreasuryFeed(example));
  if (scenario === "empty") {
    feed.holdings = [];
    feed.summary = { holdingCount: 0, pricedUsdValue: "0", pricedUsdValueExcludingYfi: "0", unpricedHoldingCount: 0, unknownYfiSplitCount: 0 };
  }
  if (scenario === "partial") {
    for (const holding of feed.holdings) {
      holding.valuation = { usdValue: null, usdValueExcludingYfi: null, source: null, asOf: null, status: "unavailable" };
    }
    feed.summary = { holdingCount: feed.holdings.length, pricedUsdValue: null, pricedUsdValueExcludingYfi: null, unpricedHoldingCount: feed.holdings.length, unknownYfiSplitCount: 0 };
    feed.coverage.valuation = "unavailable";
    feed.coverage.warnings = ["Prices could not be refreshed. Asset balances are still available."];
  }
  if (scenario === "redemption" || scenario === "redemption-funded") {
    feed.holdings[0] = {
      ...feed.holdings[0],
      id: "ychad-dyfi",
      asset: { chainId: 1, address: "0x41252e8691e964f7de35156b68493bab6797a275", symbol: "dYFI", name: "Discounted YFI", decimals: 18 },
      balanceRaw: "12000000000000000000",
      valuation: {
        usdValue: "3000", usdValueExcludingYfi: "0", source: "dyfi-redemption:0x4707c855323545223fa2ba4150a83950f6f53b6e",
        asOf: feed.blockTimestamp, status: "current",
        redemption: {
          contract: "0x4707c855323545223fa2ba4150a83950f6f53b6e", ethRequiredRaw: "1250000000000000001",
          yfiAvailableRaw: scenario === "redemption-funded" ? "12000000000000000000" : "0",
          fundingStatus: scenario === "redemption-funded" ? "funded" : "awaiting-yfi",
        },
      },
    };
    feed.summary.pricedUsdValue = "2977235.824807";
  }
  if (scenario === "long-metadata") {
    feed.holdings[0].asset.symbol = "W".repeat(40);
    feed.holdings[0].asset.name = "N".repeat(120);
    feed.holdings[0].valuation.source = "chainlink:0x" + "a".repeat(188);
    feed.holdings.push({ ...structuredClone(feed.holdings[0]), id: "unclassified-example", purposeNote: null, positionKey: null, accountableTeamId: null, purpose: "unspecified", asset: { ...feed.holdings[0].asset, address: "0x9999999999999999999999999999999999999999", symbol: "X".repeat(40) }, valuation: { usdValue: null, usdValueExcludingYfi: null, source: null, asOf: null, status: "unavailable" } });
    feed.holdings.push({ ...structuredClone(feed.holdings[0]), id: "lookalike-example", purposeNote: null, positionKey: null, accountableTeamId: null, purpose: "unspecified", balanceRaw: ((1n << 256n) - 1n).toString(), asset: { ...feed.holdings[0].asset, address: "0x89d3ac7c32aa14bee6fa90e041241dc4eebbdfb3", symbol: "ՍSDС", decimals: 6 }, valuation: { usdValue: null, usdValueExcludingYfi: null, source: null, asOf: null, status: "unavailable" } });
    feed.summary.holdingCount += 2;
    feed.summary.unpricedHoldingCount += 2;
    feed.coverage.valuation = "partial";
  }
  return parseTreasuryFeed(feed);
}

export function createMockTreasuryClient(scenario: TreasuryMockScenario): TreasuryClient {
  return { read: async () => {
    if (scenario === "error") throw new Error("Example unavailable state.");
    return createTreasuryMockFeed(scenario);
  } };
}
