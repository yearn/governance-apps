import example from "@/docs/apps/treasury/examples/treasury.example.json";
import { parseTreasuryFeed, type TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryClient } from "./types";

export type TreasuryMockScenario = "ready" | "loading" | "error" | "empty" | "stale" | "partial" | "long-metadata";
export function parseTreasuryMockScenario(value: string | null): TreasuryMockScenario {
  return value === "loading" || value === "error" || value === "empty" || value === "stale" || value === "partial" || value === "long-metadata" ? value : "ready";
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
  if (scenario === "long-metadata") {
    feed.holdings[0].asset.symbol = "W".repeat(40);
    feed.holdings[0].asset.name = "N".repeat(120);
    feed.holdings[0].valuation.source = "chainlink:0x" + "a".repeat(188);
    feed.holdings.push({ ...structuredClone(feed.holdings[0]), id: "unclassified-example", purposeNote: null, positionKey: null, accountableTeamId: null, purpose: "unspecified", asset: { ...feed.holdings[0].asset, address: "0x9999999999999999999999999999999999999999", symbol: "X".repeat(40) }, valuation: { usdValue: null, usdValueExcludingYfi: null, source: null, asOf: null, status: "unavailable" } });
    feed.summary.holdingCount += 1;
    feed.summary.unpricedHoldingCount += 1;
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
