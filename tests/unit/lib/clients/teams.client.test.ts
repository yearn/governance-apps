import { describe, expect, it } from "vitest";
import {
  addTeamsDecimalStrings,
  cloneTeamsMockScenarioData,
  deriveTeamsViewerForTeam,
  divideTeamsDecimalToRawUnits,
  estimateRevenueCreditUsd,
  formatTeamsAmount,
  formatTeamsDate,
  formatTeamsDecimal,
  formatTeamsPercentFromBps,
  formatTeamsTokenAmount,
  getTeamsDepositReadiness,
  multiplyTeamsDecimalsToFixed,
  parsePositiveTeamsTokenAmountRaw,
} from "@/lib/clients/teams";

describe("teams client helpers", () => {
  it("formats token amounts for revenue previews and bonus summaries", () => {
    expect(formatTeamsTokenAmount("12345.6789")).toBe("12,345.6789");
    expect(formatTeamsTokenAmount("14.5", "YFI")).toBe("14.5 YFI");
    expect(formatTeamsTokenAmount("12345.678", "YFI")).toBe("12,345.68 YFI");
    expect(formatTeamsTokenAmount("0")).toBe("0");
    expect(formatTeamsTokenAmount("0.004", "YFI")).toBe("0.004 YFI");
    expect(formatTeamsTokenAmount("0.000001", "USDC")).toBe("<0.0001 USDC");
    expect(
      formatTeamsTokenAmount("0.000000000000000001", "YFI")
    ).toBe("<0.0001 YFI");
    expect(formatTeamsAmount("0.000000000000000001")).toBe("<0.0001");
  });

  it("parses only positive token input for action forms", () => {
    expect(parsePositiveTeamsTokenAmountRaw("1.25", 6)).toBe(1_250_000n);
    expect(parsePositiveTeamsTokenAmountRaw("0", 6)).toBeNull();
    expect(parsePositiveTeamsTokenAmountRaw("-1", 6)).toBeNull();
    expect(parsePositiveTeamsTokenAmountRaw("invalid", 6)).toBeNull();
  });

  it("formats and calculates values above Number.MAX_SAFE_INTEGER exactly", () => {
    expect(formatTeamsDecimal("132098434249473800.125", 2)).toBe(
      "132,098,434,249,473,800.13"
    );
    expect(formatTeamsDecimal("0.0001", 2)).toBe("0");
    expect(formatTeamsDecimal("-0.0001", 2)).toBe("0");
    expect(formatTeamsDecimal("not-a-number", 2)).toBe("0");
    expect(
      addTeamsDecimalStrings([
        "9007199254740993.25",
        "9007199254740993.75",
      ])
    ).toBe("18014398509481987");
    expect(
      multiplyTeamsDecimalsToFixed("9007199254740993.25", "1.125", 2)
    ).toBe("10133099161583617.41");
    expect(divideTeamsDecimalToRawUnits("8.5", "2.5", 6)).toBe(3_400_000n);
    expect(
      formatTeamsAmount("999999999999999999999999.99995")
    ).toBe("1,000,000,000,000,000,000,000,000");
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

  it("does not invent a quote from an oracle field alone", () => {
    expect(
      estimateRevenueCreditUsd(
        {
          symbol: "USDC",
          tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          decimals: 6,
          isConvertible: false,
          convertToSymbol: null,
          oraclePriceUsd: "1.00",
          previewAmount: null,
          estimatedCreditUsd: null,
        },
        "1000"
      )
    ).toBeNull();
  });

  it("derives permissionless deposit readiness atomically for the selected team", () => {
    const data = cloneTeamsMockScenarioData("finance-operator-revenue");
    const team = data.teams.find((entry) => entry.id === "platform")!;
    const observer = {
      ...data.viewer,
      role: "observer" as const,
      address: "0x9999999999999999999999999999999999999999",
      teamId: null,
      walletStatus: "mainnet" as const,
      canDepositRevenue: false,
    };
    const readyViewer = deriveTeamsViewerForTeam(observer, team);

    expect(readyViewer.canDepositRevenue).toBe(true);
    expect(getTeamsDepositReadiness(team, readyViewer, true)).toEqual({
      state: "ready",
      canSubmit: true,
    });

    const untrusted = deriveTeamsViewerForTeam(
      {
        ...observer,
        actionStateTrusted: false,
      },
      team
    );
    expect(untrusted.canDepositRevenue).toBe(false);
    expect(getTeamsDepositReadiness(team, untrusted, false)).toEqual({
      state: "untrusted",
      canSubmit: false,
    });

    const disconnected = deriveTeamsViewerForTeam(
      {
        ...observer,
        address: null,
        walletStatus: "disconnected",
      },
      team
    );
    expect(getTeamsDepositReadiness(team, disconnected, true)).toEqual({
      state: "disconnected",
      canSubmit: false,
    });

    const wrongNetwork = deriveTeamsViewerForTeam(
      {
        ...observer,
        walletStatus: "switch-mainnet",
      },
      team
    );
    expect(getTeamsDepositReadiness(team, wrongNetwork, true)).toEqual({
      state: "switch-mainnet",
      canSubmit: false,
    });
  });

  it("separates restricted teams from teams with no supported tokens", () => {
    const data = cloneTeamsMockScenarioData("finance-operator-revenue");
    const team = data.teams.find((entry) => entry.id === "platform")!;
    const viewer = {
      ...deriveTeamsViewerForTeam(data.viewer, team),
      walletStatus: "mainnet" as const,
    };
    const restrictedTeam = {
      ...team,
      status: "retired" as const,
      readOnlyReason: "retired" as const,
    };
    const unsupportedTeam = {
      ...team,
      revenueOptions: [],
    };

    expect(
      getTeamsDepositReadiness(
        restrictedTeam,
        deriveTeamsViewerForTeam(viewer, restrictedTeam),
        true
      )
    ).toEqual({
      state: "restricted",
      canSubmit: false,
    });
    expect(
      getTeamsDepositReadiness(
        unsupportedTeam,
        deriveTeamsViewerForTeam(viewer, unsupportedTeam),
        true
      )
    ).toEqual({
      state: "unsupported",
      canSubmit: false,
    });
  });
});
