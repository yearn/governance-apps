import type { PublicClient } from "viem";
import type { GlobalData } from "@/lib/schemas/global";
import { nowSeconds } from "@/lib/mocks/time";
import { getEpochInfo } from "@/lib/format";
import { GENESIS, EPOCH_LENGTH } from "@/lib/constants";

export type EpochClockSource = "chain" | "global-data" | "local";

export type EpochClockBase = {
  source: EpochClockSource;
  sourceTimestamp: number; // unix seconds
  offsetSeconds: number; // canonical_now = local_now + offset
};

export type EpochWindow = {
  currentEpoch: number;
  epochStart: number;
  epochEnd: number;
};

export function parseUnixSeconds(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return null;
  const asNumber = Number(numeric);
  if (!Number.isFinite(asNumber)) return null;
  // Normalize ms → seconds if needed.
  const seconds = asNumber > 1_000_000_000_000 ? asNumber / 1000 : asNumber;
  return Math.max(0, Math.floor(seconds));
}

export function getCanonicalNowSeconds(
  base: EpochClockBase,
  localNowSecondsOverride?: number
): number {
  const localNow = localNowSecondsOverride ?? nowSeconds();
  return localNow + base.offsetSeconds;
}

export function getEpochWindowFromBase(
  base: EpochClockBase,
  localNowSecondsOverride?: number
): EpochWindow {
  const now = getCanonicalNowSeconds(base, localNowSecondsOverride);
  return getEpochInfo(GENESIS, EPOCH_LENGTH, now);
}

export async function resolveEpochClockBase({
  publicClient,
  globalData,
}: {
  publicClient: PublicClient | null;
  globalData: GlobalData | null;
}): Promise<EpochClockBase> {
  const localNow = nowSeconds();

  if (publicClient) {
    try {
      const block = await publicClient.getBlock({ blockTag: "latest" });
      const timestamp = Number(block.timestamp);
      if (Number.isFinite(timestamp)) {
        return {
          source: "chain",
          sourceTimestamp: timestamp,
          offsetSeconds: timestamp - localNow,
        };
      }
    } catch (error) {
      console.warn("Failed to fetch chain timestamp", error);
    }
  }

  const globalDataTimestamp = parseUnixSeconds(globalData?.meta?.timestamp);
  if (globalDataTimestamp !== null) {
    return {
      source: "global-data",
      sourceTimestamp: globalDataTimestamp,
      offsetSeconds: globalDataTimestamp - localNow,
    };
  }

  return {
    source: "local",
    sourceTimestamp: localNow,
    offsetSeconds: 0,
  };
}
