import type { VeyfiAccountState } from "@/lib/clients/veyfi/types";
import { getVeyfiBoostMultiplier } from "@/lib/clients/veyfi/boost";

export type ExternalPosition = {
  id: string;
  name: string;
  symbol: string;
  balanceYfi: bigint;
  statusLabel: string;
  boostMultiplier: number;
  href: string;
};

export function deriveExternalPositions(
  veyfiAccount: VeyfiAccountState | null | undefined,
  now: number
): ExternalPosition[] {
  if (!veyfiAccount) return [];

  const externalPositions: ExternalPosition[] = [];

  if (veyfiAccount.veYfi?.migrated && veyfiAccount.veYfi.lockedAmount > 0n) {
    externalPositions.push({
      id: "veyfi",
      name: "veYFI",
      symbol: "veYFI",
      balanceYfi: veyfiAccount.veYfi.lockedAmount,
      statusLabel: "Locked",
      boostMultiplier: getVeyfiBoostMultiplier(
        veyfiAccount.veYfi.unlockTime,
        now
      ),
      href: "/veyfi",
    });
  }

  for (const token of veyfiAccount.llyfiTokens) {
    const totalStaked =
      token.stakedBalance + token.cooldownBalance + token.withdrawable;

    if (totalStaked <= 0n) continue;

    externalPositions.push({
      id: token.symbol,
      name: token.name,
      symbol: token.symbol,
      balanceYfi: totalStaked,
      statusLabel: "Staked",
      boostMultiplier: token.veyfiBoost ?? 1,
      href: "/veyfi?focus=manage#llyfi-ledger",
    });
  }

  return externalPositions;
}
