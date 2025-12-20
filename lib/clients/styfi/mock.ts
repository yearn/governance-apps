"use client";

import type { Address } from "viem";
import type { PreparedTransaction, TransactionHash } from "@/lib/tx/types";
import type { StyfiAccountState, StyfiGlobalStats, EpochInfo } from "./types";
import type { StyfiClient, StyfiStakeMode } from "./client";
import { GLOBAL_WORLD_STATE } from "@/lib/mocks/world-state";
import { REWARD_TOKEN_CONFIG } from "@/lib/constants";
import { nowSeconds } from "@/lib/mocks/time";

const GLOBAL_STYFI_STORE = new Map<string, StyfiAccountState>();
const GLOBAL_LAST_ACCRUAL = new Map<string, number>();

let txCounter = 0;
function nextMockHash(): TransactionHash {
  txCounter++;
  return `0x${txCounter.toString(16).padStart(64, "0")}` as TransactionHash;
}

export class MockStyfiClient implements StyfiClient {
  private lastAddress: Address | null = null;
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  private getOrCreate(address: Address): StyfiAccountState {
    const key = address.toLowerCase();
    const identity = GLOBAL_WORLD_STATE.get(address);
    let state = GLOBAL_STYFI_STORE.get(key);

    if (!state) {
      state = {
        address,
        isBlacklisted: identity.isBlacklisted,
        yfiBalance: identity.yfiBalance,
        styfiActive: 0n,
        styfiInCooldown: 0n,
        styfiUnlocked: 0n,
        styfiCooldown: null,
        styfiX: {
          sharesActive: 0n,
          sharesInCooldown: 0n,
          assetsActive: 0n,
          assetsInCooldown: 0n,
          assetsUnlocked: 0n,
          cooldown: null,
        },
        claimableGenericRewards: 0n,
        claimableBoostedRewards: 0n,
        accruingGenericRewards: 0n,
        accruingBoostedRewards: 0n,
        allowances: { yfiToStyfi: 0n, yfiToStyfiX: 0n },
        epoch: {
          currentEpoch: 12,
          epochEnd: nowSeconds() + 864000,
          nextEpochStart: nowSeconds() + 864000,
        },
        earningWeight: 10n ** 18n,
        rewardToken: REWARD_TOKEN_CONFIG,
      };
      GLOBAL_STYFI_STORE.set(key, state);
      GLOBAL_LAST_ACCRUAL.set(key, nowSeconds());
    }
    state.yfiBalance = identity.yfiBalance;
    state.isBlacklisted = identity.isBlacklisted;
    return state;
  }

  async getAccountState(address: Address): Promise<StyfiAccountState> {
    this.lastAddress = address;
    await new Promise((r) => setTimeout(r, this.latencyMs));
    const state = this.getOrCreate(address);
    const now = nowSeconds();
    const last = GLOBAL_LAST_ACCRUAL.get(address.toLowerCase()) || now;
    const elapsed = BigInt(now - last);
    if (elapsed > 0n) {
      const earningAssets =
        state.styfiActive + state.styfiX.assetsActive + 50n * 10n ** 18n;
      state.claimableGenericRewards += (earningAssets * elapsed) / 2000000n;
      GLOBAL_LAST_ACCRUAL.set(address.toLowerCase(), now);
    }
    return state;
  }

  async getEpochInfo(): Promise<EpochInfo> {
    return {
      currentEpoch: 12,
      epochEnd: nowSeconds() + 864000,
      nextEpochStart: nowSeconds() + 864000,
    };
  }

  async getApy(): Promise<bigint> {
    return 6840n;
  }
  async getStats(): Promise<StyfiGlobalStats> {
    return {
      totalSupply: 36666n * 10n ** 18n,
      totalStaked: 2500n * 10n ** 18n,
    };
  }

  async prepareStake(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    const addr = this.lastAddress!;
    return async () => {
      GLOBAL_WORLD_STATE.updateYfi(addr, -amount);
      const s = this.getOrCreate(addr);
      if (mode === "stYFI") s.styfiActive += amount;
      else {
        s.styfiX.assetsActive += amount;
        s.styfiX.sharesActive += amount;
      }
      return nextMockHash();
    };
  }

  async prepareStartCooldown(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    const addr = this.lastAddress!;
    return async () => {
      const s = this.getOrCreate(addr);
      const endsAt = nowSeconds() + 1209600;
      if (mode === "stYFI") {
        s.styfiActive -= amount;
        s.styfiInCooldown += amount;
        s.styfiCooldown = { amount: s.styfiInCooldown, endsAt };
      } else {
        s.styfiX.assetsActive -= amount;
        s.styfiX.assetsInCooldown += amount;
        s.styfiX.cooldown = { amount: s.styfiX.assetsInCooldown, endsAt };
      }
      return nextMockHash();
    };
  }

  async prepareWithdraw(mode: StyfiStakeMode): Promise<PreparedTransaction> {
    const addr = this.lastAddress!;
    return async () => {
      const s = this.getOrCreate(addr);
      const amount =
        mode === "stYFI" ? s.styfiInCooldown : s.styfiX.assetsInCooldown;
      GLOBAL_WORLD_STATE.updateYfi(addr, amount);
      if (mode === "stYFI") {
        s.styfiInCooldown = 0n;
        s.styfiCooldown = null;
      } else {
        s.styfiX.assetsInCooldown = 0n;
        s.styfiX.cooldown = null;
      }
      return nextMockHash();
    };
  }

  async prepareClaimRewards(): Promise<PreparedTransaction> {
    const addr = this.lastAddress!;
    return async () => {
      const s = this.getOrCreate(addr);
      s.claimableGenericRewards = 0n;
      s.claimableBoostedRewards = 0n;
      return nextMockHash();
    };
  }

  debugSetAllowance(u: Address, _t: Address, s: Address, a: bigint) {
    const state = this.getOrCreate(u);
    if (s.toLowerCase().includes("01")) state.allowances.yfiToStyfi = a;
    else state.allowances.yfiToStyfiX = a;
  }
  debugMintYfi(u: Address, a: bigint) {
    GLOBAL_WORLD_STATE.updateYfi(u, a);
  }
}

export function createMockStyfiClient(options?: { latencyMs?: number }) {
  return new MockStyfiClient(options);
}

export function resetMockStyfiStore() {
  GLOBAL_STYFI_STORE.clear();
  GLOBAL_LAST_ACCRUAL.clear();
}
