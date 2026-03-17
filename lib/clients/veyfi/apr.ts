import type { GlobalData } from "@/lib/schemas/global";
import { normalizeLlyfiSymbol } from "./display";

const RATIO_SCALE = 1_000_000n;

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}

function toBigInt(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function deriveBaseAprFromEffective({
  effectiveApr,
  utilizationRatio,
  boostMultiplier,
}: {
  effectiveApr?: number | null;
  utilizationRatio?: number | null;
  boostMultiplier?: number | null;
}): number | null {
  if (
    effectiveApr === null ||
    effectiveApr === undefined ||
    !Number.isFinite(effectiveApr) ||
    effectiveApr < 0 ||
    utilizationRatio === null ||
    utilizationRatio === undefined ||
    !Number.isFinite(utilizationRatio) ||
    utilizationRatio <= 0 ||
    boostMultiplier === null ||
    boostMultiplier === undefined ||
    !Number.isFinite(boostMultiplier) ||
    boostMultiplier <= 0
  ) {
    return null;
  }

  return (effectiveApr * utilizationRatio) / boostMultiplier;
}

export function deriveCommonLlyfiBaseApr({
  globalData,
  isEpochZero,
}: {
  globalData?: GlobalData | null;
  isEpochZero: boolean;
}): number | null {
  if (!globalData?.global?.veyfi?.tokens?.length || !globalData.llyfi?.length) {
    return null;
  }

  const boostBps = toNumber(globalData.global.maxBoostBps);
  if (boostBps === null || boostBps <= 0) return null;
  const boostMultiplier = boostBps / 10000;

  const capacities = new Map(
    globalData.global.veyfi.tokens.map((token) => [
      normalizeLlyfiSymbol(token.symbol),
      toBigInt(token.redemption.capacity),
    ]),
  );

  const baseAprs: number[] = [];
  for (const token of globalData.llyfi) {
    const capacity = capacities.get(normalizeLlyfiSymbol(token.symbol));
    if (capacity === null || capacity === undefined || capacity <= 0n) {
      continue;
    }

    const staked = toBigInt(token.staked);
    const unstaking = toBigInt(token.unstaking);
    if (staked === null || unstaking === null) continue;

    const effectiveAprBps = toNumber(
      isEpochZero ? token.projected.aprBps : token.current.aprBps,
    );
    if (effectiveAprBps === null) continue;

    const utilizationRatio =
      Number(((staked + unstaking) * RATIO_SCALE) / capacity) /
      Number(RATIO_SCALE);
    const baseApr = deriveBaseAprFromEffective({
      effectiveApr: effectiveAprBps / 10000,
      utilizationRatio,
      boostMultiplier,
    });

    if (baseApr !== null) {
      baseAprs.push(baseApr);
    }
  }

  if (baseAprs.length === 0) return null;

  const sortedBaseAprs = [...baseAprs].sort((a, b) => a - b);
  const middle = Math.floor(sortedBaseAprs.length / 2);

  if (sortedBaseAprs.length % 2 === 1) {
    return sortedBaseAprs[middle];
  }

  return (sortedBaseAprs[middle - 1] + sortedBaseAprs[middle]) / 2;
}
