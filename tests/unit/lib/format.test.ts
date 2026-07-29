import { describe, it, expect } from "vitest";
import {
  formatDecimalAmount,
  formatInputAmount,
  formatPercent,
  formatTokenAmount,
  formatUsd,
  formatUsdDecimal,
  getEpochInfo,
} from "@/lib/format";
import { parseAmount } from "@/lib/parse";

describe("format helpers", () => {
  it("parseAmount handles decimals and dust", () => {
    const exact = parseAmount("1.23", 18);
    expect(exact.isValid).toBe(true);
    expect(exact.amount).toBe(1230000000000000000n);

    const dust = parseAmount("0.000000000000000001", 18);
    expect(dust.isValid).toBe(true);
    expect(dust.amount).toBe(1n);
  });

  it("parseAmount rejects invalid strings", () => {
    const tiny = parseAmount("0.0000000000000000001", 18);
    expect(tiny.isValid).toBe(true);
    expect(tiny.amount).toBe(0n);

    const nonsense = parseAmount("abc", 18);
    expect(nonsense.isValid).toBe(false);
  });

  it("formatTokenAmount handles rounding, large numbers, and zero", () => {
    expect(formatTokenAmount(0n)).toBe("0");

    const rounded = formatTokenAmount(1234567890000000000n, 18, 4);
    expect(rounded).toBe("1.2346");

    const large = formatTokenAmount(1234567890000000000000n, 18, 4);
    expect(large).toBe("1,234.5679");
  });

  it("formats 0, 6, and 18 decimal bigint values without Number conversion", () => {
    expect(formatTokenAmount(12_345n, 0, 2)).toBe("12,345");
    expect(formatTokenAmount(123_456_789n, 6, 4)).toBe("123.4568");
    expect(
      formatTokenAmount(
        132_098_434_249_473_800_123_456_789_012_345_678n,
        18,
        2,
      ),
    ).toBe("132,098,434,249,473,800.12");

    expect(formatUsd(0n, 6, 2)).toBe("$0.00");
    expect(formatUsd(1n, 0, 2)).toBe("$1.00");
    expect(formatInputAmount(1_234_500n, 6)).toBe("1.2345");
  });

  it("rounds carry boundaries and signed decimal strings exactly", () => {
    expect(formatDecimalAmount("999999999999999999999999.99995", 4)).toBe(
      "1,000,000,000,000,000,000,000,000",
    );
    expect(formatDecimalAmount("-1234.56785", 4)).toBe("-1,234.5679");
    expect(formatUsd(999_995n, 6, 2)).toBe("$1.00");
    expect(formatUsdDecimal("-9007199254740993.25")).toBe(
      "-$9,007,199,254,740,993.25",
    );
  });

  it("distinguishes signed dust from confirmed zero", () => {
    expect(formatTokenAmount(0n, 18, 4)).toBe("0");
    expect(formatTokenAmount(1n, 18, 4)).toBe("<0.0001");
    expect(formatTokenAmount(-1n, 18, 4)).toBe(">-0.0001");
    expect(formatUsd(1n, 18, 2)).toBe("<$0.01");
    expect(formatUsd(-1n, 18, 2)).toBe(">-$0.01");
  });

  it("rejects malformed decimal strings without changing percent fallback", () => {
    expect(formatDecimalAmount(null)).toBe("--");
    expect(formatDecimalAmount("")).toBe("--");
    expect(formatDecimalAmount("1e3")).toBe("--");
    expect(formatUsdDecimal("1,000.00")).toBe("--");
    expect(formatDecimalAmount(`0.${"1".repeat(256)}`)).toBe("--");
    expect(formatPercent(Number.NaN)).toBe("0%");
  });

  it("getEpochInfo handles genesis boundaries", () => {
    const genesis = 1000n;
    const epochLength = 10;

    const atGenesis = getEpochInfo(genesis, epochLength, 1000);
    expect(atGenesis.currentEpoch).toBe(0);
    expect(atGenesis.epochStart).toBe(1000);
    expect(atGenesis.epochEnd).toBe(1010);

    const nextEpoch = getEpochInfo(genesis, epochLength, 1010);
    expect(nextEpoch.currentEpoch).toBe(1);
    expect(nextEpoch.epochStart).toBe(1010);
    expect(nextEpoch.epochEnd).toBe(1020);
  });
});
