import { deriveBaseAprFromEffective, deriveCommonLlyfiBaseApr } from "@/lib/clients/veyfi/apr";
import { getVeyfiMigratedBoostMultiplier } from "@/lib/clients/veyfi/boost";
import { normalizeLlyfiSymbol } from "@/lib/clients/veyfi/display";
import type { GlobalData } from "@/lib/schemas/global";

const UTILIZATION_SCALE = 1_000_000n;
const APR_SCALE = 1_000_000n;
const MIN_UTILIZATION = 0.01;

type Numberish = string | number | null | undefined;

function toFiniteNumber(value: Numberish): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}

function toBigInt(value: Numberish, fallback = 0n): bigint {
  if (value === null || value === undefined) return fallback;
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

export function resolveStyfiBaseAprBps({
  globalData,
  isEpochZero,
  fallbackAprBps,
}: {
  globalData?: GlobalData | null;
  isEpochZero: boolean;
  fallbackAprBps?: number | null;
}): number | null {
  const s3AprBps = globalData?.styfi
    ? toFiniteNumber(
        isEpochZero ? globalData.styfi.projected.aprBps : globalData.styfi.current.aprBps
      )
    : null;

  return s3AprBps ?? toFiniteNumber(fallbackAprBps);
}

export function resolveStyfixAprBps({
  globalData,
  isEpochZero,
  fallbackAprBps,
}: {
  globalData?: GlobalData | null;
  isEpochZero: boolean;
  fallbackAprBps?: number | null;
}): number | null {
  const s3AprBps = globalData?.styfix
    ? toFiniteNumber(
        isEpochZero ? globalData.styfix.projected.aprBps : globalData.styfix.current.aprBps
      )
    : null;

  return (
    s3AprBps ??
    resolveStyfiBaseAprBps({
      globalData,
      isEpochZero,
      fallbackAprBps,
    })
  );
}

export function getLlyfiBackingYfi({
  symbol,
  fallbackCapacity,
  globalData,
}: {
  symbol: string;
  fallbackCapacity: bigint;
  globalData?: GlobalData | null;
}): bigint {
  const s3Capacity = globalData?.global?.veyfi?.tokens?.find(
    (entry) => normalizeLlyfiSymbol(entry.symbol) === symbol
  )?.redemption.capacity;

  return toBigInt(s3Capacity, fallbackCapacity);
}

export function deriveLlyfiAprMetrics({
  symbol,
  depositorCapacity,
  depositorTotalSupply,
  boostMultiplier,
  globalData,
  isEpochZero,
  fallbackBaseAprBps,
}: {
  symbol: string;
  depositorCapacity: bigint;
  depositorTotalSupply: bigint;
  boostMultiplier: number;
  globalData?: GlobalData | null;
  isEpochZero: boolean;
  fallbackBaseAprBps?: number | null;
}): {
  backingYfi: bigint;
  stakedForRatio: bigint;
  utilizationRatio: number;
  utilizationRatioForApr: number;
  baseApr: number | null;
  boostedBaseApr: number | null;
  effectiveApr: number | null;
} {
  const backingYfi = getLlyfiBackingYfi({
    symbol,
    fallbackCapacity: depositorCapacity,
    globalData,
  });
  const s3Llyfi = globalData?.llyfi?.find(
    (entry) => normalizeLlyfiSymbol(entry.symbol) === symbol
  );
  const s3Staked = s3Llyfi
    ? toBigInt(s3Llyfi.staked) + toBigInt(s3Llyfi.unstaking)
    : null;
  const stakedForRatio = s3Staked ?? depositorTotalSupply;
  const utilizationRatio =
    backingYfi > 0n
      ? Number((stakedForRatio * UTILIZATION_SCALE) / backingYfi) / Number(UTILIZATION_SCALE)
      : 0;
  const utilizationRatioForApr = Math.max(MIN_UTILIZATION, utilizationRatio);
  const s3EffectiveAprBps = s3Llyfi
    ? toFiniteNumber(isEpochZero ? s3Llyfi.projected.aprBps : s3Llyfi.current.aprBps)
    : null;
  const fallbackBaseAprBpsValue = resolveStyfiBaseAprBps({
    globalData,
    isEpochZero,
    fallbackAprBps: fallbackBaseAprBps,
  });
  const fallbackBaseApr =
    fallbackBaseAprBpsValue === null ? null : fallbackBaseAprBpsValue / 10000;
  const derivedBaseApr = deriveBaseAprFromEffective({
    effectiveApr: s3EffectiveAprBps === null ? null : s3EffectiveAprBps / 10000,
    utilizationRatio,
    boostMultiplier,
  });
  const baseApr = derivedBaseApr ?? fallbackBaseApr;
  const boostedBaseApr = baseApr === null ? null : baseApr * boostMultiplier;
  const effectiveApr =
    s3EffectiveAprBps !== null
      ? s3EffectiveAprBps / 10000
      : boostedBaseApr === null
        ? null
        : boostedBaseApr / utilizationRatioForApr;

  return {
    backingYfi,
    stakedForRatio,
    utilizationRatio,
    utilizationRatioForApr,
    baseApr,
    boostedBaseApr,
    effectiveApr,
  };
}

export function deriveMigratedVeYfiAprMetrics({
  boostEpochs,
  currentEpoch,
  globalData,
  isEpochZero,
  fallbackBaseAprBps,
}: {
  boostEpochs: number;
  currentEpoch: number;
  globalData?: GlobalData | null;
  isEpochZero: boolean;
  fallbackBaseAprBps?: number | null;
}): {
  boostMultiplier: number;
  baseApr: number | null;
  effectiveApr: number | null;
} {
  const boostMultiplier = getVeyfiMigratedBoostMultiplier(boostEpochs, currentEpoch);
  const derivedBaseApr =
    globalData !== null && globalData !== undefined
      ? deriveCommonLlyfiBaseApr({ globalData, isEpochZero })
      : null;
  const fallbackBaseApr = resolveStyfiBaseAprBps({
    globalData,
    isEpochZero,
    fallbackAprBps: fallbackBaseAprBps,
  });
  const baseAprBps =
    derivedBaseApr === null ? fallbackBaseApr : derivedBaseApr * 10000;
  const baseApr = baseAprBps === null ? null : baseAprBps / 10000;
  const effectiveApr = baseApr === null ? null : baseApr * boostMultiplier;

  return {
    boostMultiplier,
    baseApr,
    effectiveApr,
  };
}

export type WeightedAprPosition = {
  weight: bigint;
  apr: number;
};

export function deriveWeightedApr(positions: WeightedAprPosition[]): number | null {
  const activePositions = positions.filter(
    (position) => position.weight > 0n && Number.isFinite(position.apr)
  );
  if (activePositions.length === 0) return null;

  const totalWeight = activePositions.reduce((sum, position) => sum + position.weight, 0n);
  if (totalWeight <= 0n) return null;

  // Keep the weight math in bigint space so very large wei balances remain stable.
  const weightedAprScaled = activePositions.reduce((sum, position) => {
    const aprScaled = BigInt(Math.round(position.apr * Number(APR_SCALE)));
    return sum + position.weight * aprScaled;
  }, 0n);
  const roundedAprScaled = (weightedAprScaled + totalWeight / 2n) / totalWeight;

  return Number(roundedAprScaled) / Number(APR_SCALE);
}
