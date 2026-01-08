// lib/clients/styfi/types.ts
import type { Address } from "viem";
import type { CooldownState } from "@/lib/clients/shared/types";

export type EpochInfo = {
  currentEpoch: number;
  epochEnd: number; // unix seconds
  nextEpochStart: number; // unix seconds
};

export type StyfiGlobalStats = {
  totalSupply: bigint; // Total YFI supply
  totalStaked: bigint; // Total YFI staked (stYFI + stYFIx) across all users
};

export type StyfiAllowances = {
  yfiToStyfi: bigint;
  yfiToStyfiX: bigint;
};

export type StyfiXPosition = {
  sharesActive: bigint; // stYFIx shares
  sharesInCooldown: bigint;
  assetsActive: bigint; // underlying YFI equivalent
  assetsInCooldown: bigint;
  assetsUnlocked: bigint; // Assets finished streaming but not withdrawn
  assetsWithdrawable: bigint; // Contract-calculated maxWithdraw
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
  styfiUnlocked: bigint; // Funds finished streaming but not withdrawn
  styfiWithdrawable: bigint; // Contract-calculated maxWithdraw
  styfiCooldown: CooldownState;

  // stYFIx
  styfiX: StyfiXPosition;

  // Rewards
  claimableGenericRewards: bigint;
  claimableBoostedRewards: bigint;
  accruingGenericRewards: bigint;
  accruingBoostedRewards: bigint;

  allowances: StyfiAllowances;
  epoch: EpochInfo;

  // Metadata
  earningWeight: bigint; // Scaled 1e18
  rewardToken: {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
  };
};
