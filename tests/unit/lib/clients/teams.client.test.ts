import { describe, expect, it } from "vitest";
import {
  estimateRevenueCreditUsd,
  formatTeamsDate,
  formatTeamsPercentFromBps,
  formatTeamsTokenAmount,
} from "@/lib/clients/teams";

describe("teams client helpers", () => {
  it("formats token amounts for revenue previews and bonus summaries", () => {
    expect(formatTeamsTokenAmount("12345.6789")).toBe("12,345.6789");
    expect(formatTeamsTokenAmount("14.5", "YFI")).toBe("14.5 YFI");
    expect(formatTeamsTokenAmount("12345.678", "YFI")).toBe("12,345.68 YFI");
    expect(formatTeamsTokenAmount("0")).toBe("0");
  });

  it("formats basis points as percentages", () => {
    expect(formatTeamsPercentFromBps(11_000)).toBe("110%");
    expect(formatTeamsPercentFromBps(1_000)).toBe("10%");
  });

  it("formats mock timestamps in a stable UTC date", () => {
    expect(formatTeamsDate(1_771_200_000)).toBe("Feb 16, 2026");
    expect(formatTeamsDate(null)).toBeNull();
  });

  it("scales credited USD from the quoted revenue preview", () => {
    expect(
      estimateRevenueCreditUsd(
        {
          symbol: "USDC",
          tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          decimals: 6,
          isConvertible: true,
          convertToSymbol: "yvUSDC-1",
          oraclePriceUsd: "1.00",
          previewAmount: "10000",
          estimatedCreditUsd: "9985.40",
        },
        "2500"
      )
    ).toBe("2496.35");
  });

  it("rejects empty or non-positive mock deposit amounts", () => {
    expect(
      estimateRevenueCreditUsd(
        {
          symbol: "DAI",
          tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          decimals: 18,
          isConvertible: false,
          convertToSymbol: null,
          oraclePriceUsd: "1.00",
          previewAmount: "7500",
          estimatedCreditUsd: "7500.00",
        },
        "0"
      )
    ).toBeNull();
    expect(
      estimateRevenueCreditUsd(
        {
          symbol: "DAI",
          tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          decimals: 18,
          isConvertible: false,
          convertToSymbol: null,
          oraclePriceUsd: "1.00",
          previewAmount: "7500",
          estimatedCreditUsd: "7500.00",
        },
        ""
      )
    ).toBeNull();
  });
});
