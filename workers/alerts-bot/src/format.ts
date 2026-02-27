const SUFFIX_FACTORS = [1n, 1_000n, 1_000_000n, 1_000_000_000n] as const;
const SUFFIXES = ["", "K", "M", "B"] as const;

function getPowerOfTen(decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`Invalid decimals value: ${decimals}`);
  }

  return 10n ** BigInt(decimals);
}

function formatHundredths(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole.toString()}.${fraction}`;
}

export function formatAmount(amount: bigint, decimals = 18): string {
  const base = getPowerOfTen(decimals);
  const isNegative = amount < 0n;
  const absoluteAmount = isNegative ? -amount : amount;

  let suffixIndex = 0;
  for (let i = SUFFIX_FACTORS.length - 1; i > 0; i -= 1) {
    const threshold = SUFFIX_FACTORS[i] * base;
    if (absoluteAmount >= threshold) {
      suffixIndex = i;
      break;
    }
  }

  let divisor = SUFFIX_FACTORS[suffixIndex] * base;
  let roundedHundredths = (absoluteAmount * 100n + divisor / 2n) / divisor;

  // Promote 1000.00K -> 1.00M (and similarly for M -> B).
  while (roundedHundredths >= 100_000n && suffixIndex < SUFFIX_FACTORS.length - 1) {
    suffixIndex += 1;
    divisor = SUFFIX_FACTORS[suffixIndex] * base;
    roundedHundredths = (absoluteAmount * 100n + divisor / 2n) / divisor;
  }

  const sign = isNegative ? "-" : "";
  return `${sign}${formatHundredths(roundedHundredths)}${SUFFIXES[suffixIndex]}`;
}

export function shortAddress(address: string): string {
  const value = address.trim();
  if (value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatPercent(numerator: bigint, denominator: bigint): string {
  if (denominator <= 0n) {
    return "0.00";
  }

  const scaled = (numerator * 10_000n + denominator / 2n) / denominator;
  return formatHundredths(scaled);
}

export function formatUtcDate(secondsSinceEpoch: bigint): string {
  const seconds = Number(secondsSinceEpoch);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Unknown";
  }

  const date = new Date(Math.floor(seconds) * 1_000);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const iso = date.toISOString().replace("T", " ");
  return `${iso.slice(0, 16)} UTC`;
}
