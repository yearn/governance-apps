"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EpochInfo } from "@/lib/clients/styfi/types";
import { nowSeconds } from "@/lib/mocks/time";
import { useOptionalProtocol } from "@/state/protocol";
import {
  getEpochWindowFromBase,
  parseUnixSeconds,
  resolveEpochClockBase,
  type EpochClockBase,
  type EpochClockSource,
  type EpochWindow,
} from "@/lib/epochClock";

const CLOCK_REFRESH_MS = 60_000;

function computeInitialBase(
  s3Timestamp: number | null,
  localNowSeconds: number
): EpochClockBase {
  if (s3Timestamp !== null) {
    return {
      source: "s3",
      sourceTimestamp: s3Timestamp,
      offsetSeconds: s3Timestamp - localNowSeconds,
    };
  }
  return {
    source: "local",
    sourceTimestamp: localNowSeconds,
    offsetSeconds: 0,
  };
}

export type EpochClock = {
  now: number;
  source: EpochClockSource;
  offsetSeconds: number;
  sourceTimestamp: number;
  epoch: EpochWindow;
  epochInfo: EpochInfo;
};

export function useEpochClock({ tickMs = 1000 }: { tickMs?: number } = {}) {
  const protocol = useOptionalProtocol();
  const usesMockBackend = protocol?.usesMockBackend ?? false;
  const publicClient = protocol?.publicClient ?? null;
  const globalData = protocol?.globalData ?? null;
  const s3Timestamp = useMemo(
    () =>
      usesMockBackend ? null : parseUnixSeconds(globalData?.meta?.timestamp),
    [usesMockBackend, globalData?.meta?.timestamp]
  );
  const initialBase = useMemo(() => {
    const localNow = nowSeconds();
    return computeInitialBase(s3Timestamp, localNow);
  }, [s3Timestamp]);

  const { data: resolvedBase = initialBase } = useQuery({
    queryKey: ["epoch-clock-base", publicClient?.chain?.id ?? null, s3Timestamp],
    queryFn: () => resolveEpochClockBase({ publicClient, globalData }),
    enabled: !usesMockBackend,
    staleTime: CLOCK_REFRESH_MS,
    refetchInterval: usesMockBackend ? false : CLOCK_REFRESH_MS,
    initialData: initialBase,
  });

  const [, setTick] = useState(0);

  useEffect(() => {
    if (tickMs <= 0) return;
    const id = setInterval(() => {
      setTick((value) => value + 1);
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  const localNow = nowSeconds();
  const base = usesMockBackend
    ? computeInitialBase(null, localNow)
    : resolvedBase;
  const epoch = getEpochWindowFromBase(base, localNow);
  const epochInfo: EpochInfo = {
    currentEpoch: epoch.currentEpoch,
    epochEnd: epoch.epochEnd,
    nextEpochStart: epoch.epochEnd,
  };

  return {
    now: localNow + base.offsetSeconds,
    source: base.source,
    offsetSeconds: base.offsetSeconds,
    sourceTimestamp: base.sourceTimestamp,
    epoch,
    epochInfo,
  } satisfies EpochClock;
}
