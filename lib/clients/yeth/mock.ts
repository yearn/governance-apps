"use client";

import { parseUnits, type Address } from "viem";
import type { PreparedTransaction, TransactionHash } from "@/lib/tx/types";
import type { YethClient } from "./client";
import type {
  YethAccountState,
  YethDebugPreset,
  YethGlobalState,
} from "./types";
import { nowSeconds } from "@/lib/mocks/time";

const ONE = 10n ** 18n;
const BPS = 10_000n;
const SECONDS_PER_DAY = 86_400n;
const STORE_KEY = "mock_yeth_recovery_state_v1";

const CLAIM_WINDOW_OPENS_AT = Date.parse("2026-01-09T12:00:00Z") / 1000;
const CLAIM_WINDOW_CLOSES_AT = Date.parse("2026-04-09T12:00:00Z") / 1000;
const INITIAL_RECOVERY_PPS = 1_143_200_000_000_000_000n; // 1.1432 ETH/share
const PPS_DRIFT_BPS_PER_DAY = 4n; // 0.04% daily
const INITIAL_YIELD_VAULT_TVL = parseUnits("2134.2", 18);
const INITIAL_RECOVERY_TOTAL_SHARES = parseUnits("448.5", 18);
const DEFAULT_SNAPSHOT_LOSS = parseUnits("10", 18);
const DEFAULT_CLAIMABLE = parseUnits("4.25", 18);
const DEFAULT_EXITED_ETH = parseUnits("4.2478", 18);
const DEFAULT_STAYING_SHARES = parseUnits("3.718", 18);

const CONTRACTS = {
  claimContract: "0x1111111111111111111111111111111111111111" as Address,
  recoveryVault: "0x2222222222222222222222222222222222222222" as Address,
  yieldVault: "0x3333333333333333333333333333333333333333" as Address,
};

type AccountRecord = Omit<YethAccountState, "address">;

const GLOBAL_YETH_STORE = new Map<string, AccountRecord>();
let yieldVaultTvlEth = INITIAL_YIELD_VAULT_TVL;
let recoveryVaultTotalShares = INITIAL_RECOVERY_TOTAL_SHARES;
let txCounter = 0;

function cloneState<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(
    JSON.stringify(value, (_key, current) =>
      typeof current === "bigint" ? `BIGINT::${current.toString()}` : current
    ),
    (_key, current) =>
      typeof current === "string" && current.startsWith("BIGINT::")
        ? BigInt(current.slice("BIGINT::".length))
        : current
  );
}

function nextMockHash(): TransactionHash {
  txCounter += 1;
  return `0x${txCounter.toString(16).padStart(64, "0")}` as TransactionHash;
}

function currentPps(now = nowSeconds()) {
  const elapsed = BigInt(Math.max(0, now - CLAIM_WINDOW_OPENS_AT));
  const drift =
    (INITIAL_RECOVERY_PPS * elapsed * PPS_DRIFT_BPS_PER_DAY) /
    (BPS * SECONDS_PER_DAY);
  return INITIAL_RECOVERY_PPS + drift;
}

function saveStore() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify(
        {
          accounts: Array.from(GLOBAL_YETH_STORE.entries()),
          yieldVaultTvlEth,
          recoveryVaultTotalShares,
          txCounter,
        },
        (_key, current) =>
          typeof current === "bigint" ? `BIGINT::${current.toString()}` : current
      )
    );
  } catch {
    // best effort only
  }
}

function loadStore() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw, (_key, current) =>
      typeof current === "string" && current.startsWith("BIGINT::")
        ? BigInt(current.slice("BIGINT::".length))
        : current
    ) as {
      accounts?: Array<[string, AccountRecord]>;
      yieldVaultTvlEth?: bigint;
      recoveryVaultTotalShares?: bigint;
      txCounter?: number;
    };

    if (parsed.accounts) {
      GLOBAL_YETH_STORE.clear();
      for (const [key, value] of parsed.accounts) {
        GLOBAL_YETH_STORE.set(key, value);
      }
    }
    if (typeof parsed.yieldVaultTvlEth === "bigint") {
      yieldVaultTvlEth = parsed.yieldVaultTvlEth;
    }
    if (typeof parsed.recoveryVaultTotalShares === "bigint") {
      recoveryVaultTotalShares = parsed.recoveryVaultTotalShares;
    }
    if (typeof parsed.txCounter === "number" && Number.isFinite(parsed.txCounter)) {
      txCounter = parsed.txCounter;
    }
  } catch {
    // best effort only
  }
}

function createDefaultAccount(): AccountRecord {
  return {
    eligible: true,
    snapshotLossEth: DEFAULT_SNAPSHOT_LOSS,
    claimableNowEth: DEFAULT_CLAIMABLE,
    claimStatus: "unclaimed",
    exitedEthReceived: 0n,
    recoveryVaultShares: 0n,
    lastTxHash: null,
  };
}

loadStore();

export class MockYethClient implements YethClient {
  private lastAddress: Address | null = null;
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 300;
  }

  private getOrCreate(address: Address): AccountRecord {
    const key = address.toLowerCase();
    const current = GLOBAL_YETH_STORE.get(key);
    if (current) return current;
    const seeded = createDefaultAccount();
    GLOBAL_YETH_STORE.set(key, seeded);
    saveStore();
    return seeded;
  }

  async getGlobalState(): Promise<YethGlobalState> {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    const now = nowSeconds();
    const pps = currentPps(now);
    const totalAssetsEth = (recoveryVaultTotalShares * pps) / ONE;

    return {
      asOf: now,
      claimWindow: {
        opensAt: CLAIM_WINDOW_OPENS_AT,
        closesAt: CLAIM_WINDOW_CLOSES_AT,
      },
      approvedYipUrl: "https://gov.yearn.fi",
      manualLateClaimUrl: "https://gov.yearn.fi",
      contracts: CONTRACTS,
      recoveryVault: {
        pps,
        totalAssetsEth,
        totalShares: recoveryVaultTotalShares,
        hasStrategies: false,
      },
      yieldVault: {
        tvlEth: yieldVaultTvlEth,
        performanceFeeBps: 10_000,
        feeRecipient: CONTRACTS.recoveryVault,
      },
      yieldSources: [
        "Strategy yield forwarded from B to A via performance fees",
        "External donations (including stYFI revenue share)",
      ],
      risks: [
        "Smart-contract risk",
        "Strategy and protocol risk",
        "Market events and depegs",
      ],
      treasuryRecoveryVaultShares: 0n,
      treasuryYieldShareBps: 0,
    };
  }

  async getAccountState(address: Address): Promise<YethAccountState> {
    this.lastAddress = address;
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    const account = this.getOrCreate(address);
    return cloneState({
      address,
      ...account,
    });
  }

  async prepareClaimAndExit(): Promise<PreparedTransaction> {
    const address = this.lastAddress;
    if (!address) throw new Error("No account selected");

    return async () => {
      const account = this.getOrCreate(address);
      if (!account.eligible) throw new Error("Account is not eligible");
      if (account.claimStatus !== "unclaimed") throw new Error("Already claimed");
      if (account.claimableNowEth <= 0n) throw new Error("Nothing claimable");

      const claimAmount = account.claimableNowEth;
      if (yieldVaultTvlEth < claimAmount) throw new Error("Insufficient vault liquidity");

      yieldVaultTvlEth -= claimAmount;
      account.claimableNowEth = 0n;
      account.claimStatus = "exited";
      account.exitedEthReceived += claimAmount;
      account.lastTxHash = nextMockHash();
      saveStore();
      return account.lastTxHash;
    };
  }

  async prepareClaimAndStay(): Promise<PreparedTransaction> {
    const address = this.lastAddress;
    if (!address) throw new Error("No account selected");

    return async () => {
      const account = this.getOrCreate(address);
      if (!account.eligible) throw new Error("Account is not eligible");
      if (account.claimStatus !== "unclaimed") throw new Error("Already claimed");
      if (account.claimableNowEth <= 0n) throw new Error("Nothing claimable");

      const claimAmount = account.claimableNowEth;
      if (yieldVaultTvlEth < claimAmount) throw new Error("Insufficient vault liquidity");

      const pps = currentPps();
      const mintedShares = (claimAmount * ONE) / pps;

      yieldVaultTvlEth -= claimAmount;
      recoveryVaultTotalShares += mintedShares;
      account.claimableNowEth = 0n;
      account.claimStatus = "staying";
      account.recoveryVaultShares += mintedShares;
      account.lastTxHash = nextMockHash();
      saveStore();
      return account.lastTxHash;
    };
  }

  async prepareRedeemToEth(): Promise<PreparedTransaction> {
    const address = this.lastAddress;
    if (!address) throw new Error("No account selected");

    return async () => {
      const account = this.getOrCreate(address);
      if (account.claimStatus !== "staying") throw new Error("No recovery vault position");
      if (account.recoveryVaultShares <= 0n) throw new Error("No shares to redeem");

      const shares = account.recoveryVaultShares;
      const pps = currentPps();
      const redeemedEth = (shares * pps) / ONE;

      account.recoveryVaultShares = 0n;
      account.claimStatus = "exited";
      account.exitedEthReceived += redeemedEth;
      account.lastTxHash = nextMockHash();

      if (recoveryVaultTotalShares >= shares) {
        recoveryVaultTotalShares -= shares;
      } else {
        recoveryVaultTotalShares = 0n;
      }

      saveStore();
      return account.lastTxHash;
    };
  }

  debugSetAccountPreset(address: Address, preset: YethDebugPreset) {
    const account = this.getOrCreate(address);

    if (preset === "eligible_unclaimed") {
      account.eligible = true;
      account.snapshotLossEth = DEFAULT_SNAPSHOT_LOSS;
      account.claimableNowEth = DEFAULT_CLAIMABLE;
      account.claimStatus = "unclaimed";
      account.exitedEthReceived = 0n;
      account.recoveryVaultShares = 0n;
      account.lastTxHash = null;
      saveStore();
      return;
    }

    if (preset === "claimed_exited") {
      account.eligible = true;
      account.snapshotLossEth = DEFAULT_SNAPSHOT_LOSS;
      account.claimableNowEth = 0n;
      account.claimStatus = "exited";
      account.exitedEthReceived = DEFAULT_EXITED_ETH;
      account.recoveryVaultShares = 0n;
      account.lastTxHash = nextMockHash();
      saveStore();
      return;
    }

    if (preset === "claimed_staying") {
      account.eligible = true;
      account.snapshotLossEth = DEFAULT_SNAPSHOT_LOSS;
      account.claimableNowEth = 0n;
      account.claimStatus = "staying";
      account.exitedEthReceived = 0n;
      account.recoveryVaultShares = DEFAULT_STAYING_SHARES;
      account.lastTxHash = nextMockHash();
      if (recoveryVaultTotalShares < DEFAULT_STAYING_SHARES) {
        recoveryVaultTotalShares = DEFAULT_STAYING_SHARES;
      }
      saveStore();
      return;
    }

    account.eligible = false;
    account.snapshotLossEth = 0n;
    account.claimableNowEth = 0n;
    account.claimStatus = "unclaimed";
    account.exitedEthReceived = 0n;
    account.recoveryVaultShares = 0n;
    account.lastTxHash = null;
    saveStore();
  }
}

export function createMockYethClient(options?: { latencyMs?: number }) {
  return new MockYethClient(options);
}

export function resetMockYethStore() {
  GLOBAL_YETH_STORE.clear();
  yieldVaultTvlEth = INITIAL_YIELD_VAULT_TVL;
  recoveryVaultTotalShares = INITIAL_RECOVERY_TOTAL_SHARES;
  txCounter = 0;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORE_KEY);
  } catch {
    // best effort only
  }
}
