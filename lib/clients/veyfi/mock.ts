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
  MOCK_LLYFI_MAP,
} from "@/lib/constants";

let txCounter = 0;
function nextMockHash(): TransactionHash {
  txCounter++;
  return `0x${txCounter.toString(16).padStart(64, "0")}` as TransactionHash;
}

const GLOBAL_VEYFI_STORE = new Map<string, VeyfiAccountState>();
let GLOBAL_PENDING_VEYFI: bigint = 0n;

export class MockVeyfiClient implements VeyfiClient {
  private lastAddress: Address | null = null;
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  private getOrCreate(address: Address): VeyfiAccountState {
    const key = address.toLowerCase();
    let state = GLOBAL_VEYFI_STORE.get(key);
    if (!state) {
      state = {
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
            walletBalance: 10n * 10n ** 18n,
            stakedBalance: 0n,
            cooldownBalance: 0n,
            cooldown: null,
            allowance: 0n,
            lockedYfi: 229n * 10n ** 18n,
            veyfiBoost: 1.95,
            totalSupply: 1000n * 10n ** 18n,
            stakedSupply: 236n * 10n ** 18n,
            exchangeRate: 1n * 10n ** 18n,
            protocolLiquidity: 350n * 10n ** 18n,
          },
          {
            symbol: "upYFI",
            name: "1UP",
            address: MOCK_UPYFI_ADDRESS,
            walletBalance: 500000n * 10n ** 18n,
            stakedBalance: 0n,
            cooldownBalance: 0n,
            cooldown: null,
            allowance: 0n,
            lockedYfi: 199n * 10n ** 18n,
            veyfiBoost: 1.98,
            totalSupply: 10000000n * 10n ** 18n,
            stakedSupply: 1434783n * 10n ** 18n,
            exchangeRate: 69420n * 10n ** 18n,
            protocolLiquidity: 25000000n * 10n ** 18n,
          },
          {
            symbol: "coveYFI",
            name: "Cove",
            address: MOCK_COVEYFI_ADDRESS,
            walletBalance: 5n * 10n ** 18n,
            stakedBalance: 0n,
            cooldownBalance: 0n,
            cooldown: null,
            allowance: 0n,
            lockedYfi: 74n * 10n ** 18n,
            veyfiBoost: 1.92,
            totalSupply: 500n * 10n ** 18n,
            stakedSupply: 76n * 10n ** 18n,
            exchangeRate: 1n * 10n ** 18n,
            protocolLiquidity: 50n * 10n ** 18n,
          },
        ],
        inventory: { availableYfi: 600n * 10n ** 18n, feeBps: 500 },
      };
      GLOBAL_VEYFI_STORE.set(key, state);
    }
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
    return state;
  }

  async getGlobalStats(): Promise<VeyfiGlobalStats> {
    return {
      migratedYfi: 4200n * 10n ** 18n,
      legacyYfiSupply: 8000n * 10n ** 18n,
      maxBoostMultiplier: 1.52,
      totalLlyfiStakedPercent: 0.85,
    };
  }

  async prepareMigrateVeYfi(): Promise<PreparedTransaction> {
    return async () => {
      const s = this.getOrCreate(this.lastAddress!);
      if (s.veYfi) s.veYfi.migrated = true;
      return nextMockHash();
    };
  }

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
      if (t && t.cooldown && t.cooldown.endsAt <= nowSeconds()) {
        t.walletBalance += t.cooldownBalance;
        t.cooldownBalance = 0n;
        t.cooldown = null;
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
      const yfiValue = (amount * 10n ** 18n) / t.exchangeRate;
      if (s.inventory.availableYfi < yfiValue)
        throw new Error("Insufficient inventory");
      t.walletBalance -= amount;
      s.inventory.availableYfi -= yfiValue;
      const netYfi = (yfiValue * BigInt(10000 - s.inventory.feeBps)) / 10000n;
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
      GLOBAL_WORLD_STATE.updateYfi(addr, -amount);
      t.walletBalance += (amount * t.exchangeRate) / 10n ** 18n;
      s.inventory.availableYfi += amount;
      return nextMockHash();
    };
  }

  debugSetAllowance(u: Address, t: Address, _s: Address, a: bigint) {
    const s = this.getOrCreate(u);
    const sym = MOCK_LLYFI_MAP[t.toLowerCase()];
    const tok = s.llyfiTokens.find((x) => x.symbol === sym);
    if (tok) tok.allowance = a;
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
  GLOBAL_PENDING_VEYFI = 0n;
}
