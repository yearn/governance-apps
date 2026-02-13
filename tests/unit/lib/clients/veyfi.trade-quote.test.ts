import { describe, expect, it } from "vitest";
import { computeTradeQuote } from "@/lib/clients/veyfi/trade-quote";

describe("computeTradeQuote", () => {
  it("fails safely for invalid exchange rates", () => {
    expect(
      computeTradeQuote({
        amount: 10n * 10n ** 18n,
        exchangeRate: 0n,
        isSell: true,
      })
    ).toEqual({
      hasValidExchangeRate: false,
      yfiValue: 0n,
      llyfiValue: 0n,
    });
  });

  it("computes sell-side amounts when exchange rate is valid", () => {
    expect(
      computeTradeQuote({
        amount: 8n * 10n ** 18n,
        exchangeRate: 4n,
        isSell: true,
      })
    ).toEqual({
      hasValidExchangeRate: true,
      yfiValue: 2n * 10n ** 18n,
      llyfiValue: 8n * 10n ** 18n,
    });
  });

  it("computes buy-side amounts when exchange rate is valid", () => {
    expect(
      computeTradeQuote({
        amount: 3n * 10n ** 18n,
        exchangeRate: 2n,
        isSell: false,
      })
    ).toEqual({
      hasValidExchangeRate: true,
      yfiValue: 3n * 10n ** 18n,
      llyfiValue: 6n * 10n ** 18n,
    });
  });
});
