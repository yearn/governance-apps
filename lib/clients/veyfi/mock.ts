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

// --- Global Mock State (Module Scope) ---
// We move the store here so it acts as a singleton.
// This prevents state from resetting during React Fast Refresh or component remounts.
const GLOBAL_VEYFI_STORE = new Map<string, VeyfiAccountState>();

/**
 * Helper to reset state during tests or development
 */
export function resetMockVeyfiStore() {
  GLOBAL_VEYFI_STORE.clear();
}

// --- Shared Mock Helpers ---

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

// --- Default Fixtures ---

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

// --- Mock Client Implementation ---

export class MockVeyfiClient implements VeyfiClient {
  private readonly latencyMs: number;

  // We track the last address used in getAccountState to provide context
  // for the mutation methods (which don't accept an address argument).
  // This is a dev-only pattern.
  private lastAddress: Address | null = null;

  constructor(options: VeyfiMockOptions = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  private getKey(address: Address): string {
    return address.toLowerCase();
  }

  private getOrCreate(address: Address): VeyfiAccountState {
    const key = this.getKey(address);
    const existing = GLOBAL_VEYFI_STORE.get(key);
    if (existing) return existing;

    const created = createDefaultVeyfiAccount(address);
    GLOBAL_VEYFI_STORE.set(key, created);
    return created;
  }

  private setState(address: Address, next: VeyfiAccountState) {
    const key = this.getKey(address);
    GLOBAL_VEYFI_STORE.set(key, next);
  }

  async getAccountState(address: Address): Promise<VeyfiAccountState> {
    this.lastAddress = address; // Capture context
    await delay(this.latencyMs);
    const state = this.getOrCreate(address);

    // Return a deep clone to avoid external direct mutation by the UI
    return {
      ...state,
      llyfiTokens: state.llyfiTokens.map((t) => ({
        ...t,
        cooldown: t.cooldown ? { ...t.cooldown } : null,
      })),
      redemptionCaps: {
        ...state.redemptionCaps,
        perToken: state.redemptionCaps.perToken.map((p) => ({ ...p })),
      },
      veYfi: state.veYfi ? { ...state.veYfi } : null,
    };
  }

  async prepareMigrateVeYfi(): Promise<PreparedTransaction> {
    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) return nextMockHash();
      const state = this.getOrCreate(targetAddress);

      if (state.veYfi && state.veYfi.legacyBalance > 0n) {
        const next = { ...state, veYfi: { ...state.veYfi } };
        // Mutate: Move legacy balance out (in reality this mints veYFI/LLYFI)
        // For mock simplicity we just mark it migrated and zero the legacy balance
        next.veYfi.legacyBalance = 0n;
        next.veYfi.migrated = true;
        this.setState(targetAddress, next);
      }

      return nextMockHash();
    };

    return tx;
  }

  async prepareStakeLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount <= 0n) throw new Error("Amount must be > 0");
    if (!symbol) throw new Error("LLYFI symbol is required");

    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) return nextMockHash();
      const state = this.getOrCreate(targetAddress);

      // Deep clone tokens array to mutate safely
      const next = {
        ...state,
        llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
      };

      const token = next.llyfiTokens.find((t) => t.symbol === symbol);
      if (token) {
        if (token.walletBalance < amount) {
          throw new Error("Mock: Insufficient LLYFI wallet balance");
        }
        token.walletBalance -= amount;
        token.stakedBalance += amount;
        this.setState(targetAddress, next);
      }

      return nextMockHash();
    };

    return tx;
  }

  async prepareStartCooldownLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount < 0n) throw new Error("Amount must be >= 0");
    if (!symbol) throw new Error("LLYFI symbol is required for cooldown");

    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) return nextMockHash();
      const state = this.getOrCreate(targetAddress);

      const next = {
        ...state,
        llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
      };

      const token = next.llyfiTokens.find((t) => t.symbol === symbol);
      if (token) {
        if (token.stakedBalance < amount) {
          throw new Error("Mock: Insufficient staked balance");
        }
        // Move from staked to cooldown
        token.stakedBalance -= amount;
        token.cooldownBalance += amount;
        // Update cooldown struct
        token.cooldown = {
          amount: token.cooldownBalance,
          endsAt: addDays(MOCK_COOLDOWN_DAYS),
        };
        this.setState(targetAddress, next);
      }

      return nextMockHash();
    };

    return tx;
  }

  async prepareWithdrawLlyfi(
    symbol: LlyfiTokenId
  ): Promise<PreparedTransaction> {
    if (!symbol) throw new Error("LLYFI symbol is required for withdraw");

    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) return nextMockHash();
      const state = this.getOrCreate(targetAddress);

      const next = {
        ...state,
        llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
      };

      const token = next.llyfiTokens.find((t) => t.symbol === symbol);
      if (token) {
        // Withdraw everything in cooldown
        const amount = token.cooldownBalance;
        if (amount > 0n) {
          token.cooldownBalance = 0n;
          token.cooldown = null;
          token.walletBalance += amount;
          this.setState(targetAddress, next);
        }
      }

      return nextMockHash();
    };

    return tx;
  }

  async prepareClaimLlyfiRewards(): Promise<PreparedTransaction> {
    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) return nextMockHash();
      const state = this.getOrCreate(targetAddress);

      const next = {
        ...state,
        llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
      };

      // Reset claimable rewards for all tokens
      let claimedAny = false;
      for (const token of next.llyfiTokens) {
        if (token.claimableRewards > 0n) {
          token.claimableRewards = 0n;
          claimedAny = true;
        }
      }

      if (claimedAny) {
        this.setState(targetAddress, next);
      }

      return nextMockHash();
    };

    return tx;
  }

  async prepareRedeemLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount <= 0n) throw new Error("Amount must be > 0");
    if (!symbol) throw new Error("LLYFI symbol is required for redeem");

    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) return nextMockHash();
      const state = this.getOrCreate(targetAddress);

      const next = {
        ...state,
        llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
        redemptionCaps: {
          ...state.redemptionCaps,
          perToken: state.redemptionCaps.perToken.map((p) => ({ ...p })),
        },
      };

      const token = next.llyfiTokens.find((t) => t.symbol === symbol);
      if (token) {
        // Check caps (simplified check for mock)
        const cap = next.redemptionCaps.perToken.find(
          (c) => c.symbol === symbol
        );

        if (cap && cap.used + amount > cap.limit) {
          throw new Error("Mock: Redemption cap exceeded");
        }

        if (token.walletBalance < amount) {
          throw new Error("Mock: Insufficient LLYFI balance for redemption");
        }

        // Burn LLYFI
        token.walletBalance -= amount;

        // Update Caps usage
        next.redemptionCaps.globalUsed += amount;
        if (cap) {
          cap.used += amount;
        }

        // Note: In a real app, YFI balance would increase.
        // Since StyfiClient manages YFI balance and we are in an isolated MockVeyfiClient,
        // we don't update YFI here. This is acceptable for domain isolation in Phase 2/3.

        this.setState(targetAddress, next);
      }

      return nextMockHash();
    };

    return tx;
  }
}

export function createMockVeyfiClient(options?: VeyfiMockOptions): VeyfiClient {
  return new MockVeyfiClient(options);
}
