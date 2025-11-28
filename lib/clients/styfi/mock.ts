// lib/clients/styfi/mock.ts

"use client";

import type { Address } from "viem";
import type { PreparedTransaction, TransactionHash } from "@/lib/tx/types";
import type {
  EpochInfo,
  StyfiAccountState,
  StyfiAllowances,
  StyfiXPosition,
} from "./types";
import type { StyfiClient, StyfiStakeMode } from "./client";
import { nowSeconds } from "@/lib/mocks/time";
import { getMockScenario } from "@/lib/mocks/scenario";
import { SPENDER_STYFI, SPENDER_STYFIX } from "@/lib/constants";

// --- Global Store (Module Scope) ---
const GLOBAL_STYFI_STORE = new Map<string, StyfiAccountState>();
const GLOBAL_LAST_ACCRUAL = new Map<string, number>();

export function resetMockStyfiStore() {
  GLOBAL_STYFI_STORE.clear();
  GLOBAL_LAST_ACCRUAL.clear();
  mockTxCounter = 0;
}

// --- Shared Mock Helpers ---
let mockTxCounter = 0;

const EPOCH_DURATION = 14 * 24 * 60 * 60; // 14 days
// Deterministic genesis aligned to when the mock module is first evaluated.
// Time travel via debugAdvanceTime() will move "now" relative to this anchor.
const MOCK_GENESIS = Math.floor(Date.now() / 1000);

function nextMockHash(): TransactionHash {
  mockTxCounter += 1;
  return `0x${mockTxCounter.toString(16).padStart(64, "0")}` as TransactionHash;
}

function addDays(days: number): number {
  return nowSeconds() + days * 24 * 60 * 60;
}

const MOCK_COOLDOWN_DAYS = 14;
const COOLDOWN_DURATION_SECONDS = MOCK_COOLDOWN_DAYS * 24 * 60 * 60;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Default State Generators ---
function defaultAllowances(): StyfiAllowances {
  return { yfiToStyfi: 0n, yfiToStyfiX: 0n };
}

function defaultStyfiXPosition(): StyfiXPosition {
  return {
    sharesActive: 0n,
    sharesInCooldown: 0n,
    assetsActive: 0n,
    assetsInCooldown: 0n,
    cooldown: null,
  };
}

function computeEpochInfo(): EpochInfo {
  const now = nowSeconds();
  const timeSinceGenesis = Math.max(0, now - MOCK_GENESIS);
  const epochIndex = Math.floor(timeSinceGenesis / EPOCH_DURATION);
  const currentEpoch = 1 + epochIndex;
  const epochEnd = MOCK_GENESIS + (epochIndex + 1) * EPOCH_DURATION;

  return {
    currentEpoch,
    epochEnd,
    nextEpochStart: epochEnd,
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
    styfiX: defaultStyfiXPosition(),
    claimableGenericRewards: 0n,
    claimableBoostedRewards: 0n,
    accruingGenericRewards: 1n * 10n ** 17n,
    accruingBoostedRewards: 0n,
    allowances: defaultAllowances(),
    epoch: computeEpochInfo(),
    earningWeight: 10n ** 18n, // 1.0x default
    rewardToken: {
      address: "0x0000000000000000000000000000000000000000", // Mock address
      symbol: "yvUSDS",
      decimals: 18,
    },
  };

  if (scenario === "active") {
    const stakeAmount = 40n * 10n ** 18n;
    base.yfiBalance -= stakeAmount;
    base.styfiActive = stakeAmount;
    base.allowances.yfiToStyfi = 100n * 10n ** 18n;
    base.styfiCooldown = {
      amount: 10n * 10n ** 18n,
      endsAt: addDays(3),
      claimedProgress: 0,
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
      claimedProgress: 10000,
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
    return {
      ...matured,
      styfiX: { ...matured.styfiX },
      epoch: computeEpochInfo(),
    };
  }

  async getEpochInfo(): Promise<EpochInfo> {
    await delay(this.latencyMs / 2);
    return computeEpochInfo();
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
      next.styfiCooldown = {
        ...next.styfiCooldown,
        endsAt: next.styfiCooldown.endsAt,
      };
    }
    if (next.styfiX.cooldown && next.styfiX.cooldown.endsAt <= now) {
      next.styfiX = {
        ...next.styfiX,
        cooldown: {
          ...next.styfiX.cooldown,
          endsAt: next.styfiX.cooldown.endsAt,
        },
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

    const targetAddress = this.lastAddress;

    return async () => {
      await delay(latency);

      if (!targetAddress) {
        throw new Error(
          "MockStyfiClient: No address context. Call getAccountState first."
        );
      }

      const state = this.getOrCreate(targetAddress);

      const currentAllowance =
        mode === "stYFI"
          ? state.allowances.yfiToStyfi
          : state.allowances.yfiToStyfiX;

      if (currentAllowance < amount) {
        throw new Error("Mock: Insufficient allowance. Please approve first.");
      }

      if (state.yfiBalance < amount) {
        throw new Error("Mock: Insufficient YFI balance");
      }

      const next = { ...state, allowances: { ...state.allowances } };
      next.yfiBalance -= amount;

      if (mode === "stYFI") {
        next.styfiActive += amount;
        next.allowances.yfiToStyfi -= amount;
      } else if (mode === "stYFIx") {
        next.styfiX = {
          ...next.styfiX,
          sharesActive: next.styfiX.sharesActive + amount,
          assetsActive: next.styfiX.assetsActive + amount,
        };
        next.allowances.yfiToStyfiX -= amount;
      } else {
        throw new Error(`Unsupported stake mode: ${mode}`);
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
      if (!targetAddress) {
        throw new Error(
          "MockStyfiClient: No address context. Call getAccountState first."
        );
      }

      const state = this.getOrCreate(targetAddress);
      const next = { ...state };
      const endsAt = addDays(MOCK_COOLDOWN_DAYS);
      const now = nowSeconds();

      // Helper to calculate progress (duplicated from prepareWithdraw for safety)
      const computeScaledProgress = (endsAt: number) => {
        const start = endsAt - COOLDOWN_DURATION_SECONDS;
        if (now >= endsAt) return 10000;
        if (now <= start) return 0;
        return Math.floor(((now - start) * 10000) / COOLDOWN_DURATION_SECONDS);
      };

      if (mode === "stYFI") {
        if (state.styfiActive < amount) throw new Error("Insufficient stYFI");

        // 1. Check for and Auto-Claim Liquid Funds
        if (next.styfiCooldown) {
          const totalAmount =
            next.styfiCooldown.totalAmount ?? next.styfiInCooldown;
          const scaledProgress = computeScaledProgress(
            next.styfiCooldown.endsAt
          );
          const previousProgress = next.styfiCooldown.claimedProgress ?? 0;
          const progressDelta = scaledProgress - previousProgress;

          if (progressDelta > 0) {
            const liquid = (totalAmount * BigInt(progressDelta)) / 10000n;
            if (liquid > 0n) {
              // Auto-withdraw liquid portion to wallet
              next.styfiInCooldown -= liquid;
              next.yfiBalance += liquid;
            }
          }
        }

        // 2. Process New Cooldown
        next.styfiActive -= amount;
        next.styfiInCooldown += amount;

        // 3. Reset Timer
        next.styfiCooldown = {
          amount: next.styfiInCooldown,
          endsAt,
          claimedProgress: 0,
          totalAmount: next.styfiInCooldown,
        };
      } else if (mode === "stYFIx") {
        if (state.styfiX.sharesActive < amount)
          throw new Error("Insufficient stYFIx");

        // 1. Check for and Auto-Claim Liquid Funds (stYFIx)
        if (next.styfiX.cooldown) {
          const totalAssets = next.styfiX.assetsInCooldown;
          const totalShares = next.styfiX.sharesInCooldown;
          const totalAmount = next.styfiX.cooldown.totalAmount ?? totalAssets;

          const scaledProgress = computeScaledProgress(
            next.styfiX.cooldown.endsAt
          );
          const previousProgress = next.styfiX.cooldown.claimedProgress ?? 0;
          const progressDelta = scaledProgress - previousProgress;

          if (progressDelta > 0) {
            const liquidAssets = (totalAmount * BigInt(progressDelta)) / 10000n;
            const shareReduction =
              (totalShares * BigInt(progressDelta)) / 10000n;

            if (liquidAssets > 0n) {
              next.styfiX.assetsInCooldown -= liquidAssets;
              next.styfiX.sharesInCooldown -= shareReduction;
              next.yfiBalance += liquidAssets;
            }
          }
        }

        // 2. Process New Cooldown
        next.styfiX = {
          ...next.styfiX,
          sharesActive: state.styfiX.sharesActive - amount,
          assetsActive: state.styfiX.assetsActive - amount,
          sharesInCooldown: next.styfiX.sharesInCooldown + amount,
          assetsInCooldown: next.styfiX.assetsInCooldown + amount,
          cooldown: {
            amount: next.styfiX.sharesInCooldown + amount,
            endsAt,
            claimedProgress: 0,
            totalAmount: next.styfiX.assetsInCooldown + amount,
          },
        };
      } else {
        throw new Error(`Unsupported cooldown mode: ${mode}`);
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
      if (!targetAddress) {
        throw new Error(
          "MockStyfiClient: No address context. Call getAccountState first."
        );
      }

      const state = this.getOrCreate(targetAddress);
      const next = { ...state };

      const now = nowSeconds();

      // Helper to calculate progress (0 to 10000)
      const computeScaledProgress = (endsAt: number) => {
        const start = endsAt - COOLDOWN_DURATION_SECONDS;
        if (now >= endsAt) return 10000;
        if (now <= start) return 0;
        return Math.floor(((now - start) * 10000) / COOLDOWN_DURATION_SECONDS);
      };

      if (mode === "stYFI") {
        const cooldown = next.styfiCooldown;
        if (!cooldown) {
          throw new Error("No active cooldown");
        }

        const totalAmount = cooldown.totalAmount ?? next.styfiInCooldown;

        const scaledProgress = computeScaledProgress(cooldown.endsAt);
        const previousProgress = cooldown.claimedProgress ?? 0;
        const progressDelta = scaledProgress - previousProgress;

        if (progressDelta <= 0) {
          throw new Error("No funds available to withdraw yet");
        }

        const liquid = (totalAmount * BigInt(progressDelta)) / 10000n;

        if (liquid <= 0n) {
          throw new Error("No funds available to withdraw yet");
        }

        if (liquid > next.styfiInCooldown) {
          // Safety clamp for rounding errors
          next.yfiBalance += next.styfiInCooldown;
          next.styfiInCooldown = 0n;
        } else {
          next.styfiInCooldown -= liquid;
          next.yfiBalance += liquid;
        }

        if (next.styfiInCooldown <= 0n) {
          next.styfiInCooldown = 0n;
          next.styfiCooldown = null;
        } else {
          next.styfiCooldown = {
            amount: next.styfiInCooldown,
            endsAt: cooldown.endsAt,
            claimedProgress: scaledProgress,
            totalAmount: totalAmount,
          };
        }
      } else if (mode === "stYFIx") {
        const cooldown = next.styfiX.cooldown;
        if (!cooldown) {
          throw new Error("No active cooldown");
        }

        const totalAssets = next.styfiX.assetsInCooldown;
        const totalAmount = cooldown.totalAmount ?? totalAssets;

        // Note: stYFIx shares logic is approximate in mock
        const totalShares = next.styfiX.sharesInCooldown;

        const scaledProgress = computeScaledProgress(cooldown.endsAt);
        const previousProgress = cooldown.claimedProgress ?? 0;
        const progressDelta = scaledProgress - previousProgress;

        if (progressDelta <= 0) {
          throw new Error("No funds available to withdraw yet");
        }

        const liquidAssets = (totalAmount * BigInt(progressDelta)) / 10000n;
        // Approximate share reduction proportionally
        const shareReduction = (totalShares * BigInt(progressDelta)) / 10000n;

        if (liquidAssets <= 0n) {
          throw new Error("No funds available to withdraw yet");
        }

        next.styfiX = {
          ...next.styfiX,
          assetsInCooldown: totalAssets - liquidAssets,
          sharesInCooldown: totalShares - shareReduction,
          cooldown:
            totalAssets - liquidAssets <= 0n
              ? null
              : {
                  amount: totalAssets - liquidAssets,
                  endsAt: cooldown.endsAt,
                  claimedProgress: scaledProgress,
                  totalAmount: totalAmount,
                },
        };
        next.yfiBalance += liquidAssets;
      } else {
        throw new Error(`Unsupported withdraw mode: ${mode}`);
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
      if (!targetAddress) {
        throw new Error(
          "MockStyfiClient: No address context. Call getAccountState first."
        );
      }

      const state = this.getOrCreate(targetAddress);
      const next = { ...state };

      // Reset claimable
      next.claimableGenericRewards = 0n;
      next.claimableBoostedRewards = 0n;

      this.setState(targetAddress, next);
      return nextMockHash();
    };
  }

  debugSetAllowance(
    user: Address,
    _token: Address,
    spender: Address,
    amount: bigint
  ) {
    const state = this.getOrCreate(user);
    const next = { ...state, allowances: { ...state.allowances } };

    if (spender === SPENDER_STYFI) {
      next.allowances.yfiToStyfi = amount;
    } else if (spender === SPENDER_STYFIX) {
      next.allowances.yfiToStyfiX = amount;
    }

    this.setState(user, next);
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
  // If spender is "0x...02" -> yfiToStyfiX

  if (spender === "0x1000000000000000000000000000000000000001") {
    next.allowances.yfiToStyfi = amount;
  } else if (spender === "0x1000000000000000000000000000000000000002") {
    next.allowances.yfiToStyfiX = amount;
  }

  GLOBAL_STYFI_STORE.set(key, next);
}
