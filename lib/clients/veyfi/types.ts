import type { Address } from "viem";
import type { CooldownState } from "@/lib/clients/shared/types";

export type LlyfiTokenId = "sdYFI" | "upYFI" | "coveYFI";

export type LlyfiTokenState = {
  symbol: LlyfiTokenId;
  name: string;
  address: Address;
  walletBalance: bigint;
  stakedBalance: bigint;
  cooldownBalance: bigint;
  cooldown: CooldownState;
  allowance: bigint;
  // Metadata for the Ledger
  lockedYfi: bigint;
  veyfiBoost: number;
  totalSupply: bigint;
  stakedSupply: bigint;
  exchangeRate: bigint;
  protocolLiquidity: bigint; // Protocol inventory for Buying
};

export type VeyfiInventory = {
  availableYfi: bigint; // Protocol inventory for Selling
  feeBps: number;
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
  legacyYfiSupply: bigint;
  maxBoostMultiplier: number;
  totalLlyfiStakedPercent: number;
};
