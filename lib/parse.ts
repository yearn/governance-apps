import { parseUnits } from "viem";

/**
 * Safe parser from user input string → bigint amount.
 * - Strips commas/spaces
 * - Rejects invalid formats
 * - Clamps to provided decimals
 */
export function parseAmount(
  value: string,
  decimals = 18
): { amount: bigint; isValid: boolean } {
  if (!value) return { amount: 0n, isValid: false };

  const normalized = value.replace(/,/g, "").trim();

  // Only allow digits and one decimal point
  if (!/^\d*(\.\d*)?$/.test(normalized)) {
    return { amount: 0n, isValid: false };
  }

  try {
    return { amount: parseUnits(normalized || "0", decimals), isValid: true };
  } catch {
    return { amount: 0n, isValid: false };
  }
}
