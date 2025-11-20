// lib/clients/styfi/types.ts
import type { Address } from "viem";
import type { CooldownState } from "@/lib/clients/shared/types";

export type EpochInfo = {
  currentEpoch: number;
  epochEnd: number; // unix seconds
  nextEpochStart: number; // unix seconds
};

export type StyfiAllowances = {
  yfiToStyfi: bigint;
  yfiToStyfiMax: bigint;
};

export type StyfiMaxPosition = {
  sharesActive: bigint; // stYFIMax shares
  sharesInCooldown: bigint;
  assetsActive: bigint; // underlying YFI equivalent
  assetsInCooldown: bigint;
  cooldown: CooldownState;
};

export type StyfiAccountState = {
  address: Address;
  isBlacklisted: boolean;

  // Wallet
  yfiBalance: bigint;

  // stYFI
  styfiActive: bigint;
  styfiInCooldown: bigint;
  styfiCooldown: CooldownState;

  // stYFIMax
  styfiMax: StyfiMaxPosition;

  // Rewards
  claimableGenericRewards: bigint;
  claimableBoostedRewards: bigint;
  accruingGenericRewards: bigint;
  accruingBoostedRewards: bigint;

  allowances: StyfiAllowances;
  epoch: EpochInfo;
};
