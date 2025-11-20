// lib/clients/veyfi/mock.ts

"use client";

import type { Address } from "viem";
import type { PreparedTransaction, TransactionHash } from "@/lib/tx/types";
import type {
  VeYfiMigrationState,
  LlyfiTokenId,
  LlyfiTokenState,
  RedemptionCaps,
  VeyfiAccountState,
} from "./types";
import type { VeyfiClient } from "./client";

// Shared with styfi mocks to keep hashes deterministic.
let veyfiMockTxCounter = 0;

function nextMockHash(): TransactionHash {
  veyfiMockTxCounter += 1;
  return `0x${veyfiMockTxCounter
    .toString(16)
    .padStart(64, "0")}` as TransactionHash;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function addDays(days: number): number {
  return nowSeconds() + days * 24 * 60 * 60;
}

const MOCK_COOLDOWN_DAYS = 14;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type VeyfiMockOptions = {
  latencyMs?: number; // default 600ms
};

/**
 * Default veYFI migration state fixture.
 */
function defaultVeYfiState(): VeYfiMigrationState {
  return {
    legacyBalance: 10n * 10n ** 18n, // 10 units
    migrationEligible: true,
    migrated: false,
  };
}

/**
 * Default LLYFI tokens fixture.
 */
function defaultLlyfiTokens(): LlyfiTokenState[] {
  const base: Array<{ symbol: LlyfiTokenId; name: string }> = [
    { symbol: "sdYFI", name: "StakeDAO YFI Locker" },
    { symbol: "upYFI", name: "1UP YFI Locker" },
    { symbol: "coveYFI", name: "Cove YFI Locker" },
  ];

  return base.map((token, i) => ({
    symbol: token.symbol,
    name: token.name,
    decimals: 18,
    walletBalance: (5n + BigInt(i)) * 10n ** 18n, // 5,6,7 units
    stakedBalance: 0n,
    cooldownBalance: 0n,
    cooldown: null,
    claimableRewards: 0n,
    accruingRewards: 5n * 10n ** 16n, // 0.05
    allowance: 0n,
  }));
}

/**
 * Default redemption caps fixture.
 */
function defaultRedemptionCaps(): RedemptionCaps {
  const globalLimit = 600n * 10n ** 18n;
  const globalUsed = 0n;

  return {
    globalLimit,
    globalUsed,
    perToken: [
      {
        symbol: "sdYFI",
        limit: 300n * 10n ** 18n,
        used: 0n,
      },
      {
        symbol: "upYFI",
        limit: 200n * 10n ** 18n,
        used: 0n,
      },
      {
        symbol: "coveYFI",
        limit: 100n * 10n ** 18n,
        used: 0n,
      },
    ],
    feeBps: 500, // 5% fee in mocks
  };
}

/**
 * Default VeyfiAccountState for a previously unseen address.
 */
function createDefaultVeyfiAccount(address: Address): VeyfiAccountState {
  return {
    address,
    isBlacklisted: false,
    veYfi: defaultVeYfiState(),
    llyfiTokens: defaultLlyfiTokens(),
    redemptionCaps: defaultRedemptionCaps(),
  };
}

export class MockVeyfiClient implements VeyfiClient {
  private store = new Map<string, VeyfiAccountState>();
  private readonly latencyMs: number;

  constructor(options: VeyfiMockOptions = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  private getKey(address: Address): string {
    return address.toLowerCase();
  }

  private getOrCreate(address: Address): VeyfiAccountState {
    const key = this.getKey(address);
    const existing = this.store.get(key);
    if (existing) return existing;

    const created = createDefaultVeyfiAccount(address);
    this.store.set(key, created);
    return created;
  }

  private setState(address: Address, next: VeyfiAccountState) {
    const key = this.getKey(address);
    this.store.set(key, next);
  }

  async getAccountState(address: Address): Promise<VeyfiAccountState> {
    await delay(this.latencyMs);
    const state = this.getOrCreate(address);
    // shallow clone to avoid external direct mutation
    return {
      ...state,
      llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
      redemptionCaps: {
        ...state.redemptionCaps,
        perToken: state.redemptionCaps.perToken.map((p) => ({ ...p })),
      },
      veYfi: state.veYfi ? { ...state.veYfi } : null,
    };
  }

  async prepareMigrateVeYfi(): Promise<PreparedTransaction> {
    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  async prepareStakeLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount <= 0n) {
      throw new Error("Amount must be > 0");
    }

    // Explicitly use symbol so it's not considered unused and make constraints obvious.
    if (!symbol) {
      throw new Error("LLYFI symbol is required");
    }

    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  async prepareStartCooldownLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount < 0n) {
      throw new Error("Amount must be >= 0");
    }

    if (!symbol) {
      throw new Error("LLYFI symbol is required for cooldown");
    }

    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  async prepareWithdrawLlyfi(
    symbol: LlyfiTokenId
  ): Promise<PreparedTransaction> {
    if (!symbol) {
      throw new Error("LLYFI symbol is required for withdraw");
    }

    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  async prepareClaimLlyfiRewards(): Promise<PreparedTransaction> {
    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  async prepareRedeemLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount <= 0n) {
      throw new Error("Amount must be > 0");
    }

    if (!symbol) {
      throw new Error("LLYFI symbol is required for redeem");
    }

    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }
}

export function createMockVeyfiClient(options?: VeyfiMockOptions): VeyfiClient {
  return new MockVeyfiClient(options);
}
