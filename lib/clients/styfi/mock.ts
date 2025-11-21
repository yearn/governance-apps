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

// --- Global Store (Module Scope) ---
const GLOBAL_STYFI_STORE = new Map<string, StyfiAccountState>();

export function resetMockStyfiStore() {
  GLOBAL_STYFI_STORE.clear();
}

// --- Shared Mock Helpers ---
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

const MOCK_COOLDOWN_DAYS = 14;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Default State Generators ---
function defaultAllowances(): StyfiAllowances {
  return { yfiToStyfi: 0n, yfiToStyfiMax: 0n };
}

function defaultStyfiMaxPosition(): StyfiMaxPosition {
  return {
    sharesActive: 0n,
    sharesInCooldown: 0n,
    assetsActive: 0n,
    assetsInCooldown: 0n,
    cooldown: null,
  };
}

function defaultEpochInfo(): EpochInfo {
  const end = addDays(MOCK_COOLDOWN_DAYS);
  return {
    currentEpoch: 1,
    epochEnd: end,
    nextEpochStart: end,
  };
}

function createDefaultAccountState(
  address: Address,
  options: StyfiMockOptions
): StyfiAccountState {
  const initialYfi = options.initialYfiBalance ?? 100n * 10n ** 18n;

  return {
    address,
    isBlacklisted: false,
    yfiBalance: initialYfi,
    styfiActive: 0n,
    styfiInCooldown: 0n,
    styfiCooldown: null,
    styfiMax: defaultStyfiMaxPosition(),
    claimableGenericRewards: 0n,
    claimableBoostedRewards: 0n,
    accruingGenericRewards: 1n * 10n ** 17n,
    accruingBoostedRewards: 0n,
    allowances: defaultAllowances(),
    epoch: defaultEpochInfo(),
  };
}

type StyfiMockOptions = {
  latencyMs?: number;
  initialYfiBalance?: bigint;
};

export class MockStyfiClient implements StyfiClient {
  private readonly latencyMs: number;
  // Track the last address accessed to enable mutations in prepare*
  private lastAddress: Address | null = null;

  constructor(options: StyfiMockOptions = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  private getKey(address: Address): string {
    return address.toLowerCase();
  }

  private getOrCreate(address: Address): StyfiAccountState {
    const key = this.getKey(address);
    const existing = GLOBAL_STYFI_STORE.get(key);
    if (existing) return existing;

    const created = createDefaultAccountState(address, {
      latencyMs: this.latencyMs,
      initialYfiBalance: undefined,
    });
    GLOBAL_STYFI_STORE.set(key, created);
    return created;
  }

  private setState(address: Address, next: StyfiAccountState) {
    const key = this.getKey(address);
    GLOBAL_STYFI_STORE.set(key, next);
  }

  async getAccountState(address: Address): Promise<StyfiAccountState> {
    this.lastAddress = address; // Capture context
    await delay(this.latencyMs);
    const state = this.getOrCreate(address);
    return { ...state, styfiMax: { ...state.styfiMax } };
  }

  async getEpochInfo(): Promise<EpochInfo> {
    await delay(this.latencyMs / 2);
    return defaultEpochInfo();
  }

  async prepareStake(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount <= 0n) throw new Error("Amount must be > 0");

    const latency = this.latencyMs;

    // Capture the address at the time of preparation
    const targetAddress = this.lastAddress;

    return async () => {
      await delay(latency);

      if (!targetAddress) {
        console.warn("MockStyfiClient: No address context for mutation");
        return nextMockHash();
      }

      const state = this.getOrCreate(targetAddress);

      // Basic mutation logic
      if (state.yfiBalance < amount) {
        throw new Error("Mock: Insufficient YFI balance");
      }

      const next = { ...state };
      next.yfiBalance -= amount;

      if (mode === "stYFI") {
        next.styfiActive += amount;
      } else {
        // Simple 1:1 logic for mock
        next.styfiMax = {
          ...next.styfiMax,
          sharesActive: next.styfiMax.sharesActive + amount,
          assetsActive: next.styfiMax.assetsActive + amount,
        };
      }

      this.setState(targetAddress, next);
      return nextMockHash();
    };
  }

  async prepareStartCooldown(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount < 0n) throw new Error("Amount must be >= 0");
    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    return async () => {
      await delay(latency);
      if (!targetAddress) return nextMockHash();

      const state = this.getOrCreate(targetAddress);
      const next = { ...state };
      const endsAt = addDays(MOCK_COOLDOWN_DAYS);

      if (mode === "stYFI") {
        if (state.styfiActive < amount) throw new Error("Insufficient stYFI");
        next.styfiActive -= amount;
        next.styfiInCooldown += amount;
        next.styfiCooldown = { amount: next.styfiInCooldown, endsAt };
      } else {
        if (state.styfiMax.sharesActive < amount)
          throw new Error("Insufficient stYFIMax");
        next.styfiMax = {
          ...state.styfiMax,
          sharesActive: state.styfiMax.sharesActive - amount,
          sharesInCooldown: state.styfiMax.sharesInCooldown + amount,
          assetsInCooldown: state.styfiMax.assetsInCooldown + amount, // simplified
          cooldown: {
            amount: state.styfiMax.sharesInCooldown + amount,
            endsAt,
          },
        };
      }

      this.setState(targetAddress, next);
      return nextMockHash();
    };
  }

  async prepareWithdraw(mode: StyfiStakeMode): Promise<PreparedTransaction> {
    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    return async () => {
      await delay(latency);
      if (!targetAddress) return nextMockHash();

      const state = this.getOrCreate(targetAddress);
      const next = { ...state };

      // Logic: withdraw everything in cooldown
      if (mode === "stYFI") {
        const amount = next.styfiInCooldown;
        next.styfiInCooldown = 0n;
        next.styfiCooldown = null;
        next.yfiBalance += amount;
      } else {
        const amount = next.styfiMax.assetsInCooldown; // get back assets
        next.styfiMax = {
          ...next.styfiMax,
          sharesInCooldown: 0n,
          assetsInCooldown: 0n,
          cooldown: null,
        };
        next.yfiBalance += amount;
      }

      this.setState(targetAddress, next);
      return nextMockHash();
    };
  }

  async prepareClaimRewards(): Promise<PreparedTransaction> {
    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    return async () => {
      await delay(latency);
      if (!targetAddress) return nextMockHash();

      const state = this.getOrCreate(targetAddress);
      const next = { ...state };

      // Reset claimable
      next.claimableGenericRewards = 0n;
      next.claimableBoostedRewards = 0n;

      this.setState(targetAddress, next);
      return nextMockHash();
    };
  }
}

export function createMockStyfiClient(options?: StyfiMockOptions): StyfiClient {
  return new MockStyfiClient(options);
}
