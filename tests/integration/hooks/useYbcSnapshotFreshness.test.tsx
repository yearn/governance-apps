import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useYbcSnapshotFreshness,
  YBC_SNAPSHOT_MAX_AGE_SECONDS,
} from "@/lib/hooks/useYbc";

describe("useYbcSnapshotFreshness", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pauses actions when a verified block ages out without another render", async () => {
    const blockTimestamp = 2_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(blockTimestamp * 1_000);
    const { result } = renderHook(() =>
      useYbcSnapshotFreshness(blockTimestamp, blockTimestamp)
    );

    expect(result.current.isCurrent).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        (YBC_SNAPSHOT_MAX_AGE_SECONDS + 1) * 1_000
      );
    });

    expect(result.current.isCurrent).toBe(false);
  });

  it("rejects a snapshot immediately when verification completes after the age boundary", () => {
    const blockTimestamp = 2_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(blockTimestamp * 1_000);
    const { result, rerender } = renderHook(
      ({
        timestamp,
        verifiedAtSeconds,
      }: {
        timestamp: number | null;
        verifiedAtSeconds: number | null;
      }) =>
        useYbcSnapshotFreshness(timestamp, verifiedAtSeconds),
      {
        initialProps: {
          timestamp: null as number | null,
          verifiedAtSeconds: null as number | null,
        },
      }
    );

    vi.setSystemTime(
      (blockTimestamp + YBC_SNAPSHOT_MAX_AGE_SECONDS + 1) * 1_000
    );
    rerender({
      timestamp: blockTimestamp,
      verifiedAtSeconds:
        blockTimestamp + YBC_SNAPSHOT_MAX_AGE_SECONDS + 1,
    });

    expect(result.current.isCurrent).toBe(false);
  });
});
