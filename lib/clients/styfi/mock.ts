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
import {
  SPENDER_STYFI,
  SPENDER_STYFIX,
  REWARD_TOKEN_CONFIG,
} from "@/lib/constants";

// --- Persistence Helpers ---
const STORAGE_KEY = "mock_styfi_store_v1";

// JSON doesn't handle BigInt, so we use a replacer/reviver
function replacer(_key: string, value: unknown) {
  if (typeof value === "bigint") {
    return `BIGINT::${value.toString()}`;
  }
  return value;
}

function reviver(_key: string, value: unknown) {
  if (typeof value === "string" && value.startsWith("BIGINT::")) {
    return BigInt(value.split("::")[1]);
  }
  return value;
}

function saveToStorage() {
  if (typeof window === "undefined") return;
  try {
    const data = {
      store: Array.from(GLOBAL_STYFI_STORE.entries()),
      lastAccrual: Array.from(GLOBAL_LAST_ACCRUAL.entries()),
      pendingInjections: GLOBAL_PENDING_INJECTIONS,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data, replacer));
  } catch (e) {
    console.warn("Failed to save mock state", e);
  }
}

function loadFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw, reviver);

    if (data.store) {
      GLOBAL_STYFI_STORE.clear();
      data.store.forEach(([k, v]: [string, StyfiAccountState]) =>
        GLOBAL_STYFI_STORE.set(k, v)
      );
    }
    if (data.lastAccrual) {
      GLOBAL_LAST_ACCRUAL.clear();
      data.lastAccrual.forEach(([k, v]: [string, number]) =>
        GLOBAL_LAST_ACCRUAL.set(k, v)
      );
    }
    if (data.pendingInjections) {
      GLOBAL_PENDING_INJECTIONS = data.pendingInjections;
    }
  } catch (e) {
    console.warn("Failed to load mock state", e);
  }
}

// --- Global Store (Module Scope) ---
const GLOBAL_STYFI_STORE = new Map<string, StyfiAccountState>();
const GLOBAL_LAST_ACCRUAL = new Map<string, number>();

// New: Store a LIST of pending balance injections for the next connecting user
// This allows us to click "Add stYFI" multiple times while disconnected
let GLOBAL_PENDING_INJECTIONS: Array<{
  mode: StyfiStakeMode;
  amount: bigint;
}> = [];

// Attempt to hydrate immediately on module load
loadFromStorage();

export function resetMockStyfiStore() {
  GLOBAL_STYFI_STORE.clear();
  GLOBAL_LAST_ACCRUAL.clear();
  GLOBAL_PENDING_INJECTIONS = [];
  mockTxCounter = 0;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

// --- Shared Mock Helpers ---
let mockTxCounter = 0;

const EPOCH_DURATION = 14 * 24 * 60 * 60; // 14 days
const MOCK_GENESIS = Math.floor(Date.now() / 1000);

// --- MOCK ECONOMICS CONFIG ---
const MOCK_YFI_PRICE = 5000n;
const MOCK_APY_BPS = 6843n;
const SECONDS_PER_YEAR = 31536000n;
const BASIS_POINTS = 10000n;
const WEEK_SECONDS = 604800n;

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
    assetsUnlocked: 0n,
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
    styfiUnlocked: 0n,
    styfiCooldown: null,
    styfiX: defaultStyfiXPosition(),
    claimableGenericRewards: 0n,
    claimableBoostedRewards: 0n,
    accruingGenericRewards: 0n,
    accruingBoostedRewards: 0n,
    allowances: defaultAllowances(),
    epoch: computeEpochInfo(),
    earningWeight: 10n ** 18n, // 1.0x default
    rewardToken: {
      ...REWARD_TOKEN_CONFIG,
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
    // Pre-seed some rewards ($500 USDS approx)
    base.claimableGenericRewards = 500n * 10n ** 18n;
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
    saveToStorage(); // Persist on creation
    return created;
  }

  private setState(address: Address, next: StyfiAccountState) {
    const key = this.getKey(address);
    GLOBAL_STYFI_STORE.set(key, next);
    saveToStorage(); // Persist on update
  }

  async getAccountState(address: Address): Promise<StyfiAccountState> {
    this.lastAddress = address;

    // Apply any pending injections ADDITIVELY before returning state
    if (GLOBAL_PENDING_INJECTIONS.length > 0) {
      for (const injection of GLOBAL_PENDING_INJECTIONS) {
        this.debugSetBalance(address, injection.mode, injection.amount);
      }
      // Clear the queue after applying
      GLOBAL_PENDING_INJECTIONS = [];
      saveToStorage(); // Persist after processing queue
    }

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

  async getApy(): Promise<bigint> {
    await delay(this.latencyMs / 4);
    return MOCK_APY_BPS;
  }

  private applyAccrualAndMaturity(
    state: StyfiAccountState,
    key: string
  ): StyfiAccountState {
    const now = nowSeconds();
    const last = GLOBAL_LAST_ACCRUAL.get(key) ?? now;
    const elapsed = BigInt(Math.max(0, now - last));

    const next = { ...state };

    // 1. Reward Generation (The Source)
    // Formula: (Staked YFI * PRICE * APY * Elapsed) / (Year * 10000)
    const totalStaked = next.styfiActive + next.styfiX.assetsActive;

    if (elapsed > 0n && totalStaked > 0n) {
      // Multiply by MOCK_YFI_PRICE to convert YFI wei -> USDS wei (assuming 18 decimals for both)
      const freshRewards =
        (totalStaked * MOCK_YFI_PRICE * MOCK_APY_BPS * elapsed) /
        (SECONDS_PER_YEAR * BASIS_POINTS);

      next.accruingGenericRewards += freshRewards;
    }

    // 2. Reward Maturity (The Flow)
    // Move ~1 week's worth of accruing rewards into claimable per week of elapsed time.
    if (elapsed > 0n && next.accruingGenericRewards > 0n) {
      const pending = next.accruingGenericRewards;
      let moveAmount = (pending * elapsed) / WEEK_SECONDS;

      if (moveAmount > pending) moveAmount = pending;
      if (moveAmount === 0n && pending > 0n) moveAmount = 1n; // Ensure flow

      next.accruingGenericRewards -= moveAmount;
      next.claimableGenericRewards += moveAmount;
    }

    if (elapsed > 0n) {
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

      const computeScaledProgress = (endsAt: number) => {
        const start = endsAt - COOLDOWN_DURATION_SECONDS;
        if (now >= endsAt) return 10000;
        if (now <= start) return 0;
        return Math.floor(((now - start) * 10000) / COOLDOWN_DURATION_SECONDS);
      };

      if (mode === "stYFI") {
        if (state.styfiActive < amount) throw new Error("Insufficient stYFI");

        if (next.styfiCooldown) {
          const totalAmount =
            next.styfiCooldown.totalAmount ?? next.styfiInCooldown;
          const scaledProgress = computeScaledProgress(
            next.styfiCooldown.endsAt
          );
          const previousProgress = next.styfiCooldown.claimedProgress ?? 0;
          const progressDelta = scaledProgress - previousProgress;

          // If there is liquid amount from the previous stream, move it to "Unlocked"
          if (progressDelta > 0) {
            const liquid = (totalAmount * BigInt(progressDelta)) / 10000n;
            if (liquid > 0n) {
              next.styfiInCooldown -= liquid;
              next.styfiUnlocked += liquid; // Move to contract bucket, not wallet
            }
          }
        }

        next.styfiActive -= amount;
        next.styfiInCooldown += amount;

        next.styfiCooldown = {
          amount: next.styfiInCooldown,
          endsAt,
          claimedProgress: 0,
          totalAmount: next.styfiInCooldown,
        };
      } else if (mode === "stYFIx") {
        if (state.styfiX.sharesActive < amount)
          throw new Error("Insufficient stYFIx");

        if (next.styfiX.cooldown) {
          const totalAssets = next.styfiX.assetsInCooldown;
          const totalShares = next.styfiX.sharesInCooldown;
          const totalAmount = next.styfiX.cooldown.totalAmount ?? totalAssets;

          const scaledProgress = computeScaledProgress(
            next.styfiX.cooldown.endsAt
          );
          const previousProgress = next.styfiX.cooldown.claimedProgress ?? 0;
          const progressDelta = scaledProgress - previousProgress;

          // If there is liquid amount from the previous stream, move it to "Unlocked"
          if (progressDelta > 0) {
            const liquidAssets = (totalAmount * BigInt(progressDelta)) / 10000n;
            const shareReduction =
              (totalShares * BigInt(progressDelta)) / 10000n;

            if (liquidAssets > 0n) {
              next.styfiX.assetsInCooldown -= liquidAssets;
              next.styfiX.sharesInCooldown -= shareReduction;
              next.styfiX.assetsUnlocked += liquidAssets; // Move to contract bucket
            }
          }
        }

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

      const computeScaledProgress = (endsAt: number) => {
        const start = endsAt - COOLDOWN_DURATION_SECONDS;
        if (now >= endsAt) return 10000;
        if (now <= start) return 0;
        return Math.floor(((now - start) * 10000) / COOLDOWN_DURATION_SECONDS);
      };

      if (mode === "stYFI") {
        let liquidFromStream = 0n;

        // 1. Calculate what is liquid from the ACTIVE stream
        if (next.styfiCooldown) {
          const totalAmount =
            next.styfiCooldown.totalAmount ?? next.styfiInCooldown;
          const scaledProgress = computeScaledProgress(
            next.styfiCooldown.endsAt
          );
          const previousProgress = next.styfiCooldown.claimedProgress ?? 0;
          const progressDelta = scaledProgress - previousProgress;

          if (progressDelta > 0) {
            liquidFromStream = (totalAmount * BigInt(progressDelta)) / 10000n;
            // Cap it
            if (liquidFromStream > next.styfiInCooldown) {
              liquidFromStream = next.styfiInCooldown;
            }
          }

          // Update the stream state
          next.styfiInCooldown -= liquidFromStream;
          if (next.styfiInCooldown <= 0n) {
            next.styfiInCooldown = 0n;
            next.styfiCooldown = null;
          } else {
            next.styfiCooldown = {
              ...next.styfiCooldown,
              claimedProgress: scaledProgress,
            };
          }
        }

        // 2. Add accumulated unlocked funds
        const totalWithdrawable = next.styfiUnlocked + liquidFromStream;

        if (totalWithdrawable <= 0n) {
          throw new Error("No funds available to withdraw yet");
        }

        next.yfiBalance += totalWithdrawable;
        next.styfiUnlocked = 0n;
      } else if (mode === "stYFIx") {
        let liquidAssetsFromStream = 0n;

        // 1. Calculate liquid assets from ACTIVE stream
        if (next.styfiX.cooldown) {
          const totalAssets = next.styfiX.assetsInCooldown;
          const totalAmount = next.styfiX.cooldown.totalAmount ?? totalAssets;
          const totalShares = next.styfiX.sharesInCooldown;

          const scaledProgress = computeScaledProgress(
            next.styfiX.cooldown.endsAt
          );
          const previousProgress = next.styfiX.cooldown.claimedProgress ?? 0;
          const progressDelta = scaledProgress - previousProgress;

          if (progressDelta > 0) {
            liquidAssetsFromStream =
              (totalAmount * BigInt(progressDelta)) / 10000n;
            const shareReduction =
              (totalShares * BigInt(progressDelta)) / 10000n;

            // Update stream state
            next.styfiX.assetsInCooldown -= liquidAssetsFromStream;
            next.styfiX.sharesInCooldown -= shareReduction;

            if (next.styfiX.assetsInCooldown <= 0n) {
              next.styfiX.assetsInCooldown = 0n;
              next.styfiX.sharesInCooldown = 0n;
              next.styfiX.cooldown = null;
            } else {
              next.styfiX.cooldown = {
                ...next.styfiX.cooldown,
                claimedProgress: scaledProgress,
              };
            }
          }
        }

        // 2. Add accumulated unlocked assets
        const totalWithdrawable =
          next.styfiX.assetsUnlocked + liquidAssetsFromStream;

        if (totalWithdrawable <= 0n) {
          throw new Error("No funds available to withdraw yet");
        }

        next.yfiBalance += totalWithdrawable;
        next.styfiX.assetsUnlocked = 0n;
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

  debugSetBalance(user: Address, mode: StyfiStakeMode, amount: bigint) {
    const state = this.getOrCreate(user);
    const next = { ...state, styfiX: { ...state.styfiX } };

    if (mode === "stYFI") {
      next.styfiActive += amount;
    } else if (mode === "stYFIx") {
      next.styfiX.sharesActive += amount;
      next.styfiX.assetsActive += amount;
    }

    this.setState(user, next);
  }

  debugSetPendingBalance(mode: StyfiStakeMode, amount: bigint) {
    GLOBAL_PENDING_INJECTIONS.push({ mode, amount });
    saveToStorage(); // Persist pending injections too
  }
}

export function createMockStyfiClient(options?: StyfiMockOptions): StyfiClient {
  return new MockStyfiClient(options);
}

export function setMockStyfiAllowance(
  user: Address,
  spender: Address,
  amount: bigint
) {
  const key = user.toLowerCase();
  if (!GLOBAL_STYFI_STORE.has(key)) return;

  const state = GLOBAL_STYFI_STORE.get(key)!;
  const next = { ...state, allowances: { ...state.allowances } };

  if (spender === "0x1000000000000000000000000000000000000001") {
    next.allowances.yfiToStyfi = amount;
  } else if (spender === "0x1000000000000000000000000000000000000002") {
    next.allowances.yfiToStyfiX = amount;
  }

  GLOBAL_STYFI_STORE.set(key, next);
}
