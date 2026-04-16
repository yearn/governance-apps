import { describe, expect, it } from "vitest";
import {
  estimateRevenueCreditUsd,
  formatTeamsTokenAmount,
} from "@/lib/clients/teams";

describe("teams client helpers", () => {
  it("formats token amounts for mock deposit previews", () => {
    expect(formatTeamsTokenAmount("12345.6789")).toBe("12,345.6789");
    expect(formatTeamsTokenAmount("0")).toBe("0");
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
