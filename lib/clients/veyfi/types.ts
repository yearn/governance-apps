import type { Address } from "viem";
import type { CooldownState } from "@/lib/clients/shared/types";

export type LlyfiTokenId = "sdYFI" | "upYFI" | "coveYFI";

export type RedemptionState = {
  enabled: boolean;
  capacity: bigint; // Max YFI redemption capacity (Redemption Contract)
  used: bigint; // Current YFI capacity used
  inventory: bigint; // LLYFI tokens held by redemption contract
  fee: bigint;
};

export type LlyfiGlobalInfo = {
  symbol: LlyfiTokenId;
  name: string;
  address: Address;
  redemption: RedemptionState;
};

export type LlyfiTokenState = {
  symbol: LlyfiTokenId;
  name: string;
  address: Address;
  depositorAddress: Address;

  // Balances
  walletBalance: bigint;
  stakedBalance: bigint; // Active stake (Assets)

  // Cooldown / Exit
  cooldownBalance: bigint; // Assets
  withdrawable: bigint; // Assets
  cooldown: CooldownState;

  allowance: bigint;
  redemptionAllowance: bigint;

  // Metadata
  lockedYfi: bigint; // Approx backing
  veyfiBoost: number;

  // Token Supply (The LL Token itself)
  totalSupply: bigint;

  // Depositor Stats (For Ratio)
  stakedAssets: bigint; // Total Assets in Depositor (1UP)
  depositorTotalSupply: bigint; // Total Shares in Depositor (YFI eq)
  depositorCapacity: bigint; // Max Shares in Depositor (YFI eq)

  exchangeRate: bigint;

  // Redemption / Trade Data
  redemption: RedemptionState;
};

export type VeyfiInventory = {
  availableYfi: bigint;
  feeBps: number;
};

export type VeyfiNudgeState = {
  legacyBalance: bigint;
  migrationEligible: boolean;
  migrated: boolean;
  llyfiTokens: Array<{
    symbol: LlyfiTokenId;
    walletBalance: bigint;
    stakedBalance: bigint;
  }>;
};

export type VeyfiAccountState = {
  address: Address;
  veYfi: {
    legacyBalance: bigint;
    lockedAmount: bigint;
    migrationEligible: boolean;
    migrated: boolean;
    unlockTime: number;
  } | null;
  llyfiTokens: LlyfiTokenState[];
  inventory: VeyfiInventory;
};

export type VeyfiGlobalStats = {
  migratedYfi: bigint;
  lockedYfi: bigint;
  maxBoostMultiplier: number;
  totalLlyfiStakedPercent: number;
  inventory: VeyfiInventory;
  tokens: LlyfiGlobalInfo[];
};
