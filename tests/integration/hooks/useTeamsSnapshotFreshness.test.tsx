import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TEAMS_SNAPSHOT_MAX_AGE_SECONDS,
  type TeamsCanonicalSnapshot,
} from "@/lib/clients/teams";
import { useTeamsSnapshotFreshness } from "@/lib/hooks/useTeams";

const MOUNT_TIME_MS = 2_000_000_000_000;

describe("useTeamsSnapshotFreshness", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses verification time when a snapshot is accepted long after mount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(MOUNT_TIME_MS);
    const initialProps: {
      acceptedAtSeconds: number | null;
      snapshot: TeamsCanonicalSnapshot | null;
    } = {
      acceptedAtSeconds: null,
      snapshot: null,
    };
    const { result, rerender } = renderHook(
      ({
        acceptedAtSeconds,
        snapshot,
      }: {
        acceptedAtSeconds: number | null;
        snapshot: TeamsCanonicalSnapshot | null;
      }) =>
        useTeamsSnapshotFreshness(snapshot, acceptedAtSeconds),
      { initialProps }
    );
    expect(result.current.isCurrent).toBe(false);

    vi.setSystemTime(
      MOUNT_TIME_MS + (TEAMS_SNAPSHOT_MAX_AGE_SECONDS + 1) * 1_000
    );
    act(() => {
      rerender({
        acceptedAtSeconds: Math.floor(
          (MOUNT_TIME_MS +
            (TEAMS_SNAPSHOT_MAX_AGE_SECONDS + 1) * 1_000) /
            1_000
        ),
        snapshot: {
          blockHash:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          blockNumber: 100n,
          blockTimestamp: Math.floor(MOUNT_TIME_MS / 1_000),
          numTeams: 1n,
          tipBlockNumber: 100n,
        },
      });
    });

    expect(result.current.isCurrent).toBe(false);
    expect(result.current.warning?.message).toMatch(
      /older than twenty minutes/i
    );
  });
});
