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

// --- Global Mock State (Module Scope) ---
const GLOBAL_VEYFI_STORE = new Map<string, VeyfiAccountState>();
const GLOBAL_LAST_ACCRUAL = new Map<string, number>();

/**
 * Helper to reset state during tests or development
 */
export function resetMockVeyfiStore() {
  GLOBAL_VEYFI_STORE.clear();
  GLOBAL_LAST_ACCRUAL.clear();
  veyfiMockTxCounter = 0;
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
    legacyBalance: 10n * 10n ** 18n,
    migrationEligible: true,
    migrated: false,
  };
}

function defaultLlyfiTokens(): LlyfiTokenState[] {
  const base: Array<{ symbol: LlyfiTokenId; name: string; address: Address }> =
    [
      {
        symbol: "sdYFI",
        name: "StakeDAO YFI Locker",
        address: MOCK_SDYFI_ADDRESS,
      },
      { symbol: "upYFI", name: "1UP YFI Locker", address: MOCK_UPYFI_ADDRESS },
      {
        symbol: "coveYFI",
        name: "Cove YFI Locker",
        address: MOCK_COVEYFI_ADDRESS,
      },
    ];

  return base.map((token, i) => ({
    symbol: token.symbol,
    name: token.name,
    address: token.address,
    decimals: 18,
    walletBalance: (5n + BigInt(i)) * 10n ** 18n,
    stakedBalance: 0n,
    cooldownBalance: 0n,
    cooldown: null,
    claimableRewards: 0n,
    accruingRewards: 0n,
    allowance: 0n,
  }));
}

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
    base.redemptionCaps.globalUsed = base.redemptionCaps.globalLimit;
    base.redemptionCaps.perToken = base.redemptionCaps.perToken.map((p) => ({
      ...p,
      used: p.limit,
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
    return created;
  }

  private setState(address: Address, next: VeyfiAccountState) {
    const key = this.getKey(address);
    GLOBAL_VEYFI_STORE.set(key, next);
  }

  async getAccountState(address: Address): Promise<VeyfiAccountState> {
    this.lastAddress = address;
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
        next.veYfi.legacyBalance = 0n;
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
        if (token.stakedBalance > 0n) {
          const freshRewards =
            (token.stakedBalance * MOCK_YFI_PRICE * MOCK_APY_BPS * elapsed) /
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
        if (
          next.redemptionCaps.globalUsed + amount >
          next.redemptionCaps.globalLimit
        ) {
          throw new Error("Global redemption cap exceeded");
        }

        const cap = next.redemptionCaps.perToken.find(
          (c) => c.symbol === symbol
        );

        if (cap && cap.used + amount > cap.limit) {
          throw new Error("Mock: Redemption cap exceeded");
        }

        if (token.walletBalance < amount) {
          throw new Error("Mock: Insufficient LLYFI balance for redemption");
        }

        token.walletBalance -= amount;

        next.redemptionCaps.globalUsed += amount;
        if (cap) {
          cap.used += amount;
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
}

export function createMockVeyfiClient(options?: VeyfiMockOptions): VeyfiClient {
  return new MockVeyfiClient(options);
}

export function setMockLlyfiAllowance(
  user: Address,
  tokenAddress: Address,
  amount: bigint
) {
  const key = user.toLowerCase();
  if (!GLOBAL_VEYFI_STORE.has(key)) return;

  const state = GLOBAL_VEYFI_STORE.get(key)!;

  const symbol = MOCK_LLYFI_MAP[tokenAddress.toLowerCase()];
  if (!symbol) return;

  const next = {
    ...state,
    llyfiTokens: state.llyfiTokens.map((t) => ({ ...t })),
  };

  const token = next.llyfiTokens.find((t) => t.symbol === symbol);
  if (token) {
    token.allowance = amount;
  }

  GLOBAL_VEYFI_STORE.set(key, next);
}

export function setMockRedemptionUsage(
  user: Address,
  globalUsed: bigint,
  perTokenUsed?: Partial<Record<LlyfiTokenId, bigint>>
) {
  const key = user.toLowerCase();
  if (!GLOBAL_VEYFI_STORE.has(key)) return;
  const state = GLOBAL_VEYFI_STORE.get(key)!;
  const next = {
    ...state,
    redemptionCaps: {
      ...state.redemptionCaps,
      globalUsed,
      perToken: state.redemptionCaps.perToken.map((p) => ({
        ...p,
        used: perTokenUsed?.[p.symbol] ?? p.used,
      })),
    },
  };
  GLOBAL_VEYFI_STORE.set(key, next);
}
