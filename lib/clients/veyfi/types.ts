// lib/clients/veyfi/types.ts
import type { Address } from "viem";
import type { CooldownState } from "@/lib/clients/shared/types";

export type VeYfiMigrationState = {
  legacyBalance: bigint;
  migrationEligible: boolean;
  migrated: boolean;
};

export type LlyfiTokenId = "sdYFI" | "upYFI" | "coveYFI"; // extensible

export type LlyfiTokenState = {
  symbol: LlyfiTokenId;
  name: string;
  decimals: number;

  walletBalance: bigint;
  stakedBalance: bigint;
  cooldownBalance: bigint;
  cooldown: CooldownState;

  claimableRewards: bigint;
  accruingRewards: bigint;

  allowance: bigint;
};

export type RedemptionCaps = {
  globalLimit: bigint;
  globalUsed: bigint;
  perToken: {
    symbol: LlyfiTokenId;
    limit: bigint;
    used: bigint;
  }[];
  feeBps: number; // 0–10_000
};

export type VeyfiAccountState = {
  address: Address;
  isBlacklisted: boolean;

  veYfi: VeYfiMigrationState | null;
  llyfiTokens: LlyfiTokenState[];
  redemptionCaps: RedemptionCaps;
};
