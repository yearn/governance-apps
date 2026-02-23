import { describe, expect, it } from "vitest";
import {
  getVeyfiBoostMultiplier,
  getVeyfiEpochBoostMultiplier,
  getVeyfiMigratedBoostMultiplier,
  resolveVeyfiDisplayBoostMultiplier,
} from "@/lib/clients/veyfi/boost";

describe("getVeyfiBoostMultiplier", () => {
  const FOUR_YEARS_SECONDS = 4 * 365 * 24 * 60 * 60;

  it("returns max boost at full lock duration", () => {
    expect(getVeyfiBoostMultiplier(FOUR_YEARS_SECONDS, 0)).toBe(2);
  });

  it("returns min boost after unlock time", () => {
    expect(getVeyfiBoostMultiplier(1, 2)).toBe(1);
  });
});

describe("getVeyfiEpochBoostMultiplier", () => {
  it("returns 2.0x for epoch 0", () => {
    expect(getVeyfiEpochBoostMultiplier(0)).toBe(2);
  });

  it("returns sub-2.0x in epoch 1", () => {
    expect(getVeyfiEpochBoostMultiplier(1)).toBeCloseTo(1.990384615, 9);
  });

  it("floors at 1.0x once boost epochs are exhausted", () => {
    expect(getVeyfiEpochBoostMultiplier(104)).toBe(1);
    expect(getVeyfiEpochBoostMultiplier(130)).toBe(1);
  });

  it("supports custom max boost and epoch count", () => {
    expect(
      getVeyfiEpochBoostMultiplier(5, {
        maxBoostMultiplier: 1.5,
        boostEpochs: 10,
      })
    ).toBe(1.25);
  });
});

describe("getVeyfiMigratedBoostMultiplier", () => {
  it("calculates user-specific boost from boostEpochs and current epoch", () => {
    expect(getVeyfiMigratedBoostMultiplier(95, 1)).toBeCloseTo(1.9038461538, 10);
  });

  it("returns 1.0x when the current epoch is past boost epochs", () => {
    expect(getVeyfiMigratedBoostMultiplier(20, 40)).toBe(1);
  });

  it("clamps out-of-range boost epochs to the protocol max", () => {
    expect(getVeyfiMigratedBoostMultiplier(999, 0)).toBe(2);
  });
});

describe("resolveVeyfiDisplayBoostMultiplier", () => {
  it("prefers stats max boost when available", () => {
    expect(
      resolveVeyfiDisplayBoostMultiplier({
        statsMaxBoostMultiplier: 1.99,
        tokenBoostMultiplier: 1.5,
        globalMaxBoostBps: 19800,
      })
    ).toBe(1.99);
  });

  it("prefers token boost over global when token-preferred mode is enabled", () => {
    expect(
      resolveVeyfiDisplayBoostMultiplier({
        tokenBoostMultiplier: 1.7,
        globalMaxBoostBps: 19500,
        preferTokenBoost: true,
      })
    ).toBe(1.7);
  });

  it("uses global max boost bps before token fallback by default", () => {
    expect(
      resolveVeyfiDisplayBoostMultiplier({
        tokenBoostMultiplier: 1.4,
        globalMaxBoostBps: 19900,
      })
    ).toBe(1.99);
  });

  it("falls back to 1 when all sources are invalid", () => {
    expect(
      resolveVeyfiDisplayBoostMultiplier({
        statsMaxBoostMultiplier: null,
        tokenBoostMultiplier: null,
        globalMaxBoostBps: null,
      })
    ).toBe(1);
  });
});
