import type { VeyfiAccountState } from "@/lib/clients/veyfi/types";
import { getVeyfiBoostMultiplier } from "@/lib/clients/veyfi/boost";

export type ExternalPosition = {
  id: string;
  symbol: string;
  subLabel: string;
  activeYfi: bigint;
  unstakingYfi: bigint;
  withdrawableYfi: bigint;
  balanceYfi: bigint;
  boostMultiplier: number;
  unlockTime?: number;
  href: string;
};

export function deriveExternalPositions(
  veyfiAccount: VeyfiAccountState | null | undefined,
  now: number
): ExternalPosition[] {
  if (!veyfiAccount) return [];

  const externalPositions: ExternalPosition[] = [];

  for (const token of veyfiAccount.llyfiTokens) {
    const totalStaked =
      token.stakedBalance + token.cooldownBalance + token.withdrawable;

    if (totalStaked <= 0n) continue;

    externalPositions.push({
      id: token.symbol,
      symbol: token.symbol,
      subLabel: token.name,
      activeYfi: token.stakedBalance,
      unstakingYfi: token.cooldownBalance,
      withdrawableYfi: token.withdrawable,
      balanceYfi: totalStaked,
      boostMultiplier: token.veyfiBoost ?? 1,
      href: "/veyfi?focus=manage#llyfi-ledger",
    });
  }

  // Always keep veYFI below liquid locker positions in the portfolio list.
  if (veyfiAccount.veYfi?.migrated && veyfiAccount.veYfi.lockedAmount > 0n) {
    externalPositions.push({
      id: "veyfi",
      symbol: "veYFI",
      subLabel: "Migrated lock",
      activeYfi: veyfiAccount.veYfi.lockedAmount,
      unstakingYfi: 0n,
      withdrawableYfi: 0n,
      balanceYfi: veyfiAccount.veYfi.lockedAmount,
      boostMultiplier: getVeyfiBoostMultiplier(
        veyfiAccount.veYfi.unlockTime,
        now
      ),
      unlockTime: veyfiAccount.veYfi.unlockTime,
      href: "/veyfi",
    });
  }

  return externalPositions;
}
