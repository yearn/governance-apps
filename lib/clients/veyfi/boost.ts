const MAX_LOCK_SECONDS = 4 * 365 * 24 * 60 * 60;

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
