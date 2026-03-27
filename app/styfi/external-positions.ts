import type { VeyfiAccountState } from "@/lib/clients/veyfi/types";
import type { GlobalData } from "@/lib/schemas/global";
import { LIQUID_LOCKERS } from "@/lib/constants";
import {
  deriveLlyfiAprMetrics,
  deriveMigratedVeYfiAprMetrics,
} from "@/lib/portfolio/governance";

export type ExternalPosition = {
  id: string;
  symbol: string;
  subLabel: string;
  activeYfi: bigint;
  unstakingYfi: bigint;
  withdrawableYfi: bigint;
  balanceYfi: bigint;
  activeBalanceYfi: bigint;
  boostMultiplier: number;
  effectiveApr: number;
  unlockTime?: number;
  href: string;
};

const LLYFI_SCALE_BY_SYMBOL: ReadonlyMap<string, bigint> = new Map(
  LIQUID_LOCKERS.map((locker) => [locker.symbol, locker.scale])
);

function getLlyfiYfiEquivalent(symbol: string, amount: bigint): bigint {
  const scale = LLYFI_SCALE_BY_SYMBOL.get(symbol) ?? 1n;
  if (scale <= 0n) return amount;
  return amount / scale;
}

export function deriveExternalPositions(
  veyfiAccount: VeyfiAccountState | null | undefined,
  currentEpoch: number | null | undefined,
  globalData: GlobalData | null | undefined,
  fallbackBaseAprBps?: number | null
): ExternalPosition[] {
  if (!veyfiAccount) return [];

  const externalPositions: ExternalPosition[] = [];
  const isEpochZero = currentEpoch === 0;

  for (const token of veyfiAccount.llyfiTokens) {
    const totalStaked =
      token.stakedBalance + token.cooldownBalance + token.withdrawable;

    if (totalStaked <= 0n) continue;

    const activeBalanceYfi = getLlyfiYfiEquivalent(token.symbol, token.stakedBalance);
    const llyfiApr = deriveLlyfiAprMetrics({
      symbol: token.symbol,
      depositorCapacity: token.depositorCapacity,
      depositorTotalSupply: token.depositorTotalSupply,
      boostMultiplier: token.veyfiBoost ?? 1,
      globalData,
      isEpochZero,
      fallbackBaseAprBps,
    });

    externalPositions.push({
      id: token.symbol,
      symbol: token.symbol,
      subLabel: token.name,
      activeYfi: token.stakedBalance,
      unstakingYfi: token.cooldownBalance,
      withdrawableYfi: token.withdrawable,
      balanceYfi: getLlyfiYfiEquivalent(token.symbol, totalStaked),
      activeBalanceYfi,
      boostMultiplier: token.veyfiBoost ?? 1,
      effectiveApr: llyfiApr.effectiveApr ?? 0,
      href: "/veyfi?focus=manage#llyfi-ledger",
    });
  }

  // Always keep veYFI below liquid locker positions in the portfolio list.
  if (veyfiAccount.veYfi?.migrated && veyfiAccount.veYfi.lockedAmount > 0n) {
    const veYfiApr = deriveMigratedVeYfiAprMetrics({
      boostEpochs: veyfiAccount.veYfi.boostEpochs ?? 0,
      currentEpoch: currentEpoch ?? 0,
      globalData,
      isEpochZero,
      fallbackBaseAprBps,
    });

    externalPositions.push({
      id: "veyfi",
      symbol: "veYFI",
      subLabel: "Migrated lock",
      activeYfi: veyfiAccount.veYfi.lockedAmount,
      unstakingYfi: 0n,
      withdrawableYfi: 0n,
      balanceYfi: veyfiAccount.veYfi.lockedAmount,
      activeBalanceYfi: veyfiAccount.veYfi.lockedAmount,
      boostMultiplier: veYfiApr.boostMultiplier,
      effectiveApr: veYfiApr.effectiveApr ?? 0,
      unlockTime: veyfiAccount.veYfi.unlockTime,
      href: "/veyfi",
    });
  }

  return externalPositions;
}
