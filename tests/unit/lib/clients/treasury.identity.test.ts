import { describe, expect, it } from "vitest";
import { treasuryLookalike } from "@/lib/clients/treasury/asset-identity";
import { groupTreasuryAccounts, groupTreasuryHoldings } from "@/lib/clients/treasury/display";
import { createTreasuryMockFeed } from "@/lib/clients/treasury/mock";

describe("treasury contract identity", () => {
  const template = createTreasuryMockFeed().holdings[0];
  const lookalike = { ...template, id: "usdc-lookalike", asset: { ...template.asset, symbol: "USDC", address: "0x211c1eb92d74cbda58ba82116502fd02dd8f319e" }, valuation: { status: "unavailable" as const, usdValue: null, usdValueExcludingYfi: null, source: null, asOf: null } };

  it("separates reviewed lookalikes without reclassifying canonical assets or unknown same-symbol contracts", () => {
    expect(treasuryLookalike(lookalike.asset)?.symbol).toBe("USDC");
    expect(treasuryLookalike({ ...lookalike.asset, address: lookalike.asset.address.toUpperCase() })?.symbol).toBe("USDC");
    expect(treasuryLookalike({ ...lookalike.asset, chainId: 10 })).toBeNull();
    expect(treasuryLookalike({ ...lookalike.asset, address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" })).toBeNull();
    expect(treasuryLookalike({ ...lookalike.asset, address: "0x1111111111111111111111111111111111111111" })).toBeNull();
    expect(treasuryLookalike({ ...lookalike.asset, address: "0x89d3ac7c32aa14bee6fa90e041241dc4eebbdfb3", symbol: "changed-name" })?.symbol).toBe("USDC");
  });

  it("preserves all balances and accounting while changing the display bucket", () => {
    const rows = [template, lookalike];
    const before = JSON.stringify(rows);
    const buckets = groupTreasuryHoldings(rows);
    expect(buckets.lookalikes).toEqual([lookalike]);
    expect(buckets.primary).toEqual([template]);
    expect(buckets.other).toEqual([]);
    const group = groupTreasuryAccounts(createTreasuryMockFeed(), rows)[0];
    expect(group.unpricedCount).toBe(1);
    expect(group.pricedUsdValue).toBe(template.valuation.usdValue);
    expect(JSON.stringify(rows)).toBe(before);
  });
});
