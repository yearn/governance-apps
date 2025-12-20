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
  VeyfiGlobalStats,
} from "./types";
import type { VeyfiClient } from "./client";
import {
  MOCK_LLYFI_MAP,
  MOCK_SDYFI_ADDRESS,
  MOCK_UPYFI_ADDRESS,
  MOCK_COVEYFI_ADDRESS,
} from "@/lib/constants";
import { nowSeconds } from "@/lib/mocks/time";
import { getMockScenario } from "@/lib/mocks/scenario";
import { internalUpdateYfiBalance } from "@/lib/clients/styfi/mock";

// --- Persistence Helpers ---
const STORAGE_KEY = "mock_veyfi_store_v1";

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
      store: Array.from(GLOBAL_VEYFI_STORE.entries()),
      lastAccrual: Array.from(GLOBAL_LAST_ACCRUAL.entries()),
      pendingVeYfi:
        typeof GLOBAL_PENDING_VEYFI === "bigint"
          ? `BIGINT::${GLOBAL_PENDING_VEYFI.toString()}`
          : GLOBAL_PENDING_VEYFI,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save mock veyfi state", e);
  }
}

function loadFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw, reviver);

    if (data.store) {
      GLOBAL_VEYFI_STORE.clear();
      data.store.forEach(([k, v]: [string, VeyfiAccountState]) =>
        GLOBAL_VEYFI_STORE.set(k, v)
      );
    }
    if (data.lastAccrual) {
      GLOBAL_LAST_ACCRUAL.clear();
      data.lastAccrual.forEach(([k, v]: [string, number]) =>
        GLOBAL_LAST_ACCRUAL.set(k, v)
      );
    }
    if (data.pendingVeYfi !== undefined) {
      GLOBAL_PENDING_VEYFI = BigInt(
        data.pendingVeYfi.toString().replace("BIGINT::", "")
      );
    }
  } catch (e) {
    console.warn("Failed to load mock veyfi state", e);
  }
}

// --- Global Mock State (Module Scope) ---
const GLOBAL_VEYFI_STORE = new Map<string, VeyfiAccountState>();
const GLOBAL_LAST_ACCRUAL = new Map<string, number>();
let GLOBAL_PENDING_VEYFI: bigint = 0n;

loadFromStorage();

export function resetMockVeyfiStore() {
  GLOBAL_VEYFI_STORE.clear();
  GLOBAL_LAST_ACCRUAL.clear();
  GLOBAL_PENDING_VEYFI = 0n;
  veyfiMockTxCounter = 0;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

// --- Shared Mock Helpers ---
let veyfiMockTxCounter = 0;

// MOCK ECONOMICS CONFIG
const MOCK_YFI_PRICE = 5000n; // 1 YFI = $5000
const MOCK_APY_BPS = 9600n; // 96.00% APY for LLYFI (Higher yield)
const SECONDS_PER_YEAR = 31536000n;
const BASIS_POINTS = 10000n;
const WEEK_SECONDS = 604800n;

function nextMockHash(): TransactionHash {
  veyfiMockTxCounter += 1;
  return `0x${veyfiMockTxCounter
    .toString(16)
    .padStart(64, "0")}` as TransactionHash;
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

function defaultVeYfiState(): VeYfiMigrationState {
  return {
    legacyBalance: 0n,
    lockedAmount: 0n,
    migrationEligible: true,
    migrated: false,
    unlockTime: 0,
  };
}

// Helper to get random number in range [min, max]
function getRandomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function defaultLlyfiTokens(): LlyfiTokenState[] {
  // Hardcoded values from requirements
  const tokenConfigs: Array<{
    symbol: LlyfiTokenId;
    name: string;
    address: Address;
    lockedYfi: bigint;
    totalSupply: bigint;
    exchangeRate: bigint; // Scaled 1e18
    inventory: bigint; // Protocol inventory for Minting (Buying)
  }> = [
    {
      symbol: "sdYFI",
      name: "StakeDAO",
      address: MOCK_SDYFI_ADDRESS,
      lockedYfi: 22973n * 10n ** 16n, // 229.73 YFI
      totalSupply: 23680n * 10n ** 16n, // 236.80 sdYFI
      exchangeRate: 1n * 10n ** 18n, // 1:1
      inventory: 350n * 10n ** 18n, // 350 sdYFI available
    },
    {
      symbol: "upYFI",
      name: "1UP",
      address: MOCK_UPYFI_ADDRESS,
      lockedYfi: 19951n * 10n ** 16n, // 199.51 YFI
      totalSupply: 1434783697n * 10n ** 16n, // Large supply
      exchangeRate: 69420n * 10n ** 18n, // 1 YFI = 69,420 upYFI
      inventory: 25_000_000n * 10n ** 18n, // 25M upYFI available
    },
    {
      symbol: "coveYFI",
      name: "Cove",
      address: MOCK_COVEYFI_ADDRESS,
      lockedYfi: 7492n * 10n ** 16n, // 74.92 YFI
      totalSupply: 7609n * 10n ** 16n, // 76.09 coveYFI
      exchangeRate: 1n * 10n ** 18n, // 1:1
      inventory: 50n * 10n ** 18n, // 50 coveYFI available
    },
  ];

  return tokenConfigs.map((token, i) => {
    // Randomized Boost (1.90 - 1.99)
    const veyfiBoost = getRandomRange(1.9, 1.99);

    // Randomized Staked Ratio (20% - 80%)
    const stakedRatio = getRandomRange(0.2, 0.8);
    // stakedSupply = totalSupply * ratio
    // We do this via BigInt math to avoid precision loss
    const ratioBps = BigInt(Math.floor(stakedRatio * 10000));
    const stakedSupply = (token.totalSupply * ratioBps) / 10000n;

    // Wallet balance logic: give some starting balance
    const baseBalance = (5n + BigInt(i)) * 10n ** 18n;
    const walletBalance =
      token.symbol === "upYFI" ? baseBalance * 1000n : baseBalance;

    return {
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: 18,
      walletBalance,
      stakedBalance: 0n,
      cooldownBalance: 0n,
      cooldown: null,
      claimableRewards: 0n,
      accruingRewards: 0n,
      allowance: 0n,
      // Metadata
      lockedYfi: token.lockedYfi,
      veyfiBoost,
      totalSupply: token.totalSupply,
      stakedSupply,
      exchangeRate: token.exchangeRate,
      // Protocol Liquidity (Inventory available to buy)
      protocolLiquidity: token.inventory,
    };
  });
}

function defaultRedemptionCaps(): RedemptionCaps {
  const globalLimit = 600n * 10n ** 18n; // 600 YFI in the protocol
  const globalUsed = 0n;

  return {
    globalLimit,
    globalUsed,
    perToken: [
      {
        symbol: "sdYFI",
        limit: 300n * 10n ** 18n, // 300 YFI cap (legacy param, we might ignore in pure inventory mode but sticking to type)
        used: 0n,
      },
      {
        symbol: "upYFI",
        limit: 200n * 10n ** 18n, // 200 YFI cap
        used: 0n,
      },
      {
        symbol: "coveYFI",
        limit: 100n * 10n ** 18n, // 100 YFI cap
        used: 0n,
      },
    ],
    feeBps: 500, // 5% fee in mocks
  };
}

function createDefaultVeyfiAccount(address: Address): VeyfiAccountState {
  const scenario = getMockScenario();
  const base: VeyfiAccountState = {
    address,
    isBlacklisted: false,
    veYfi: defaultVeYfiState(),
    llyfiTokens: defaultLlyfiTokens(),
    redemptionCaps: defaultRedemptionCaps(),
  };

  if (scenario === "active") {
    const token = base.llyfiTokens[0];
    token.walletBalance -= 2n * 10n ** 18n;
    token.stakedBalance = 2n * 10n ** 18n;
    token.cooldown = {
      amount: 1n * 10n ** 18n,
      endsAt: addDays(2),
    };
    token.cooldownBalance = 1n * 10n ** 18n;
    token.allowance = 5n * 10n ** 18n;
  }

  if (scenario === "ready") {
    const token = base.llyfiTokens[0];
    token.walletBalance -= 2n * 10n ** 18n;
    token.stakedBalance = 2n * 10n ** 18n;
    token.cooldown = {
      amount: 2n * 10n ** 18n,
      endsAt: nowSeconds() - 60,
    };
    token.cooldownBalance = 2n * 10n ** 18n;
    token.allowance = 5n * 10n ** 18n;
  }

  if (scenario === "caps-exhausted") {
    // For capped scenario, we set Used = Limit.
    // In our dynamic model, this would imply Limit=0, but let's just zero it out for clarity.
    base.redemptionCaps.globalLimit = 0n;
    base.redemptionCaps.globalUsed = 0n;

    base.redemptionCaps.perToken = base.redemptionCaps.perToken.map((p) => ({
      ...p,
      limit: 0n,
      used: 0n,
    }));
  }

  return base;
}

// --- Mock Client Implementation ---

export class MockVeyfiClient implements VeyfiClient {
  private readonly latencyMs: number;
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
    GLOBAL_LAST_ACCRUAL.set(key, nowSeconds());
    saveToStorage();
    return created;
  }

  private setState(address: Address, next: VeyfiAccountState) {
    const key = this.getKey(address);
    GLOBAL_VEYFI_STORE.set(key, next);
    saveToStorage();
  }

  async getAccountState(address: Address): Promise<VeyfiAccountState> {
    this.lastAddress = address;

    // Apply pending veYFI injection if exists
    if (GLOBAL_PENDING_VEYFI > 0n) {
      const state = this.getOrCreate(address);
      const next = { ...state, veYfi: { ...state.veYfi! } };

      // Add balance
      next.veYfi.legacyBalance = GLOBAL_PENDING_VEYFI;
      // Add locked amount (assuming max lock means 1:1 for mock)
      next.veYfi.lockedAmount = GLOBAL_PENDING_VEYFI;
      // Set unlock time to 4 years from "now"
      next.veYfi.unlockTime = nowSeconds() + 4 * 365 * 24 * 60 * 60;
      next.veYfi.migrated = false; // Reset migrated status if we inject new balance

      this.setState(address, next);
      GLOBAL_PENDING_VEYFI = 0n;
      saveToStorage();
    }

    await delay(this.latencyMs);
    const state = this.getOrCreate(address);
    const key = this.getKey(address);
    const matured = this.applyAccrualAndMaturity(state, key);

    return {
      ...matured,
      llyfiTokens: matured.llyfiTokens.map((t) => ({
        ...t,
        cooldown: t.cooldown ? { ...t.cooldown } : null,
      })),
      redemptionCaps: {
        ...matured.redemptionCaps,
        perToken: matured.redemptionCaps.perToken.map((p) => ({ ...p })),
      },
      veYfi: matured.veYfi ? { ...matured.veYfi } : null,
    };
  }

  async getGlobalStats(): Promise<VeyfiGlobalStats> {
    await delay(this.latencyMs / 2);
    // Mock Fixtures based on spec
    return {
      migratedYfi: 4213n * 10n ** 18n,
      legacyYfiSupply: 8100n * 10n ** 18n, // ~52% migrated
      maxBoostMultiplier: 1.52, // 1.52x
      totalLlyfiStakedPercent: 0.85, // 85%
    };
  }

  async prepareMigrateVeYfi(): Promise<PreparedTransaction> {
    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) {
        throw new Error(
          "MockVeyfiClient: No address context. Call getAccountState first."
        );
      }
      const state = this.getOrCreate(targetAddress);

      if (state.veYfi && state.veYfi.legacyBalance > 0n) {
        const next = { ...state, veYfi: { ...state.veYfi } };
        next.veYfi.migrated = true;
        this.setState(targetAddress, next);
      }

      return nextMockHash();
    };

    return tx;
  }

  private applyAccrualAndMaturity(
    state: VeyfiAccountState,
    key: string
  ): VeyfiAccountState {
    const now = nowSeconds();
    const last = GLOBAL_LAST_ACCRUAL.get(key) ?? now;
    const elapsed = BigInt(Math.max(0, now - last));

    const next: VeyfiAccountState = {
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

    if (elapsed > 0n) {
      for (const token of next.llyfiTokens) {
        // 1. Generation (Staked -> Accruing)
        // With Price Multiplier: Staked * PRICE * APY * Elapsed
        // Since Staked is LLYFI, we need to value it in YFI
        // YFI Value = (Staked * 1e18) / ExchangeRate
        if (token.stakedBalance > 0n) {
          const yfiValue =
            (token.stakedBalance * 10n ** 18n) / token.exchangeRate;

          const freshRewards =
            (yfiValue * MOCK_YFI_PRICE * MOCK_APY_BPS * elapsed) /
            (SECONDS_PER_YEAR * BASIS_POINTS);

          token.accruingRewards += freshRewards;
        }

        // 2. Maturity (Accruing -> Claimable)
        if (token.accruingRewards > 0n) {
          let moveAmount = (token.accruingRewards * elapsed) / WEEK_SECONDS;

          if (moveAmount > token.accruingRewards)
            moveAmount = token.accruingRewards;
          if (moveAmount === 0n && token.accruingRewards > 0n) moveAmount = 1n;

          token.accruingRewards -= moveAmount;
          token.claimableRewards += moveAmount;
        }
      }
      GLOBAL_LAST_ACCRUAL.set(key, now);
    }

    for (const token of next.llyfiTokens) {
      if (token.cooldown && token.cooldown.endsAt <= now) {
        token.cooldown = { ...token.cooldown, endsAt: token.cooldown.endsAt };
      }
    }

    return next;
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

      if (!targetAddress) {
        throw new Error(
          "MockVeyfiClient: No address context. Call getAccountState first."
        );
      }
      const state = this.getOrCreate(targetAddress);

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
        // Mock Side Effect: Increase staked supply to reflect pool changes
        token.stakedSupply += amount;
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

      if (!targetAddress) {
        throw new Error(
          "MockVeyfiClient: No address context. Call getAccountState first."
        );
      }
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
        token.stakedBalance -= amount;
        token.stakedSupply -= amount;
        token.cooldownBalance += amount;
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

      if (!targetAddress) {
        throw new Error(
          "MockVeyfiClient: No address context. Call getAccountState first."
        );
      }
      const state = this.getOrCreate(targetAddress);

      const next = {
        ...state,
        llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
      };

      const token = next.llyfiTokens.find((t) => t.symbol === symbol);
      if (token) {
        if (token.cooldown && token.cooldown.endsAt > nowSeconds()) {
          throw new Error("Cooldown not complete");
        }

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

      if (!targetAddress) {
        throw new Error(
          "MockVeyfiClient: No address context. Call getAccountState first."
        );
      }
      const state = this.getOrCreate(targetAddress);

      const next = {
        ...state,
        llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
      };

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

  async prepareMintLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    if (amount <= 0n) throw new Error("Amount must be > 0");
    if (!symbol) throw new Error("LLYFI symbol is required for mint");

    const latency = this.latencyMs;
    const targetAddress = this.lastAddress;

    const tx: PreparedTransaction = async () => {
      await delay(latency);

      if (!targetAddress) {
        throw new Error(
          "MockVeyfiClient: No address context. Call getAccountState first."
        );
      }
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
        // Minting: User gives YFI, gets LLYFI

        // 1. Check Protocol LLYFI Capacity
        const llyfiAmount = (amount * token.exchangeRate) / 10n ** 18n;
        if (token.protocolLiquidity < llyfiAmount) {
          throw new Error("Mock: Insufficient protocol LLYFI inventory");
        }

        // 2. Perform Swap
        token.walletBalance += llyfiAmount;
        token.protocolLiquidity -= llyfiAmount;
        // Decrease user YFI
        internalUpdateYfiBalance(targetAddress, -amount);

        // 3. INCREASE YFI Inventory (Used stays 0, Limit grows)
        // Because "Available YFI" = Limit - Used.
        // Minting ADDS YFI to the protocol.
        const yfiValue = amount;
        next.redemptionCaps.globalLimit += yfiValue;

        // Also increase token specific limit if desired, or keep fixed.
        // Assuming per-token limits are also dynamic inventories in this simplified model.
        const cap = next.redemptionCaps.perToken.find(
          (c) => c.symbol === symbol
        );
        if (cap) {
          cap.limit += yfiValue;
        }

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

      if (!targetAddress) {
        throw new Error(
          "MockVeyfiClient: No address context. Call getAccountState first."
        );
      }
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
        // Redemption: User gives LLYFI, gets YFI
        const yfiValue = (amount * 10n ** 18n) / token.exchangeRate;

        // 1. Check YFI Redemption Capacity (Limit - Used)
        // Here Used is always 0 in our new model, so we check against Limit directly.
        if (yfiValue > next.redemptionCaps.globalLimit) {
          throw new Error(
            "Global redemption cap exceeded (Protocol out of YFI)"
          );
        }

        const cap = next.redemptionCaps.perToken.find(
          (c) => c.symbol === symbol
        );

        if (cap && yfiValue > cap.limit) {
          throw new Error(
            "Redemption cap exceeded (Protocol out of YFI for this token)"
          );
        }

        if (token.walletBalance < amount) {
          throw new Error("Mock: Insufficient LLYFI balance for redemption");
        }

        // 2. Perform Swap
        token.walletBalance -= amount;
        token.protocolLiquidity += amount; // Protocol gets LLYFI back

        // Fee calc
        const feeBps = BigInt(next.redemptionCaps.feeBps);
        const fee = (yfiValue * feeBps) / 10000n;
        const netYfi = yfiValue > fee ? yfiValue - fee : 0n;

        // Increase user YFI
        internalUpdateYfiBalance(targetAddress, netYfi);

        // 3. DECREASE YFI Inventory (Limit shrinks)
        next.redemptionCaps.globalLimit -= yfiValue;
        if (cap) {
          cap.limit -= yfiValue;
        }

        this.setState(targetAddress, next);
      }

      return nextMockHash();
    };

    return tx;
  }

  debugSetAllowance(
    user: Address,
    tokenAddress: Address,
    _spender: Address,
    amount: bigint
  ) {
    const state = this.getOrCreate(user);
    const symbol = MOCK_LLYFI_MAP[tokenAddress.toLowerCase()];
    if (!symbol) return;

    const next = {
      ...state,
      llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
    };

    const token = next.llyfiTokens.find((t) => t.symbol === symbol);
    if (token) {
      token.allowance = amount;
      this.setState(user, next);
    }
  }

  debugSetPendingVeYfi(amount: bigint) {
    if (this.lastAddress) {
      const state = this.getOrCreate(this.lastAddress);
      const next = { ...state, veYfi: { ...state.veYfi! } };
      next.veYfi.legacyBalance = amount;
      next.veYfi.lockedAmount = amount;
      next.veYfi.unlockTime = nowSeconds() + 4 * 365 * 24 * 60 * 60;
      next.veYfi.migrated = false;
      this.setState(this.lastAddress, next);
    } else {
      GLOBAL_PENDING_VEYFI = amount;
      saveToStorage();
    }
  }

  debugSetLlyfiBalance(user: Address, symbol: LlyfiTokenId, amount: bigint) {
    const state = this.getOrCreate(user);
    const next = {
      ...state,
      llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
    };

    const token = next.llyfiTokens.find((t) => t.symbol === symbol);
    if (token) {
      token.walletBalance += amount;
      this.setState(user, next);
    }
  }
}

export function createMockVeyfiClient(options?: VeyfiMockOptions): VeyfiClient {
  return new MockVeyfiClient(options);
}
