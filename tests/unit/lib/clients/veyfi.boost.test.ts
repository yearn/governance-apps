import { describe, expect, it } from "vitest";
import {
  getVeyfiBoostMultiplier,
  getVeyfiEpochBoostMultiplier,
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
