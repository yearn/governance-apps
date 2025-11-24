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
import { nowSeconds } from "@/lib/mocks/time";
import { getMockScenario } from "@/lib/mocks/scenario";

// --- Global Store (Module Scope) ---
const GLOBAL_STYFI_STORE = new Map<string, StyfiAccountState>();
const GLOBAL_LAST_ACCRUAL = new Map<string, number>();

export function resetMockStyfiStore() {
  GLOBAL_STYFI_STORE.clear();
}

// --- Shared Mock Helpers ---
let mockTxCounter = 0;

function nextMockHash(): TransactionHash {
  mockTxCounter += 1;
  return `0x${mockTxCounter.toString(16).padStart(64, "0")}` as TransactionHash;
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
  const scenario = getMockScenario();
  const initialYfi = options.initialYfiBalance ?? 100n * 10n ** 18n;
  const base: StyfiAccountState = {
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

  if (scenario === "active") {
    const stakeAmount = 40n * 10n ** 18n;
    base.yfiBalance -= stakeAmount;
    base.styfiActive = stakeAmount;
    base.allowances.yfiToStyfi = 100n * 10n ** 18n;
    base.styfiCooldown = {
      amount: 10n * 10n ** 18n,
      endsAt: addDays(3),
    };
    base.styfiInCooldown = 10n * 10n ** 18n;
  }

  if (scenario === "ready") {
    const stakeAmount = 30n * 10n ** 18n;
    base.yfiBalance -= stakeAmount;
    base.styfiActive = stakeAmount;
    base.allowances.yfiToStyfi = 100n * 10n ** 18n;
    base.styfiCooldown = {
      amount: 15n * 10n ** 18n,
      endsAt: nowSeconds() - 60,
    };
    base.styfiInCooldown = 15n * 10n ** 18n;
  }

  return base;
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
    GLOBAL_LAST_ACCRUAL.set(key, nowSeconds());
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
    const key = this.getKey(address);
    const matured = this.applyAccrualAndMaturity(state, key);
    return { ...matured, styfiMax: { ...matured.styfiMax } };
  }

  async getEpochInfo(): Promise<EpochInfo> {
    await delay(this.latencyMs / 2);
    return defaultEpochInfo();
  }

  private applyAccrualAndMaturity(
    state: StyfiAccountState,
    key: string
  ): StyfiAccountState {
    const now = nowSeconds();
    const last = GLOBAL_LAST_ACCRUAL.get(key) ?? now;
    const elapsed = Math.max(0, now - last);

    const next = { ...state };

    // Roll a small portion of accruing into claimable based on elapsed time
    if (elapsed > 0) {
      const roll = (current: bigint) =>
        current === 0n ? 0n : current / 10n + 1n; // 10% + 1 wei
      const moveGeneric = roll(next.accruingGenericRewards);
      const moveBoosted = roll(next.accruingBoostedRewards);
      next.accruingGenericRewards =
        next.accruingGenericRewards > moveGeneric
          ? next.accruingGenericRewards - moveGeneric
          : 0n;
      next.accruingBoostedRewards =
        next.accruingBoostedRewards > moveBoosted
          ? next.accruingBoostedRewards - moveBoosted
          : 0n;
      next.claimableGenericRewards += moveGeneric;
      next.claimableBoostedRewards += moveBoosted;
      GLOBAL_LAST_ACCRUAL.set(key, now);
    }

    // Mark cooldowns as effectively ready if ended
    if (next.styfiCooldown && next.styfiCooldown.endsAt <= now) {
      next.styfiCooldown = { ...next.styfiCooldown, endsAt: next.styfiCooldown.endsAt };
    }
    if (next.styfiMax.cooldown && next.styfiMax.cooldown.endsAt <= now) {
      next.styfiMax = {
        ...next.styfiMax,
        cooldown: { ...next.styfiMax.cooldown, endsAt: next.styfiMax.cooldown.endsAt },
      };
    }

    return next;
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
        if (
          next.styfiCooldown &&
          next.styfiCooldown.endsAt > nowSeconds()
        ) {
          throw new Error("Cooldown not complete");
        }

        const amount = next.styfiInCooldown;
        next.styfiInCooldown = 0n;
        next.styfiCooldown = null;
        next.yfiBalance += amount;
      } else {
        if (
          next.styfiMax.cooldown &&
          next.styfiMax.cooldown.endsAt > nowSeconds()
        ) {
          throw new Error("Cooldown not complete");
        }

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

/**
 * Helper for hooks to simulate ERC-20 approvals in Mock mode.
 * This is not part of the StyfiClient interface but is used by useTokenApprove.
 */
export function setMockStyfiAllowance(
  user: Address,
  spender: Address,
  amount: bigint
) {
  const key = user.toLowerCase();
  // Ensure state exists
  if (!GLOBAL_STYFI_STORE.has(key)) {
    // We can't set allowance for a user that hasn't been initialized.
    // In a real flow, getAccountState is called first, so this should remain safe.
    return;
  }

  const state = GLOBAL_STYFI_STORE.get(key)!;
  const next = { ...state, allowances: { ...state.allowances } };

  // Match spender to allowance field
  // In a real app we'd check specific addresses.
  // For this mock, we assume the Spender CONSTANTS map to these fields.
  // We need to import these constants or hardcode check.
  // To avoid circular deps, we'll check hardcoded strings or just update ALL for simplicity
  // if the spender matches a heuristic, OR strictly match the constants we just defined.

  // For simplicity in this mock iteration:
  // If spender is "0x...01" -> yfiToStyfi
  // If spender is "0x...02" -> yfiToStyfiMax

  if (spender === "0x1000000000000000000000000000000000000001") {
    next.allowances.yfiToStyfi = amount;
  } else if (spender === "0x1000000000000000000000000000000000000002") {
    next.allowances.yfiToStyfiMax = amount;
  }

  GLOBAL_STYFI_STORE.set(key, next);
}
