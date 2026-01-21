import { describe, it, expect } from "vitest";
import { formatTokenAmount, getEpochInfo } from "@/lib/format";
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
