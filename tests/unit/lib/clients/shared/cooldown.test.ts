import { describe, it, expect } from "vitest";
import { deriveCooldownEndsAt } from "@/lib/clients/shared/cooldown";
import { STREAM_DURATION } from "@/lib/constants";

describe("deriveCooldownEndsAt", () => {
  it("returns now + duration when nothing has unlocked", () => {
    const now = 1_000_000;
    const endsAt = deriveCooldownEndsAt({
      total: 100n,
      claimed: 0n,
      withdrawable: 0n,
      durationSeconds: STREAM_DURATION,
      nowSecondsOverride: now,
    });

    expect(endsAt).toBe(now + STREAM_DURATION);
  });

  it("uses unlocked progress from claimed and withdrawable amounts", () => {
    const now = 2_000_000;
    const endsAtFromClaimed = deriveCooldownEndsAt({
      total: 100n,
      claimed: 50n,
      withdrawable: 0n,
      durationSeconds: STREAM_DURATION,
      nowSecondsOverride: now,
    });
    const endsAtFromWithdrawable = deriveCooldownEndsAt({
      total: 100n,
      claimed: 0n,
      withdrawable: 50n,
      durationSeconds: STREAM_DURATION,
      nowSecondsOverride: now,
    });

    expect(endsAtFromClaimed).toBe(now + STREAM_DURATION / 2);
    expect(endsAtFromWithdrawable).toBe(now + STREAM_DURATION / 2);
  });

  it("clamps progress at total to avoid negative remaining time", () => {
    const now = 3_000_000;
    const endsAt = deriveCooldownEndsAt({
      total: 100n,
      claimed: 120n,
      withdrawable: 10n,
      durationSeconds: STREAM_DURATION,
      nowSecondsOverride: now,
    });

    expect(endsAt).toBe(now);
  });
});
