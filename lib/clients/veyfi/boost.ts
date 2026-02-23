const MAX_LOCK_SECONDS = 4 * 365 * 24 * 60 * 60;
const VEYFI_BOOST_EPOCHS = 104;
const VEYFI_MAX_BOOST_MULTIPLIER = 2;

function toFinitePositiveOrNull(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function getVeyfiBoostMultiplier(
  unlockTimeSeconds: number,
  nowSeconds: number,
): number {
  if (!Number.isFinite(unlockTimeSeconds) || !Number.isFinite(nowSeconds)) {
    return 1;
  }

  const remainingSeconds = Math.max(0, unlockTimeSeconds - nowSeconds);
  const boostRatio = Math.min(
    1,
    Math.max(0, remainingSeconds / MAX_LOCK_SECONDS),
  );

  return 1 + boostRatio;
}

export function getVeyfiEpochBoostMultiplier(
  currentEpoch: number,
  {
    maxBoostMultiplier = VEYFI_MAX_BOOST_MULTIPLIER,
    boostEpochs = VEYFI_BOOST_EPOCHS,
  }: { maxBoostMultiplier?: number; boostEpochs?: number } = {},
): number {
  if (
    !Number.isFinite(currentEpoch) ||
    !Number.isFinite(maxBoostMultiplier) ||
    !Number.isFinite(boostEpochs) ||
    boostEpochs <= 0
  ) {
    return 1;
  }

  const normalizedEpoch = Math.max(0, currentEpoch);
  const normalizedMaxBoost = Math.max(1, maxBoostMultiplier);
  const remainingRatio =
    Math.max(0, boostEpochs - normalizedEpoch) / boostEpochs;

  return 1 + (normalizedMaxBoost - 1) * remainingRatio;
}

export function getVeyfiMigratedBoostMultiplier(
  boostEpochs: number,
  currentEpoch: number,
): number {
  if (!Number.isFinite(boostEpochs) || !Number.isFinite(currentEpoch)) {
    return 1;
  }

  const normalizedBoostEpochs = Math.max(
    0,
    Math.min(VEYFI_BOOST_EPOCHS, Math.floor(boostEpochs)),
  );
  const normalizedCurrentEpoch = Math.max(0, Math.floor(currentEpoch));
  const remainingEpochs = normalizedBoostEpochs - normalizedCurrentEpoch;

  if (remainingEpochs <= 0) {
    return 1;
  }

  return 1 + remainingEpochs / VEYFI_BOOST_EPOCHS;
}

export function resolveVeyfiDisplayBoostMultiplier({
  statsMaxBoostMultiplier,
  tokenBoostMultiplier,
  globalMaxBoostBps,
  preferTokenBoost = false,
}: {
  statsMaxBoostMultiplier?: number | null;
  tokenBoostMultiplier?: number | null;
  globalMaxBoostBps?: number | null;
  preferTokenBoost?: boolean;
}): number {
  const boostFromStats = toFinitePositiveOrNull(statsMaxBoostMultiplier);
  const boostFromToken = toFinitePositiveOrNull(tokenBoostMultiplier);
  const boostFromGlobalBps = toFinitePositiveOrNull(globalMaxBoostBps);
  const boostFromGlobal =
    boostFromGlobalBps !== null ? boostFromGlobalBps / 10000 : null;

  return (
    boostFromStats ??
    (preferTokenBoost ? boostFromToken : null) ??
    boostFromGlobal ??
    boostFromToken ??
    1
  );
}
