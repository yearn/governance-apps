import { nowSeconds } from "@/lib/mocks/time";

type DeriveCooldownParams = {
  total: bigint;
  claimed: bigint;
  withdrawable: bigint;
  durationSeconds: number;
  nowSecondsOverride?: number;
};

export function deriveCooldownEndsAt({
  total,
  claimed,
  withdrawable,
  durationSeconds,
  nowSecondsOverride,
}: DeriveCooldownParams): number {
  const now = nowSecondsOverride ?? nowSeconds();
  if (total <= 0n || durationSeconds <= 0) return now;

  const unlocked = claimed + withdrawable;
  const clampedUnlocked = unlocked > total ? total : unlocked;
  const elapsed = Number(
    (clampedUnlocked * BigInt(durationSeconds)) / total
  );
  const remaining = Math.max(0, durationSeconds - elapsed);

  return now + remaining;
}
