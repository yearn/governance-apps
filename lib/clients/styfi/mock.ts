// lib/clients/styfi/mock.ts

"use client";

import type { Address } from "viem";
import type { PreparedTransaction, TransactionHash } from "@/lib/tx/types";
import type {
  EpochInfo,
  StyfiAccountState,
  StyfiAllowances,
  StyfiMaxPosition,
} from "./types";
import type { StyfiClient, StyfiStakeMode } from "./client";

// Simple global counter to generate deterministic mock tx hashes.
let mockTxCounter = 0;

function nextMockHash(): TransactionHash {
  mockTxCounter += 1;
  return `0x${mockTxCounter.toString(16).padStart(64, "0")}` as TransactionHash;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function addDays(days: number): number {
  return nowSeconds() + days * 24 * 60 * 60;
}

// Cooldown duration used in mocks (14 days per YIP-88).
const MOCK_COOLDOWN_DAYS = 14;

// Utility delay to simulate latency.
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type StyfiMockOptions = {
  latencyMs?: number; // default 600ms
  initialYfiBalance?: bigint; // default 100 YFI (in wei)
};

/**
 * Helper: default StyfiAllowances
 */
function defaultAllowances(): StyfiAllowances {
  return {
    yfiToStyfi: 0n,
    yfiToStyfiMax: 0n,
  };
}

/**
 * Helper: default StyfiMaxPosition
 */
function defaultStyfiMaxPosition(): StyfiMaxPosition {
  return {
    sharesActive: 0n,
    sharesInCooldown: 0n,
    assetsActive: 0n,
    assetsInCooldown: 0n,
    cooldown: null,
  };
}

/**
 * Helper: default EpochInfo. In mock mode we just synthesise epochs.
 */
function defaultEpochInfo(): EpochInfo {
  const end = addDays(MOCK_COOLDOWN_DAYS);
  return {
    currentEpoch: 1,
    epochEnd: end,
    nextEpochStart: end, // in real life this would be end + 1 or similar
  };
}

/**
 * Helper: default StyfiAccountState for a previously unseen address.
 */
function createDefaultAccountState(
  address: Address,
  options: StyfiMockOptions
): StyfiAccountState {
  const initialYfi =
    options.initialYfiBalance ??
    // 100 YFI - in wei
    100n * 10n ** 18n;

  return {
    address,
    isBlacklisted: false,

    // Wallet
    yfiBalance: initialYfi,

    // stYFI
    styfiActive: 0n,
    styfiInCooldown: 0n,
    styfiCooldown: null,

    // stYFIMax
    styfiMax: defaultStyfiMaxPosition(),

    // Rewards (start with some non-zero accruing to make UI interesting)
    claimableGenericRewards: 0n,
    claimableBoostedRewards: 0n,
    accruingGenericRewards: 1n * 10n ** 17n, // 0.1 "unit"
    accruingBoostedRewards: 0n,

    allowances: defaultAllowances(),
    epoch: defaultEpochInfo(),
  };
}

/**
 * MockStyfiClient
 *
 * In-memory implementation of StyfiClient for UI development.
 *
 * - Maintains per-address StyfiAccountState
 * - Simulates stake, cooldown, withdraw, claim-rewards
 * - Returns PreparedTransaction functions that simulate a tx hash
 *
 * NOTE:
 * For Phase 2 we keep mutations minimal; richer per-address mutations
 * can be added later once hooks and ProtocolProvider are wired.
 */
export class MockStyfiClient implements StyfiClient {
  private store = new Map<string, StyfiAccountState>();
  private readonly latencyMs: number;

  constructor(options: StyfiMockOptions = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  private getKey(address: Address): string {
    return address.toLowerCase();
  }

  private getOrCreate(address: Address): StyfiAccountState {
    const key = this.getKey(address);
    const existing = this.store.get(key);
    if (existing) return existing;

    const created = createDefaultAccountState(address, {
      latencyMs: this.latencyMs,
      initialYfiBalance: undefined,
    });
    this.store.set(key, created);
    return created;
  }

  private setState(address: Address, next: StyfiAccountState) {
    const key = this.getKey(address);
    this.store.set(key, next);
  }

  async getAccountState(address: Address): Promise<StyfiAccountState> {
    await delay(this.latencyMs);
    const state = this.getOrCreate(address);
    // Return a shallow clone to avoid direct external mutation.
    return { ...state, styfiMax: { ...state.styfiMax } };
  }

  async getEpochInfo(): Promise<EpochInfo> {
    await delay(this.latencyMs / 2);
    return defaultEpochInfo();
  }

  /**
   * Prepare a stake transaction.
   *
   * Currently just validates inputs and simulates a tx hash for Phase 2.
   */
  async prepareStake(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount <= 0n) {
      throw new Error("Amount must be > 0");
    }

    // Reference mode so it is not considered unused and to make it explicit
    // that we handle only the two known modes.
    if (mode !== "stYFI" && mode !== "stYFIMax") {
      throw new Error(`Unsupported stake mode: ${mode}`);
    }

    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  /**
   * Prepare cooldown start.
   *
   * For Phase 2 this simulates a cooldown tx; actual per-address mutation
   * will be added when mocks are made fully stateful.
   */
  async prepareStartCooldown(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount < 0n) {
      throw new Error("Amount must be >= 0");
    }

    if (mode !== "stYFI" && mode !== "stYFIMax") {
      throw new Error(`Unsupported cooldown mode: ${mode}`);
    }

    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  /**
   * Prepare withdraw after cooldown.
   *
   * For Phase 2 this simulates a tx; actual state mutation will be
   * added when mocks are made fully stateful.
   */
  async prepareWithdraw(mode: StyfiStakeMode): Promise<PreparedTransaction> {
    if (mode !== "stYFI" && mode !== "stYFIMax") {
      throw new Error(`Unsupported withdraw mode: ${mode}`);
    }

    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }

  /**
   * Prepare claim rewards.
   *
   * For Phase 2 this just simulates a tx and hash; richer behaviour
   * can be added later.
   */
  async prepareClaimRewards(): Promise<PreparedTransaction> {
    const latency = this.latencyMs;

    const tx: PreparedTransaction = async () => {
      await delay(latency);
      return nextMockHash();
    };

    return tx;
  }
}

/**
 * Factory helper, so future options/scenarios can be passed ergonomically.
 */
export function createMockStyfiClient(options?: StyfiMockOptions): StyfiClient {
  return new MockStyfiClient(options);
}
