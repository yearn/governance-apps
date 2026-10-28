// Mirrors YBCWeightAggregator's four epoch slots, including packing precision.
const SCALE = 1_000_000n;
const MASK = (1n << 60n) - 1n;
const EPOCH_LENGTH = 14 * 24 * 60 * 60;
export function quantizeYbcWeight(staked: bigint): bigint {
  return staked / SCALE * SCALE;
}
export function projectYbcWeight(packed: bigint, staked: bigint, timestamp: number, genesis: number) {
  const epoch = Math.floor((timestamp - genesis) / EPOCH_LENGTH);
  const storedEpoch = Number(packed >> 240n);
  if (epoch < 0 || storedEpoch > epoch || staked < 0n || staked / SCALE > MASK) throw new Error("Invalid YBC weight schedule.");
  const target = quantizeYbcWeight(staked);
  if (packed === 0n) return { effective: 0n, target: 0n, maturesAt: null };
  const atEpoch = (futureEpoch: number) => {
    let slots = packed;
    for (let i = 0; i < Math.min(futureEpoch - storedEpoch, 4); i++) slots = (slots << 60n) | (staked / SCALE);
    return ((slots >> 180n) & MASK) * SCALE;
  };
  const effective = atEpoch(epoch);
  let maturesAt: number | null = null;
  if (target > 0n && effective < target) {
    for (let offset = 1; offset <= 4; offset++) {
      if (atEpoch(epoch + offset) >= target) {
        maturesAt = genesis + (epoch + offset) * EPOCH_LENGTH;
        break;
      }
    }
  }
  return { effective, target, maturesAt };
}
