// lib/clients/veyfi/mock.ts
"use client";

import type { Address } from "viem";
import type { PreparedTransaction, TransactionHash } from "@/lib/tx/types";
import type {
  VeyfiAccountState,
  LlyfiTokenId,
  VeyfiGlobalStats,
} from "./types";
import type { VeyfiClient } from "./client";
import { GLOBAL_WORLD_STATE } from "@/lib/mocks/world-state";
import { nowSeconds } from "@/lib/mocks/time";
import {
  MOCK_SDYFI_ADDRESS,
  MOCK_UPYFI_ADDRESS,
  MOCK_COVEYFI_ADDRESS,
  MOCK_VEYFI_STAKER_ADDRESS,
  SPENDER_LLYFI_STAKER,
  SPENDER_REDEMPTION,
  STREAM_DURATION,
  MOCK_YFI_ADDRESS,
} from "@/lib/constants";

let txCounter = 0;
function nextMockHash(): TransactionHash {
  txCounter++;
  return `0x${txCounter.toString(16).padStart(64, "0")}` as TransactionHash;
}

const GLOBAL_VEYFI_STORE = new Map<string, VeyfiAccountState>();
const GLOBAL_YFI_ALLOWANCE_STORE = new Map<string, bigint>(); // user -> YFI allowance for Redemption
let GLOBAL_PENDING_VEYFI: bigint = 0n;

// Global Redmption State (Shared across users)
const GLOBAL_REDEMPTION = {
  inventory: 600n * 10n ** 18n, // YFI
  fee: 50000000000000000n, // 5%
  tokens: {
    sdYFI: {
      capacity: 1000n * 10n ** 18n,
      used: 200n * 10n ** 18n,
      inventory: 50n * 10n ** 18n, // LLYFI
    },
    upYFI: {
      capacity: 2000000n * 10n ** 18n,
      used: 100000n * 10n ** 18n,
      inventory: 5000n * 10n ** 18n, // LLYFI
    },
    coveYFI: {
      capacity: 500n * 10n ** 18n,
      used: 10n * 10n ** 18n,
      inventory: 20n * 10n ** 18n, // LLYFI
    },
  },
};

// Helper to calculate withdrawable amount (matching Vyper logic)
function calculateMaxWithdraw(total: bigint, startTime: number): bigint {
  if (startTime === 0 || total === 0n) return 0n;

  const now = nowSeconds();
  const timeElapsed = Math.min(Math.max(0, now - startTime), STREAM_DURATION);
  const claimable = (total * BigInt(timeElapsed)) / BigInt(STREAM_DURATION);
  return claimable;
}

export class MockVeyfiClient implements VeyfiClient {
  private lastAddress: Address | null = null;
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  private getOrCreate(address: Address): VeyfiAccountState {
    const key = address.toLowerCase();
    const existing = GLOBAL_VEYFI_STORE.get(key);
    if (existing) return existing;

    const state: VeyfiAccountState = {
      address,
      veYfi: {
        legacyBalance: 0n,
        lockedAmount: 0n,
        migrationEligible: true,
        migrated: false,
        unlockTime: 0,
      },
      llyfiTokens: [
        {
          symbol: "sdYFI",
          name: "StakeDAO",
          address: MOCK_SDYFI_ADDRESS,
          depositorAddress: MOCK_VEYFI_STAKER_ADDRESS,
          walletBalance: 10n * 10n ** 18n,
          stakedBalance: 0n,
          cooldownBalance: 0n,
          withdrawable: 0n,
          cooldown: null,
          allowance: 0n,
          redemptionAllowance: 0n,
          lockedYfi: 229n * 10n ** 18n,
          veyfiBoost: 1.95,
          totalSupply: 1000n * 10n ** 18n,

          // Ratios (Scale 1)
          stakedAssets: 236n * 10n ** 18n,
          depositorTotalSupply: 236n * 10n ** 18n,
          depositorCapacity: 1000n * 10n ** 18n,

          exchangeRate: 1n * 10n ** 18n,
          redemption: {
            capacity: GLOBAL_REDEMPTION.tokens.sdYFI.capacity,
            used: GLOBAL_REDEMPTION.tokens.sdYFI.used,
            inventory: GLOBAL_REDEMPTION.tokens.sdYFI.inventory,
            fee: GLOBAL_REDEMPTION.fee,
          },
        },
        {
          symbol: "upYFI",
          name: "1UP",
          address: MOCK_UPYFI_ADDRESS,
          depositorAddress: MOCK_VEYFI_STAKER_ADDRESS,
          walletBalance: 500000n * 10n ** 18n,
          stakedBalance: 0n,
          cooldownBalance: 0n,
          withdrawable: 0n,
          cooldown: null,
          allowance: 0n,
          redemptionAllowance: 0n,
          lockedYfi: 199n * 10n ** 18n,
          veyfiBoost: 1.98,
          totalSupply: 10000000n * 10n ** 18n,

          // Ratios (Scale 69420)
          stakedAssets: 1434783n * 10n ** 18n,
          depositorTotalSupply: (1434783n * 10n ** 18n) / 69420n,
          depositorCapacity: (2000000n * 10n ** 18n) / 69420n,

          exchangeRate: 69420n * 10n ** 18n,
          redemption: {
            capacity: GLOBAL_REDEMPTION.tokens.upYFI.capacity,
            used: GLOBAL_REDEMPTION.tokens.upYFI.used,
            inventory: GLOBAL_REDEMPTION.tokens.upYFI.inventory,
            fee: 25000000000000000n, // 2.5%
          },
        },
        {
          symbol: "coveYFI",
          name: "Cove",
          address: MOCK_COVEYFI_ADDRESS,
          depositorAddress: MOCK_VEYFI_STAKER_ADDRESS,
          walletBalance: 5n * 10n ** 18n,
          stakedBalance: 0n,
          cooldownBalance: 0n,
          withdrawable: 0n,
          cooldown: null,
          allowance: 0n,
          redemptionAllowance: 0n,
          lockedYfi: 74n * 10n ** 18n,
          veyfiBoost: 1.92,
          totalSupply: 500n * 10n ** 18n,

          // Ratios (Scale 1)
          stakedAssets: 76n * 10n ** 18n,
          depositorTotalSupply: 76n * 10n ** 18n,
          depositorCapacity: 500n * 10n ** 18n,

          exchangeRate: 1n * 10n ** 18n,
          redemption: {
            capacity: GLOBAL_REDEMPTION.tokens.coveYFI.capacity,
            used: GLOBAL_REDEMPTION.tokens.coveYFI.used,
            inventory: GLOBAL_REDEMPTION.tokens.coveYFI.inventory,
            fee: 100000000000000000n, // 10%
          },
        },
      ],
      inventory: {
        availableYfi: GLOBAL_REDEMPTION.inventory,
        feeBps: Number(GLOBAL_REDEMPTION.fee) / 10 ** 14,
      },
    };
    GLOBAL_VEYFI_STORE.set(key, state);
    return state;
  }

  async getAccountState(address: Address): Promise<VeyfiAccountState> {
    this.lastAddress = address;
    await new Promise((r) => setTimeout(r, this.latencyMs));
    const state = this.getOrCreate(address);
    if (GLOBAL_PENDING_VEYFI > 0n && state.veYfi) {
      state.veYfi.legacyBalance = GLOBAL_PENDING_VEYFI;
      state.veYfi.lockedAmount = GLOBAL_PENDING_VEYFI;
      state.veYfi.unlockTime = nowSeconds() + 126144000;
      GLOBAL_PENDING_VEYFI = 0n;
    }

    // Update withdrawables based on mock time
    for (const token of state.llyfiTokens) {
      if (token.cooldownBalance > 0n && token.cooldown) {
        token.withdrawable = calculateMaxWithdraw(
          token.cooldownBalance,
          token.cooldown.endsAt - STREAM_DURATION
        );
      } else {
        token.withdrawable = 0n;
      }
    }

    // Sync global mock inventory to user state (poor man's syncing)
    state.inventory.availableYfi = GLOBAL_REDEMPTION.inventory;
    state.llyfiTokens[0].redemption.inventory =
      GLOBAL_REDEMPTION.tokens.sdYFI.inventory;
    state.llyfiTokens[1].redemption.inventory =
      GLOBAL_REDEMPTION.tokens.upYFI.inventory;
    state.llyfiTokens[2].redemption.inventory =
      GLOBAL_REDEMPTION.tokens.coveYFI.inventory;

    return state;
  }

  async getGlobalStats(): Promise<VeyfiGlobalStats> {
    return {
      migratedYfi: 4200n * 10n ** 18n,
      lockedYfi: 8000n * 10n ** 18n,
      maxBoostMultiplier: 1.52,
      totalLlyfiStakedPercent: 0.85,
      inventory: {
        availableYfi: GLOBAL_REDEMPTION.inventory,
        feeBps: Number(GLOBAL_REDEMPTION.fee) / 10 ** 14,
      },
      tokens: [
        {
          symbol: "sdYFI",
          name: "StakeDAO",
          address: MOCK_SDYFI_ADDRESS,
          redemption: {
            ...GLOBAL_REDEMPTION.tokens.sdYFI,
            fee: GLOBAL_REDEMPTION.fee,
          },
        },
        {
          symbol: "upYFI",
          name: "1UP",
          address: MOCK_UPYFI_ADDRESS,
          redemption: {
            ...GLOBAL_REDEMPTION.tokens.upYFI,
            fee: 25000000000000000n,
          },
        },
        {
          symbol: "coveYFI",
          name: "Cove",
          address: MOCK_COVEYFI_ADDRESS,
          redemption: {
            ...GLOBAL_REDEMPTION.tokens.coveYFI,
            fee: 100000000000000000n,
          },
        },
      ],
    };
  }

  async prepareMigrateVeYfi(): Promise<PreparedTransaction> {
    return async () => {
      const s = this.getOrCreate(this.lastAddress!);
      if (s.veYfi) s.veYfi.migrated = true;
      return nextMockHash();
    };
  }

  // ... (rest of write methods same as before, simplified for brevity as logic is unchanged)
  async prepareStakeLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const s = this.getOrCreate(this.lastAddress!);
      const t = s.llyfiTokens.find((x) => x.symbol === symbol);
      if (t && t.walletBalance >= amount) {
        t.walletBalance -= amount;
        t.stakedBalance += amount;
      }
      return nextMockHash();
    };
  }

  async prepareStartCooldownLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const s = this.getOrCreate(this.lastAddress!);
      const t = s.llyfiTokens.find((x) => x.symbol === symbol);
      if (t && t.stakedBalance >= amount) {
        if (t.cooldownBalance > 0n && t.cooldown) {
          const liquid = calculateMaxWithdraw(
            t.cooldownBalance,
            t.cooldown.endsAt - STREAM_DURATION
          );
          t.walletBalance += liquid;
          t.cooldownBalance -= liquid;
        }
        t.stakedBalance -= amount;
        t.cooldownBalance += amount;
        t.cooldown = {
          amount: t.cooldownBalance,
          endsAt: nowSeconds() + 1209600,
        };
      }
      return nextMockHash();
    };
  }

  async prepareWithdrawLlyfi(
    symbol: LlyfiTokenId
  ): Promise<PreparedTransaction> {
    return async () => {
      const s = this.getOrCreate(this.lastAddress!);
      const t = s.llyfiTokens.find((x) => x.symbol === symbol);
      if (t && t.cooldown) {
        const withdrawable = t.withdrawable;
        if (withdrawable > 0n) {
          t.walletBalance += withdrawable;
          t.cooldownBalance -= withdrawable;
          if (t.cooldownBalance <= 0n) {
            t.cooldown = null;
            t.cooldownBalance = 0n;
          }
        }
      }
      return nextMockHash();
    };
  }

  async prepareRedeemLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    const addr = this.lastAddress!;
    return async () => {
      const s = this.getOrCreate(addr);
      const t = s.llyfiTokens.find((x) => x.symbol === symbol)!;
      // Note: exchangeRate is hardcoded in mock state
      const yfiValue = (amount * 10n ** 18n) / t.exchangeRate;

      // Update Global State
      const gTok = GLOBAL_REDEMPTION.tokens[symbol];
      if (gTok.used + yfiValue > gTok.capacity) throw new Error("Cap Exceeded");
      if (GLOBAL_REDEMPTION.inventory < yfiValue)
        throw new Error("Insufficient protocol inventory");

      t.walletBalance -= amount;

      // Update Global
      GLOBAL_REDEMPTION.inventory -= yfiValue;
      gTok.used += yfiValue;
      gTok.inventory += amount;

      const feePercent = t.redemption.fee;
      const feeAmount = (yfiValue * feePercent) / 10n ** 18n;
      const netYfi = yfiValue - feeAmount;

      GLOBAL_WORLD_STATE.updateYfi(addr, netYfi);
      return nextMockHash();
    };
  }

  async prepareMintLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    const addr = this.lastAddress!;
    return async () => {
      const s = this.getOrCreate(addr);
      const t = s.llyfiTokens.find((x) => x.symbol === symbol)!;
      const gTok = GLOBAL_REDEMPTION.tokens[symbol];

      if (gTok.inventory < amount)
        throw new Error("Insufficient LLYFI inventory");

      const yfiCost = (amount * 10n ** 18n) / t.exchangeRate;
      GLOBAL_WORLD_STATE.updateYfi(addr, -yfiCost);
      t.walletBalance += amount;

      // Update Global
      gTok.inventory -= amount;
      GLOBAL_REDEMPTION.inventory += yfiCost;
      gTok.used -= yfiCost;

      return nextMockHash();
    };
  }

  debugSetAllowance(u: Address, t: Address, s: Address, a: bigint) {
    if (
      t.toLowerCase() === MOCK_YFI_ADDRESS.toLowerCase() &&
      s.toLowerCase() === SPENDER_REDEMPTION.toLowerCase()
    ) {
      GLOBAL_YFI_ALLOWANCE_STORE.set(u.toLowerCase(), a);
      return;
    }
    const st = this.getOrCreate(u);
    const tok = st.llyfiTokens.find(
      (tk) => tk.address.toLowerCase() === t.toLowerCase()
    );
    if (tok) {
      if (s.toLowerCase() === SPENDER_REDEMPTION.toLowerCase()) {
        tok.redemptionAllowance = a;
      } else if (s.toLowerCase() === SPENDER_LLYFI_STAKER.toLowerCase()) {
        tok.allowance = a;
      }
    }
  }
  debugSetPendingVeYfi(a: bigint) {
    GLOBAL_PENDING_VEYFI = a;
  }
  debugSetLlyfiBalance(u: Address, s: LlyfiTokenId, a: bigint) {
    const st = this.getOrCreate(u);
    const tok = st.llyfiTokens.find((x) => x.symbol === s);
    if (tok) tok.walletBalance = a;
  }
}

export function createMockVeyfiClient(options?: { latencyMs?: number }) {
  return new MockVeyfiClient(options);
}

export function resetMockVeyfiStore() {
  GLOBAL_VEYFI_STORE.clear();
  GLOBAL_YFI_ALLOWANCE_STORE.clear();
  GLOBAL_PENDING_VEYFI = 0n;
  txCounter = 0;
  // Reset Global Redemption
  GLOBAL_REDEMPTION.inventory = 600n * 10n ** 18n;
  GLOBAL_REDEMPTION.tokens.sdYFI.used = 200n * 10n ** 18n;
  GLOBAL_REDEMPTION.tokens.sdYFI.inventory = 50n * 10n ** 18n;
  GLOBAL_REDEMPTION.tokens.upYFI.used = 100000n * 10n ** 18n;
  GLOBAL_REDEMPTION.tokens.upYFI.inventory = 5000n * 10n ** 18n;
  GLOBAL_REDEMPTION.tokens.coveYFI.used = 10n * 10n ** 18n;
  GLOBAL_REDEMPTION.tokens.coveYFI.inventory = 20n * 10n ** 18n;
}

export function setMockRedemptionCapsExhausted() {
  GLOBAL_REDEMPTION.inventory = 0n;
  GLOBAL_REDEMPTION.tokens.sdYFI.used = GLOBAL_REDEMPTION.tokens.sdYFI.capacity;
  GLOBAL_REDEMPTION.tokens.sdYFI.inventory = 0n;
  GLOBAL_REDEMPTION.tokens.upYFI.used = GLOBAL_REDEMPTION.tokens.upYFI.capacity;
  GLOBAL_REDEMPTION.tokens.upYFI.inventory = 0n;
  GLOBAL_REDEMPTION.tokens.coveYFI.used =
    GLOBAL_REDEMPTION.tokens.coveYFI.capacity;
  GLOBAL_REDEMPTION.tokens.coveYFI.inventory = 0n;
}

export function readMockVeyfiAllowance(
  user: Address,
  token: Address,
  spender: Address
): bigint {
  const u = user.toLowerCase();
  const t = token.toLowerCase();
  const s = spender.toLowerCase();
  if (
    t === MOCK_YFI_ADDRESS.toLowerCase() &&
    s === SPENDER_REDEMPTION.toLowerCase()
  ) {
    return GLOBAL_YFI_ALLOWANCE_STORE.get(u) ?? 0n;
  }
  const store = GLOBAL_VEYFI_STORE.get(u);
  if (!store) return 0n;
  const tok = store.llyfiTokens.find((tk) => tk.address.toLowerCase() === t);
  if (!tok) return 0n;
  if (s === SPENDER_REDEMPTION.toLowerCase()) return tok.redemptionAllowance;
  if (s === SPENDER_LLYFI_STAKER.toLowerCase()) return tok.allowance;
  return 0n;
}
