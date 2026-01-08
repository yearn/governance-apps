import type { Address } from "viem";
import type { CooldownState } from "@/lib/clients/shared/types";

export type LlyfiTokenId = "sdYFI" | "upYFI" | "coveYFI";

export type RedemptionState = {
  capacity: bigint; // Max YFI redemption capacity
  used: bigint; // Current YFI capacity used
  inventory: bigint; // LLYFI tokens held by redemption contract (available to buy)
  fee: bigint; // Fee in BPS or scaled 1e18? Contract says 10**17 (10%). Let's assume 1e18 scale for fee.
};

export type LlyfiTokenState = {
  symbol: LlyfiTokenId;
  name: string;
  address: Address; // Token Address (e.g. sdYFI)
  depositorAddress: Address; // The Staking Contract

  // Balances
  walletBalance: bigint;
  stakedBalance: bigint; // Active stake

  // Cooldown / Exit
  cooldownBalance: bigint; // Total currently in stream
  withdrawable: bigint; // Liquid/Claimable from stream (contract truth)
  cooldown: CooldownState;

  allowance: bigint; // Allowance for the Depositor (Staking)
  redemptionAllowance: bigint; // Allowance for the Redemption contract (Trading)

  // Metadata for the Ledger
  lockedYfi: bigint;
  veyfiBoost: number;
  totalSupply: bigint;
  stakedSupply: bigint;
  exchangeRate: bigint;

  // Redemption / Trade Data
  redemption: RedemptionState;
};

export type VeyfiInventory = {
  availableYfi: bigint; // YFI held by redemption contract (available to redeem)
  feeBps: number; // Current global fee (derived from 1e18 scale)
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
  inventory: VeyfiInventory; // Global view of YFI inventory
};

export type VeyfiGlobalStats = {
  migratedYfi: bigint;
  legacyYfiSupply: bigint;
  maxBoostMultiplier: number;
  totalLlyfiStakedPercent: number;
};
