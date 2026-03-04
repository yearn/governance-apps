/// <reference types="@cloudflare/workers-types" />

import deployment from "../../../lib/deployment.json";
import {
  decodeAbiParameters,
  decodeEventLog,
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  namehash,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import {
  ERC20_BALANCE_OF_ABI,
  ERC20_TRANSFER_ABI,
  ERC20_TRANSFER_TOPIC,
  ERC4626_DEPOSIT_ABI,
  ERC4626_DEPOSIT_TOPIC,
  ERC4626_TOTAL_ASSETS_ABI,
  ERC4626_WITHDRAW_ABI,
  ERC4626_WITHDRAW_TOPIC,
  LEGACY_VEYFI_LOCKED_ABI,
  LEGACY_VEYFI_MODIFY_LOCK_ABI,
  LEGACY_VEYFI_MODIFY_LOCK_TOPIC,
  LEGACY_VEYFI_PENALTY_ABI,
  LEGACY_VEYFI_PENALTY_TOPIC,
  LEGACY_VEYFI_WITHDRAW_ABI,
  LEGACY_VEYFI_WITHDRAW_TOPIC,
  LIQUID_LOCKER_EXCHANGE_ABI,
  LIQUID_LOCKER_EXCHANGE_TOPIC,
  LIQUID_LOCKER_REDEEM_ABI,
  LIQUID_LOCKER_REDEEM_TOPIC,
  MONITORED_EVENT_TOPICS,
  VEYFI_DISTRIBUTOR_MIGRATE_ABI,
  VEYFI_DISTRIBUTOR_MIGRATE_TOPIC,
  YETH_CLAIM_CALL_ABI,
  YETH_CLAIM_TOPIC,
  YETH_MONITORED_EVENT_TOPICS,
  YETH_SET_CLAIM_TOPIC,
  ZERO_ADDRESS,
} from "./abis";
import {
  LIQUID_LOCKER_BY_DEPOSITOR,
  LIQUID_LOCKERS,
  LIQUID_LOCKER_REDEMPTION,
  LIQUID_LOCKER_SYMBOL_BY_TOKEN,
  MONITORED_CONTRACTS,
  STYFI,
  STYFIX,
  VEYFI,
  VEYFI_REWARD_DISTRIBUTOR,
  YETH_CLAIM,
  YETH_CLAIM_DEPLOY_BLOCK,
  YETH_MONITORED_CONTRACTS,
  YETH_RECOVERY_VAULT,
  YETH_YIELD_VAULT,
  YFI,
} from "./contracts";
import {
  classifyActionImpact,
  formatActionLine,
  renderTelegramMessage,
  type RedemptionFacilitySnapshot,
  type RenderTelegramMessageOptions,
  shouldPersistSkippedAction,
} from "./messages";
import { formatAmount, formatUtcDate, shortAddress } from "./format";
import { createRpcClient } from "./rpc";
import type {
  RpcClient,
  RpcLog,
  RpcTransaction,
  RpcTransactionReceipt,
} from "./rpc";
import { sendMessage } from "./telegram";
import type { NormalizedAction, YethWithdrawalType } from "./types";

interface Env {
  ALERT_STATE: DurableObjectNamespace;
  RPC_URL: string;
  CONFIRMATIONS?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  ADMIN_CHAT_ID?: string;
  TEST_TO_CHAT_ID?: string;
  DRY_RUN?: string;
  YETH_ALERTS_MODE?: string;
  YETH_ONLY?: string;
  ENABLED?: string;
  ADMIN_TOKEN?: string;
  MANUAL_RUN_ENABLED?: string;
  MANUAL_RUN_TOKEN?: string;
  MAX_MESSAGES_PER_RUN?: string;
  MAX_SUBREQUESTS_PER_RUN?: string;
  BUDGET_STALL_ALERT_THRESHOLD?: string;
  BUDGET_STALL_ALERT_COOLDOWN_SECONDS?: string;
  GLOBAL_DATA_URL?: string;
  DAILY_IMPACT_DIGEST_ENABLED?: string;
}

const ALERT_STATE_SINGLETON = "singleton";
const CURSOR_BLOCK_KEY = "cursorBlock";
const START_BLOCK_KEY = "startBlock";
const YETH_CURSOR_BLOCK_KEY = "yethCursorBlock";
const YETH_START_BLOCK_KEY = "yethStartBlock";
const YETH_STATE_KEY = "yethState";
const YETH_TOTAL_SNAPSHOT_DEBT_KEY = "yeth:total_snapshot_debt_eth";
const YETH_SNAPSHOT_EXITED_KEY = "yeth:snapshot_exited_eth";
const YETH_SNAPSHOT_STAYED_KEY = "yeth:snapshot_stayed_eth";
const YETH_SNAPSHOT_UNCLAIMED_KEY = "yeth:snapshot_unclaimed_eth";
const YETH_OUTSTANDING_DEBT_KEY = "yeth:outstanding_debt_eth";
const OVERRIDE_ENABLED_KEY = "overrideEnabled";
const DEFAULT_CONFIRMATIONS = 6;
const MIN_BLOCK_NUMBER = 0;
const LOG_CHUNK_SIZE = 2_000;
const MAX_CHUNKS_PER_RUN = 10;
const YETH_LOG_CHUNK_SIZE = 10_000;
const DEFAULT_DRY_RUN = true;
const DEFAULT_ENABLED = true;
const DEFAULT_MANUAL_RUN_ENABLED = false;
const DEFAULT_MAX_MESSAGES_PER_RUN = 5;
const DEFAULT_MAX_SUBREQUESTS_PER_RUN = 45;
const DEFAULT_BUDGET_STALL_ALERT_THRESHOLD = 3;
const DEFAULT_BUDGET_STALL_ALERT_COOLDOWN_SECONDS = 60 * 60;
const RESERVED_SEND_SUBREQUESTS_PER_CHUNK = 1;
const UNKNOWN_USER = "unknown";
const SENT_KEY_PREFIX = "sent:";
const SENT_LAST_PRUNE_KEY = "sentMeta:lastPruneTs";
const SENT_PRUNE_INTERVAL_SECONDS = 24 * 60 * 60;
const SENT_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const SENT_MAX_KEYS = 5_000;
const RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY =
  "runMeta:scanBudgetNoProgressCount";
const RUN_META_SCAN_BUDGET_NO_PROGRESS_LAST_ALERT_TS_KEY =
  "runMeta:scanBudgetNoProgressLastAlertTs";
const RUN_META_YFI_PRICE_CTS_KEY = "runMeta:yfiPriceCts";
const RUN_META_YFI_PRICE_FETCHED_AT_KEY = "runMeta:yfiPriceFetchedAt";
const YFI_PRICE_CACHE_TTL_SECONDS = 5 * 60;
const DEFAULT_DAILY_IMPACT_DIGEST_ENABLED = false;
const RUN_META_DAILY_IMPACT_PREFIX = "runMeta:dailyImpact:";
const RUN_META_DAILY_IMPACT_LAST_SENT_DATE_KEY = "runMeta:dailyImpact:lastSentDate";
const MIN_MAX_SUBREQUESTS_PER_RUN = 1;
const ETHERSCAN_TX_BASE_URL = "https://etherscan.io/tx";
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ENS_REGISTRY_ABI = parseAbi([
  "function resolver(bytes32 node) view returns (address)",
]);
const ENS_REVERSE_RESOLVER_ABI = parseAbi([
  "function name(bytes32 node) view returns (string)",
]);
const ETH_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const HEX_TOPIC_ADDRESS_LENGTH = 40;

const LIQUID_LOCKER_TOKEN_BY_SYMBOL = new Map<string, Address>(
  LIQUID_LOCKERS.map((locker) => [locker.symbol.toLowerCase(), locker.token]),
);

type ActiveChatMode =
  | "disabled"
  | "dry_run_test_chat"
  | "dry_run_log_only"
  | "prod";
type YethAlertsMode = "off" | "test" | "prod";
type YethSnapshotBucket = "unclaimed" | "stayed" | "exited";

interface YethRoutingConfig {
  mode: YethAlertsMode;
  only: boolean;
}

interface YethAccountSnapshot {
  snapshotEth: bigint;
  bucket: YethSnapshotBucket;
}

export interface YethState {
  accounts: Map<string, YethAccountSnapshot>;
  trackedStayedSharesByAddress: Map<string, bigint>;
  observedSharesByAddress: Map<string, bigint>;
  trackedStayedSharesTotal: bigint;
  totalSnapshotDebtEth: bigint;
  snapshotExitedEth: bigint;
  snapshotStayedEth: bigint;
  snapshotUnclaimedEth: bigint;
}

interface StoredYethAccountSnapshot {
  snapshotEth: string;
  bucket: YethSnapshotBucket;
}

interface StoredYethState {
  accounts: Record<string, StoredYethAccountSnapshot>;
  trackedStayedSharesByAddress: Record<string, string>;
  observedSharesByAddress: Record<string, string>;
  trackedStayedSharesTotal: string;
  totalSnapshotDebtEth: string;
  snapshotExitedEth: string;
  snapshotStayedEth: string;
  snapshotUnclaimedEth: string;
}

interface YethWithdrawalAttribution {
  owner: string;
  sharesBurned: bigint;
  ownerSharesBefore: bigint;
  ownerSharesAfter: bigint;
  snapshotMovedEth: bigint;
  withdrawalType: YethWithdrawalType;
}

type YethDecodedEvent =
  | {
      kind: "set_claim";
      account: Address;
      snapshotEth: bigint;
      log: RpcLog;
    }
  | {
      kind: "claim";
      account: Address;
      snapshotEth: bigint;
      log: RpcLog;
    }
  | {
      kind: "deposit";
      sender: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
      log: RpcLog;
    }
  | {
      kind: "withdraw";
      sender: Address;
      receiver: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
      log: RpcLog;
    }
  | {
      kind: "transfer";
      sender: Address;
      receiver: Address;
      value: bigint;
      log: RpcLog;
    };

interface LegacyLockSnapshot {
  amount: bigint;
  end: bigint;
}

interface ChunkScanResult {
  actions: NormalizedAction[];
  chunkComplete: boolean;
  lastProcessedBlock: number;
  budgetExhausted: boolean;
}

interface ChunkScanOptions {
  isLogAlreadyProcessed?: (log: RpcLog) => Promise<boolean>;
}

interface DispatchActionsResult {
  completed: boolean;
  lastDispatchedBlock: number;
  budgetExhausted: boolean;
  processedActions: number;
  emittedMessages: number;
  lastEmittedTxHash: string | null;
  throttled: boolean;
  throttledSuppressedCount: number;
  throttledSuppressedFromBlock: number | null;
  throttledSuppressedToBlock: number | null;
}

type DispatchActionResult =
  | {
      status: "processed";
      emitted: boolean;
      txHash: string | null;
      blockNumber: number | null;
    }
  | {
      status: "budget_exhausted";
    }
  | {
      status: "throttled";
    };

interface ScanBudgetNoProgressStateResult {
  consecutiveCount: number;
  alertSent: boolean;
}

interface ActiveChatRoute {
  enabled: boolean;
  dryRun: boolean;
  mode: ActiveChatMode;
  chatId: string | null;
  botToken: string;
}

interface ThrottledSummary {
  sent: number;
  suppressed: number;
  fromBlock: number;
  toBlock: number;
  lastSentTxHash: string | null;
}

interface DispatchMessageContext {
  rpc: RpcClient;
  yfiPriceCents: bigint | null;
  blockTimestampCache: Map<number, number | null>;
  fallbackTimestampSeconds: number;
  ensNameCache: Map<string, string | null>;
  ensResolutionEnabled: boolean;
}

interface DailyImpactStats {
  total: number;
  counts: Record<string, number>;
  largestImpactYfi: string;
  largestTierLabel: string;
  largestTxHash: string | null;
}

interface AlertRuntimeDependencies {
  createRpcClient: typeof createRpcClient;
  sendMessage: typeof sendMessage;
  now: () => number;
}

const DEFAULT_ALERT_RUNTIME_DEPENDENCIES: AlertRuntimeDependencies = {
  createRpcClient,
  sendMessage,
  now: () => Date.now(),
};

class SubrequestBudgetExceededError extends Error {
  constructor(
    readonly limit: number,
    readonly used: number,
    readonly operation: string,
  ) {
    super(`Subrequest budget exhausted before ${operation}`);
    this.name = "SubrequestBudgetExceededError";
  }
}

class SubrequestBudget {
  private usedSubrequests = 0;
  private reservedSubrequests = 0;

  constructor(readonly limit: number) {}

  consume(operation: string): void {
    const effectiveLimit = this.limit - this.reservedSubrequests;
    if (this.usedSubrequests + 1 > effectiveLimit) {
      throw new SubrequestBudgetExceededError(
        this.limit,
        this.usedSubrequests,
        operation,
      );
    }
    this.usedSubrequests += 1;
  }

  reserveSubrequests(count: number): void {
    const normalized = Math.max(0, Math.floor(count));
    const available = Math.max(0, this.limit - this.usedSubrequests);
    this.reservedSubrequests = Math.min(normalized, available);
  }

  clearReservedSubrequests(): void {
    this.reservedSubrequests = 0;
  }

  consumeReserved(operation: string): void {
    if (this.usedSubrequests + 1 > this.limit) {
      throw new SubrequestBudgetExceededError(
        this.limit,
        this.usedSubrequests,
        operation,
      );
    }

    this.usedSubrequests += 1;
    if (this.reservedSubrequests > 0) {
      this.reservedSubrequests -= 1;
    }
  }

  snapshot(): {
    limit: number;
    used: number;
    remaining: number;
    reserved: number;
    remainingUnreserved: number;
  } {
    return {
      limit: this.limit,
      used: this.usedSubrequests,
      remaining: Math.max(0, this.limit - this.usedSubrequests),
      reserved: this.reservedSubrequests,
      remainingUnreserved: Math.max(
        0,
        this.limit - this.usedSubrequests - this.reservedSubrequests,
      ),
    };
  }
}

function parseConfirmations(rawValue: string | undefined): number {
  if (rawValue === undefined) {
    return DEFAULT_CONFIRMATIONS;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    console.warn("Invalid CONFIRMATIONS value, using default", {
      rawValue,
      defaultValue: DEFAULT_CONFIRMATIONS,
    });
    return DEFAULT_CONFIRMATIONS;
  }

  return parsedValue;
}

function parseBooleanFlag(rawValue: string | undefined, fallback: boolean): boolean {
  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized.length === 0) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  console.warn("Invalid boolean env value; using fallback", {
    rawValue,
    fallback,
  });
  return fallback;
}

function parsePositiveIntegerFlag(
  rawValue: string | undefined,
  fallback: number,
  variableName: string,
): number {
  if (rawValue === undefined) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < MIN_MAX_SUBREQUESTS_PER_RUN) {
    console.warn(`Invalid ${variableName} value, using fallback`, {
      rawValue,
      fallback,
    });
    return fallback;
  }

  return parsedValue;
}

function parseStrictTrueFlag(
  rawValue: string | undefined,
  fallback: boolean,
  variableName: string,
  invalidFallback: boolean = fallback,
): boolean {
  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  console.warn(`Invalid ${variableName} value; expected \"true\" or \"false\"`, {
    rawValue,
    fallback,
    invalidFallback,
  });
  return invalidFallback;
}

function parseYethAlertsMode(rawValue: string | undefined): YethAlertsMode {
  if (rawValue === undefined) {
    return "off";
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "off" || normalized === "test" || normalized === "prod") {
    return normalized;
  }

  console.warn("Invalid YETH_ALERTS_MODE value; expected off|test|prod", {
    rawValue,
  });
  return "off";
}

function parseYethRoutingConfig(env: Env): YethRoutingConfig {
  return {
    mode: parseYethAlertsMode(env.YETH_ALERTS_MODE),
    only: parseStrictTrueFlag(env.YETH_ONLY, false, "YETH_ONLY", false),
  };
}

function getActiveChatRoute(
  env: Env,
  overrideEnabled: boolean | null,
): ActiveChatRoute {
  const enabledFromEnv = parseStrictTrueFlag(
    env.ENABLED,
    DEFAULT_ENABLED,
    "ENABLED",
    false,
  );
  const dryRun = parseStrictTrueFlag(env.DRY_RUN, DEFAULT_DRY_RUN, "DRY_RUN", true);
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const prodChatId = env.TELEGRAM_CHAT_ID?.trim() ?? "";
  const testChatId = env.TEST_TO_CHAT_ID?.trim() ?? "";

  // Env kill switch has precedence over any DO-local override.
  if (!enabledFromEnv) {
    return {
      enabled: false,
      dryRun,
      mode: "disabled",
      chatId: null,
      botToken,
    };
  }

  const enabled = overrideEnabled ?? true;
  if (!enabled) {
    return {
      enabled: false,
      dryRun,
      mode: "disabled",
      chatId: null,
      botToken,
    };
  }

  if (dryRun) {
    if (testChatId.length > 0) {
      return {
        enabled: true,
        dryRun: true,
        mode: "dry_run_test_chat",
        chatId: testChatId,
        botToken,
      };
    }

    return {
      enabled: true,
      dryRun: true,
      mode: "dry_run_log_only",
      chatId: null,
      botToken,
    };
  }

  return {
    enabled: true,
    dryRun: false,
    mode: "prod",
    chatId: prodChatId.length > 0 ? prodChatId : null,
    botToken,
  };
}

function getYethChatRoute(
  env: Env,
  baseRoute: ActiveChatRoute,
  routingConfig: YethRoutingConfig,
): ActiveChatRoute {
  if (!baseRoute.enabled) {
    return baseRoute;
  }

  if (routingConfig.mode === "off") {
    return {
      enabled: false,
      dryRun: baseRoute.dryRun,
      mode: "disabled",
      chatId: null,
      botToken: baseRoute.botToken,
    };
  }

  if (routingConfig.mode === "prod") {
    return baseRoute;
  }

  const testChatId = env.TEST_TO_CHAT_ID?.trim() ?? "";
  if (testChatId.length > 0) {
    return {
      enabled: true,
      dryRun: true,
      mode: "dry_run_test_chat",
      chatId: testChatId,
      botToken: baseRoute.botToken,
    };
  }

  return {
    enabled: true,
    dryRun: true,
    mode: "dry_run_log_only",
    chatId: null,
    botToken: baseRoute.botToken,
  };
}

function assertActiveChatRouteConfigured(route: ActiveChatRoute): void {
  if (!route.enabled) {
    return;
  }

  if (route.chatId === null) {
    if (route.mode === "prod") {
      throw new Error("TELEGRAM_CHAT_ID must be configured when DRY_RUN=false");
    }
    return;
  }

  if (route.botToken.length === 0) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN must be configured when Telegram delivery is active",
    );
  }
}

function getOperationalWarningRoute(env: Env, route: ActiveChatRoute): ActiveChatRoute {
  // Keep production alert feed clean by routing operational warnings to ADMIN_CHAT_ID
  // when configured. Dry-run behavior remains unchanged.
  if (route.dryRun) {
    return route;
  }

  const adminChatId = env.ADMIN_CHAT_ID?.trim() ?? "";
  if (adminChatId.length === 0) {
    return route;
  }

  return {
    ...route,
    chatId: adminChatId,
  };
}

function buildTxLink(txHash: string): string {
  const hash = txHash.trim();
  return `<a href="${ETHERSCAN_TX_BASE_URL}/${hash}">${shortAddress(hash)}</a>`;
}

function formatAlertFooter(blockNumber: number, timestampSeconds: number): string {
  return `<i>Block ${blockNumber.toLocaleString("en-US")} • ${formatUtcDate(
    BigInt(Math.max(0, Math.floor(timestampSeconds))),
  )}</i>`;
}

function parseYfiPriceCts(payload: unknown): bigint | null {
  if (payload === null || typeof payload !== "object") {
    return null;
  }

  const globalBlock = (payload as { global?: unknown }).global;
  if (globalBlock === null || typeof globalBlock !== "object") {
    return null;
  }

  const yfiBlock = (globalBlock as { yfi?: unknown }).yfi;
  if (yfiBlock === null || typeof yfiBlock !== "object") {
    return null;
  }

  const priceValue = (yfiBlock as { priceCts?: unknown }).priceCts;
  if (typeof priceValue === "string" && /^\d+$/.test(priceValue)) {
    return BigInt(priceValue);
  }

  if (
    typeof priceValue === "number" &&
    Number.isFinite(priceValue) &&
    Number.isInteger(priceValue) &&
    priceValue >= 0
  ) {
    return BigInt(priceValue);
  }

  return null;
}

function buildThrottledSummaryMessage(
  summary: ThrottledSummary,
  timestampSeconds: number,
): string {
  const lines = [
    "<b>⚠️ Alerts Throttled</b>",
    "Severity: <b>WARN</b>",
    `Sent: <b>${summary.sent}</b> • Deferred: <b>${summary.suppressed}</b>`,
    `Blocks: <b>${summary.fromBlock}-${summary.toBlock}</b>`,
  ];

  if (summary.lastSentTxHash) {
    lines.push(`Last tx: ${buildTxLink(summary.lastSentTxHash)}`);
  }
  lines.push(formatAlertFooter(summary.toBlock, timestampSeconds));

  return lines.join("\n");
}

function createBudgetedRpcClient(
  rpc: RpcClient,
  budget: SubrequestBudget,
): RpcClient {
  async function getTransactionByHash(
    hash: string,
  ): Promise<RpcTransaction | null>;
  async function getTransactionByHash(
    hashes: string[],
  ): Promise<Array<RpcTransaction | null>>;
  async function getTransactionByHash(
    hashOrHashes: string | string[],
  ): Promise<RpcTransaction | null | Array<RpcTransaction | null>> {
    budget.consume("eth_getTransactionByHash");
    if (typeof hashOrHashes === "string") {
      return rpc.getTransactionByHash(hashOrHashes);
    }
    return rpc.getTransactionByHash(hashOrHashes);
  }

  async function getTransactionReceipt(
    hash: string,
  ): Promise<RpcTransactionReceipt | null>;
  async function getTransactionReceipt(
    hashes: string[],
  ): Promise<Array<RpcTransactionReceipt | null>>;
  async function getTransactionReceipt(
    hashOrHashes: string | string[],
  ): Promise<RpcTransactionReceipt | null | Array<RpcTransactionReceipt | null>> {
    budget.consume("eth_getTransactionReceipt");
    if (typeof hashOrHashes === "string") {
      return rpc.getTransactionReceipt(hashOrHashes);
    }
    return rpc.getTransactionReceipt(hashOrHashes);
  }

  return {
    getBlockNumber: async () => {
      budget.consume("eth_blockNumber");
      return rpc.getBlockNumber();
    },
    getBlockByNumber: async (blockNumber) => {
      budget.consume("eth_getBlockByNumber");
      return rpc.getBlockByNumber(blockNumber);
    },
    getLogs: async (filter) => {
      budget.consume("eth_getLogs");
      return rpc.getLogs(filter);
    },
    getTransactionByHash,
    getTransactionReceipt,
    call: async (request, blockNumber) => {
      budget.consume("eth_call");
      return rpc.call(request, blockNumber);
    },
  };
}

function isAuthorizedManualRun(request: Request, env: Env): boolean {
  const enabled = parseBooleanFlag(
    env.MANUAL_RUN_ENABLED,
    DEFAULT_MANUAL_RUN_ENABLED,
  );
  if (!enabled) {
    return false;
  }

  const token = env.MANUAL_RUN_TOKEN?.trim() ?? "";
  if (token.length === 0) {
    console.warn("Manual run endpoint enabled without MANUAL_RUN_TOKEN");
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${token}`;
}

function isAuthorizedAdminRequest(request: Request, env: Env): boolean {
  const token = env.ADMIN_TOKEN?.trim() ?? "";
  if (token.length === 0) {
    console.warn("Admin endpoint requested without ADMIN_TOKEN configured");
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${token}`;
}

function getGenesisTimestamp(): number {
  const { GENESIS } = deployment;
  if (!Number.isFinite(GENESIS) || GENESIS < 0) {
    throw new Error("deployment.json GENESIS must be a non-negative timestamp");
  }
  return GENESIS;
}

async function findStartBlockByTimestamp(
  rpc: RpcClient,
  headBlock: number,
  timestamp: number,
): Promise<number> {
  let low = MIN_BLOCK_NUMBER;
  let high = headBlock;

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    const block = await rpc.getBlockByNumber(mid);

    if (block.timestamp >= timestamp) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  const candidate = await rpc.getBlockByNumber(low);
  if (candidate.timestamp < timestamp) {
    return low + 1;
  }

  return low;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function parseBigIntString(value: unknown, fallback: bigint = 0n): bigint {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return fallback;
  }
  return BigInt(value);
}

function createEmptyYethState(): YethState {
  return {
    accounts: new Map<string, YethAccountSnapshot>(),
    trackedStayedSharesByAddress: new Map<string, bigint>(),
    observedSharesByAddress: new Map<string, bigint>(),
    trackedStayedSharesTotal: 0n,
    totalSnapshotDebtEth: 0n,
    snapshotExitedEth: 0n,
    snapshotStayedEth: 0n,
    snapshotUnclaimedEth: 0n,
  };
}

export function createEmptyYethStateForTest(): YethState {
  return createEmptyYethState();
}

function cloneYethState(state: YethState): YethState {
  return {
    accounts: new Map(
      Array.from(state.accounts.entries()).map(([address, value]) => [
        address,
        { snapshotEth: value.snapshotEth, bucket: value.bucket },
      ]),
    ),
    trackedStayedSharesByAddress: new Map(state.trackedStayedSharesByAddress),
    observedSharesByAddress: new Map(state.observedSharesByAddress),
    trackedStayedSharesTotal: state.trackedStayedSharesTotal,
    totalSnapshotDebtEth: state.totalSnapshotDebtEth,
    snapshotExitedEth: state.snapshotExitedEth,
    snapshotStayedEth: state.snapshotStayedEth,
    snapshotUnclaimedEth: state.snapshotUnclaimedEth,
  };
}

function mapBigIntFromRecord(record: Record<string, string> | undefined): Map<string, bigint> {
  const output = new Map<string, bigint>();
  if (!record) {
    return output;
  }

  for (const [key, value] of Object.entries(record)) {
    output.set(key, parseBigIntString(value));
  }
  return output;
}

function recordFromBigIntMap(map: Map<string, bigint>): Record<string, string> {
  const entries = Array.from(map.entries()).filter(([, value]) => value !== 0n);
  entries.sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries.map(([key, value]) => [key, value.toString()]));
}

function loadYethState(stored: StoredYethState | null | undefined): YethState {
  if (!stored) {
    return createEmptyYethState();
  }

  const accounts = new Map<string, YethAccountSnapshot>();
  for (const [address, value] of Object.entries(stored.accounts ?? {})) {
    if (
      value.bucket !== "unclaimed" &&
      value.bucket !== "stayed" &&
      value.bucket !== "exited"
    ) {
      continue;
    }
    accounts.set(address, {
      snapshotEth: parseBigIntString(value.snapshotEth),
      bucket: value.bucket,
    });
  }

  const next: YethState = {
    accounts,
    trackedStayedSharesByAddress: mapBigIntFromRecord(
      stored.trackedStayedSharesByAddress,
    ),
    observedSharesByAddress: mapBigIntFromRecord(stored.observedSharesByAddress),
    trackedStayedSharesTotal: parseBigIntString(stored.trackedStayedSharesTotal),
    totalSnapshotDebtEth: parseBigIntString(stored.totalSnapshotDebtEth),
    snapshotExitedEth: parseBigIntString(stored.snapshotExitedEth),
    snapshotStayedEth: parseBigIntString(stored.snapshotStayedEth),
    snapshotUnclaimedEth: parseBigIntString(stored.snapshotUnclaimedEth),
  };

  const recomputedTotal =
    next.snapshotExitedEth + next.snapshotStayedEth + next.snapshotUnclaimedEth;
  if (next.totalSnapshotDebtEth !== recomputedTotal) {
    next.totalSnapshotDebtEth = recomputedTotal;
  }

  return next;
}

function serializeYethState(state: YethState): StoredYethState {
  const accountsEntries = Array.from(state.accounts.entries()).filter(
    ([, value]) => value.snapshotEth > 0n,
  );
  accountsEntries.sort(([left], [right]) => left.localeCompare(right));

  const accounts = Object.fromEntries(
    accountsEntries.map(([address, value]) => [
      address,
      {
        snapshotEth: value.snapshotEth.toString(),
        bucket: value.bucket,
      } satisfies StoredYethAccountSnapshot,
    ]),
  );

  return {
    accounts,
    trackedStayedSharesByAddress: recordFromBigIntMap(state.trackedStayedSharesByAddress),
    observedSharesByAddress: recordFromBigIntMap(state.observedSharesByAddress),
    trackedStayedSharesTotal: state.trackedStayedSharesTotal.toString(),
    totalSnapshotDebtEth: state.totalSnapshotDebtEth.toString(),
    snapshotExitedEth: state.snapshotExitedEth.toString(),
    snapshotStayedEth: state.snapshotStayedEth.toString(),
    snapshotUnclaimedEth: state.snapshotUnclaimedEth.toString(),
  };
}

function recomputeYethTotalSnapshotDebt(state: YethState): void {
  state.totalSnapshotDebtEth =
    state.snapshotExitedEth + state.snapshotStayedEth + state.snapshotUnclaimedEth;
}

function assertYethInvariant(state: YethState, context: string): void {
  const sum =
    state.snapshotExitedEth + state.snapshotStayedEth + state.snapshotUnclaimedEth;
  if (sum !== state.totalSnapshotDebtEth) {
    throw new Error(
      `yETH invariant violated (${context}): exited+stayed+unclaimed != total`,
    );
  }
}

function subtractFloor(value: bigint, amount: bigint): bigint {
  if (amount <= 0n) {
    return value;
  }

  if (amount >= value) {
    return 0n;
  }

  return value - amount;
}

function getYethAccountSnapshot(
  state: YethState,
  account: string,
): YethAccountSnapshot {
  const normalized = normalizeAddress(account);
  const existing = state.accounts.get(normalized);
  if (existing) {
    return existing;
  }

  const created: YethAccountSnapshot = {
    snapshotEth: 0n,
    bucket: "unclaimed",
  };
  state.accounts.set(normalized, created);
  return created;
}

function applySnapshotDeltaToBucket(
  state: YethState,
  bucket: YethSnapshotBucket,
  delta: bigint,
): void {
  if (delta === 0n) {
    return;
  }

  if (bucket === "unclaimed") {
    state.snapshotUnclaimedEth =
      delta > 0n
        ? state.snapshotUnclaimedEth + delta
        : subtractFloor(state.snapshotUnclaimedEth, -delta);
    return;
  }

  if (bucket === "stayed") {
    state.snapshotStayedEth =
      delta > 0n
        ? state.snapshotStayedEth + delta
        : subtractFloor(state.snapshotStayedEth, -delta);
    return;
  }

  state.snapshotExitedEth =
    delta > 0n
      ? state.snapshotExitedEth + delta
      : subtractFloor(state.snapshotExitedEth, -delta);
}

function applyYethSetClaim(
  state: YethState,
  account: string,
  snapshotEth: bigint,
): void {
  const accountState = getYethAccountSnapshot(state, account);
  if (accountState.snapshotEth > 0n) {
    applySnapshotDeltaToBucket(state, accountState.bucket, -accountState.snapshotEth);
  }

  accountState.snapshotEth = snapshotEth > 0n ? snapshotEth : 0n;
  if (accountState.snapshotEth > 0n) {
    applySnapshotDeltaToBucket(state, accountState.bucket, accountState.snapshotEth);
  }

  recomputeYethTotalSnapshotDebt(state);
  assertYethInvariant(state, "SetClaim");
}

function applyYethClaim(
  state: YethState,
  account: string,
  exit: boolean,
  fallbackSnapshotEth: bigint,
): bigint {
  const accountState = getYethAccountSnapshot(state, account);
  if (accountState.snapshotEth === 0n && fallbackSnapshotEth > 0n) {
    accountState.snapshotEth = fallbackSnapshotEth;
    accountState.bucket = "unclaimed";
    applySnapshotDeltaToBucket(state, "unclaimed", fallbackSnapshotEth);
  }

  const snapshotAmount = accountState.snapshotEth;
  if (snapshotAmount <= 0n) {
    recomputeYethTotalSnapshotDebt(state);
    assertYethInvariant(state, "ClaimEmpty");
    return 0n;
  }

  const targetBucket: YethSnapshotBucket = exit ? "exited" : "stayed";
  if (accountState.bucket !== targetBucket) {
    applySnapshotDeltaToBucket(state, accountState.bucket, -snapshotAmount);
    accountState.bucket = targetBucket;
    applySnapshotDeltaToBucket(state, targetBucket, snapshotAmount);
  }

  recomputeYethTotalSnapshotDebt(state);
  assertYethInvariant(state, exit ? "ClaimExit" : "ClaimStay");
  return snapshotAmount;
}

function getMapAmount(map: Map<string, bigint>, key: string): bigint {
  return map.get(normalizeAddress(key)) ?? 0n;
}

function setMapAmount(map: Map<string, bigint>, key: string, value: bigint): void {
  const normalized = normalizeAddress(key);
  if (value <= 0n) {
    map.delete(normalized);
    return;
  }
  map.set(normalized, value);
}

function applyYethShareMintFromClaimStay(
  state: YethState,
  owner: string,
  shares: bigint,
): void {
  if (shares <= 0n) {
    return;
  }

  const current = getMapAmount(state.trackedStayedSharesByAddress, owner);
  setMapAmount(state.trackedStayedSharesByAddress, owner, current + shares);
  state.trackedStayedSharesTotal += shares;
}

function applyYethTransferLedger(
  state: YethState,
  sender: string,
  receiver: string,
  value: bigint,
): YethWithdrawalAttribution | null {
  if (value <= 0n) {
    return null;
  }

  const normalizedSender = normalizeAddress(sender);
  const normalizedReceiver = normalizeAddress(receiver);
  const isMint = normalizedSender === normalizeAddress(ZERO_ADDRESS);
  const isBurn = normalizedReceiver === normalizeAddress(ZERO_ADDRESS);

  if (isMint) {
    const receiverBefore = getMapAmount(state.observedSharesByAddress, normalizedReceiver);
    setMapAmount(state.observedSharesByAddress, normalizedReceiver, receiverBefore + value);
    return null;
  }

  const ownerSharesBefore = getMapAmount(
    state.observedSharesByAddress,
    normalizedSender,
  );
  const ownerTrackedBefore = getMapAmount(
    state.trackedStayedSharesByAddress,
    normalizedSender,
  );
  const burnedOrTransferred = ownerSharesBefore > 0n ? value : 0n;
  const trackedMoved =
    ownerSharesBefore > 0n
      ? (burnedOrTransferred * ownerTrackedBefore) / ownerSharesBefore
      : 0n;
  const ownerSharesAfter = subtractFloor(ownerSharesBefore, burnedOrTransferred);
  const ownerTrackedAfter = subtractFloor(ownerTrackedBefore, trackedMoved);

  setMapAmount(state.observedSharesByAddress, normalizedSender, ownerSharesAfter);
  setMapAmount(
    state.trackedStayedSharesByAddress,
    normalizedSender,
    ownerTrackedAfter,
  );

  if (!isBurn) {
    const receiverBefore = getMapAmount(
      state.observedSharesByAddress,
      normalizedReceiver,
    );
    const receiverTrackedBefore = getMapAmount(
      state.trackedStayedSharesByAddress,
      normalizedReceiver,
    );
    setMapAmount(
      state.observedSharesByAddress,
      normalizedReceiver,
      receiverBefore + burnedOrTransferred,
    );
    setMapAmount(
      state.trackedStayedSharesByAddress,
      normalizedReceiver,
      receiverTrackedBefore + trackedMoved,
    );
    return null;
  }

  const trackedTotalBefore = state.trackedStayedSharesTotal;
  const snapshotStayedBefore = state.snapshotStayedEth;
  const snapshotMovedEth =
    trackedTotalBefore > 0n
      ? (snapshotStayedBefore * trackedMoved) / trackedTotalBefore
      : 0n;

  state.trackedStayedSharesTotal = subtractFloor(
    state.trackedStayedSharesTotal,
    trackedMoved,
  );
  state.snapshotStayedEth = subtractFloor(state.snapshotStayedEth, snapshotMovedEth);
  state.snapshotExitedEth += snapshotMovedEth;
  recomputeYethTotalSnapshotDebt(state);
  assertYethInvariant(state, "TransferBurn");

  const withdrawalType: YethWithdrawalType =
    ownerSharesAfter <= 0n ? "full" : "partial";

  return {
    owner: normalizedSender,
    sharesBurned: burnedOrTransferred,
    ownerSharesBefore,
    ownerSharesAfter,
    snapshotMovedEth,
    withdrawalType,
  };
}

function decodeAddressTopic(topic: string): Address {
  const hex = topic.toLowerCase().replace(/^0x/, "");
  if (hex.length < HEX_TOPIC_ADDRESS_LENGTH) {
    throw new Error(`Invalid address topic length: ${topic}`);
  }

  const sliced = hex.slice(-HEX_TOPIC_ADDRESS_LENGTH);
  return `0x${sliced}` as Address;
}

function decodeYethSetClaimLog(log: RpcLog): { account: Address; snapshotEth: bigint } | null {
  try {
    if (log.topics.length >= 2) {
      const [snapshotEth] = decodeAbiParameters(
        [{ type: "uint256" }],
        log.data as Hex,
      ) as readonly [bigint];
      return {
        account: decodeAddressTopic(log.topics[1]),
        snapshotEth,
      };
    }

    const [account, snapshotEth] = decodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      log.data as Hex,
    ) as readonly [Address, bigint];
    return {
      account,
      snapshotEth,
    };
  } catch (error) {
    console.warn("Failed to decode yETH SetClaim log", {
      error,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    });
    return null;
  }
}

function decodeYethClaimLog(log: RpcLog): { account: Address; snapshotEth: bigint } | null {
  try {
    if (log.topics.length >= 2) {
      const [snapshotEth] = decodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        log.data as Hex,
      ) as readonly [bigint, bigint, bigint];
      return {
        account: decodeAddressTopic(log.topics[1]),
        snapshotEth,
      };
    }

    const [account, snapshotEth] = decodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      log.data as Hex,
    ) as readonly [Address, bigint, bigint, bigint];
    return {
      account,
      snapshotEth,
    };
  } catch (error) {
    console.warn("Failed to decode yETH Claim log", {
      error,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    });
    return null;
  }
}

function decodeYethLog(log: RpcLog): YethDecodedEvent | null {
  if (log.removed) {
    return null;
  }

  const topic0 = log.topics[0]?.toLowerCase();
  if (!topic0) {
    return null;
  }

  const contractAddress = normalizeAddress(log.address);

  if (topic0 === YETH_SET_CLAIM_TOPIC.toLowerCase() && contractAddress === normalizeAddress(YETH_CLAIM)) {
    const decoded = decodeYethSetClaimLog(log);
    if (!decoded) {
      return null;
    }
    return {
      kind: "set_claim",
      account: decoded.account,
      snapshotEth: decoded.snapshotEth,
      log,
    };
  }

  if (topic0 === YETH_CLAIM_TOPIC.toLowerCase() && contractAddress === normalizeAddress(YETH_CLAIM)) {
    const decoded = decodeYethClaimLog(log);
    if (!decoded) {
      return null;
    }
    return {
      kind: "claim",
      account: decoded.account,
      snapshotEth: decoded.snapshotEth,
      log,
    };
  }

  if (topic0 === ERC4626_DEPOSIT_TOPIC.toLowerCase() && contractAddress === normalizeAddress(YETH_RECOVERY_VAULT)) {
    const decoded = decodeEventLog({
      abi: ERC4626_DEPOSIT_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
    };

    return {
      kind: "deposit",
      sender: args.sender,
      owner: args.owner,
      assets: args.assets,
      shares: args.shares,
      log,
    };
  }

  if (topic0 === ERC4626_WITHDRAW_TOPIC.toLowerCase() && contractAddress === normalizeAddress(YETH_RECOVERY_VAULT)) {
    const decoded = decodeEventLog({
      abi: ERC4626_WITHDRAW_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      receiver: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
    };

    return {
      kind: "withdraw",
      sender: args.sender,
      receiver: args.receiver,
      owner: args.owner,
      assets: args.assets,
      shares: args.shares,
      log,
    };
  }

  if (topic0 === ERC20_TRANSFER_TOPIC.toLowerCase() && contractAddress === normalizeAddress(YETH_RECOVERY_VAULT)) {
    const decoded = decodeEventLog({
      abi: ERC20_TRANSFER_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      receiver: Address;
      value: bigint;
    };

    return {
      kind: "transfer",
      sender: args.sender,
      receiver: args.receiver,
      value: args.value,
      log,
    };
  }

  return null;
}

function decodeYethClaimExitFromTransactionInput(
  input: string,
): boolean | null {
  try {
    const decoded = decodeFunctionData({
      abi: YETH_CLAIM_CALL_ABI,
      data: input as Hex,
    });

    if (decoded.functionName !== "claim") {
      return null;
    }

    const argument = decoded.args?.[0];
    return typeof argument === "boolean" ? argument : null;
  } catch {
    return null;
  }
}

function buildYethWithdrawAttributionKey(owner: string, shares: bigint): string {
  return `${normalizeAddress(owner)}:${shares.toString()}`;
}

function buildYethActionAmountsFromState(
  state: YethState,
): Pick<
  NormalizedAction["amounts"],
  | "yethTotalSnapshotDebtEth"
  | "yethSnapshotExitedEth"
  | "yethSnapshotStayedEth"
  | "yethSnapshotUnclaimedEth"
  | "yethOutstandingDebtEth"
> {
  return {
    yethTotalSnapshotDebtEth: state.totalSnapshotDebtEth,
    yethSnapshotExitedEth: state.snapshotExitedEth,
    yethSnapshotStayedEth: state.snapshotStayedEth,
    yethSnapshotUnclaimedEth: state.snapshotUnclaimedEth,
    yethOutstandingDebtEth: state.snapshotStayedEth + state.snapshotUnclaimedEth,
  };
}

function buildYethClaimAction(
  log: RpcLog,
  account: Address,
  exit: boolean,
  snapshotAmount: bigint,
  state: YethState,
): NormalizedAction | null {
  return buildAction(log, {
    kind: exit ? "yeth_claimed_exited" : "yeth_claimed_stayed",
    tokenSymbol: "yETH",
    user: account,
    owner: account,
    receiver: account,
    amounts: {
      yethSnapshotAmount: snapshotAmount,
      ...buildYethActionAmountsFromState(state),
    },
  });
}

function buildYethWithdrawAction(
  event: Extract<YethDecodedEvent, { kind: "withdraw" }>,
  attribution: YethWithdrawalAttribution,
  state: YethState,
): NormalizedAction | null {
  return buildAction(event.log, {
    kind: "yeth_recovery_vault_withdraw",
    tokenSymbol: "yETH",
    user: attribution.owner,
    owner: event.owner,
    receiver: event.receiver,
    caller: event.sender,
    yethWithdrawalType: attribution.withdrawalType,
    amounts: {
      assets: event.assets,
      shares: event.shares,
      yethSnapshotMoved: attribution.snapshotMovedEth,
      yethSharesBurned: attribution.sharesBurned,
      yethOwnerSharesBefore: attribution.ownerSharesBefore,
      yethOwnerSharesAfter: attribution.ownerSharesAfter,
      ...buildYethActionAmountsFromState(state),
    },
  });
}

export async function scanChunkForYethActions(
  rpc: RpcClient,
  fromBlock: number,
  toBlock: number,
  state: YethState,
): Promise<NormalizedAction[]> {
  const logs = await rpc.getLogs({
    address: YETH_MONITORED_CONTRACTS,
    topics: [Array.from(YETH_MONITORED_EVENT_TOPICS)],
    fromBlock,
    toBlock,
  });

  logs.sort((left, right) => {
    const leftBlock = left.blockNumber ?? Number.MAX_SAFE_INTEGER;
    const rightBlock = right.blockNumber ?? Number.MAX_SAFE_INTEGER;
    if (leftBlock !== rightBlock) {
      return leftBlock - rightBlock;
    }

    const leftIndex = left.logIndex ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = right.logIndex ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });

  const decodedEventsByTxHash = new Map<string, YethDecodedEvent[]>();

  for (const log of logs) {
    if (log.transactionHash === null) {
      continue;
    }
    let decoded: YethDecodedEvent | null = null;
    try {
      decoded = decodeYethLog(log);
    } catch (error) {
      console.warn("Failed to decode yETH monitored log", {
        error,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        address: log.address,
        topic0: log.topics[0],
      });
      decoded = null;
    }
    if (decoded === null) {
      continue;
    }

    const txHash = log.transactionHash.toLowerCase();
    const list = decodedEventsByTxHash.get(txHash) ?? [];
    list.push(decoded);
    decodedEventsByTxHash.set(txHash, list);
  }

  const actions: NormalizedAction[] = [];

  for (const [txHash, events] of decodedEventsByTxHash.entries()) {
    const claimEvents = events.filter(
      (event): event is Extract<YethDecodedEvent, { kind: "claim" }> =>
        event.kind === "claim",
    );
    const claimAccounts = new Set<string>(
      claimEvents.map((event) => normalizeAddress(event.account)),
    );
    const depositOwnersInTx = new Set<string>(
      events
        .filter(
          (event): event is Extract<YethDecodedEvent, { kind: "deposit" }> =>
            event.kind === "deposit",
        )
        .map((event) => normalizeAddress(event.owner)),
    );

    let claimExitFromCalldata: boolean | null = null;
    if (claimEvents.length > 0) {
      const tx = await rpc.getTransactionByHash(txHash);
      if (tx?.input) {
        claimExitFromCalldata = decodeYethClaimExitFromTransactionInput(tx.input);
      }
    }

    const pendingWithdrawsByKey = new Map<
      string,
      Array<Extract<YethDecodedEvent, { kind: "withdraw" }>>
    >();
    const burnAttributionsByKey = new Map<string, YethWithdrawalAttribution[]>();

    for (const event of events) {
      if (event.kind === "set_claim") {
        applyYethSetClaim(state, event.account, event.snapshotEth);
        continue;
      }

      if (event.kind === "claim") {
        const account = normalizeAddress(event.account);
        const exit =
          claimExitFromCalldata !== null
            ? claimExitFromCalldata
            : !depositOwnersInTx.has(account);
        const snapshotAmount = applyYethClaim(state, event.account, exit, event.snapshotEth);
        const claimAction = buildYethClaimAction(
          event.log,
          event.account,
          exit,
          snapshotAmount,
          state,
        );
        if (claimAction !== null) {
          actions.push(claimAction);
        }
        continue;
      }

      if (event.kind === "deposit") {
        const owner = normalizeAddress(event.owner);
        if (claimAccounts.has(owner) && claimExitFromCalldata !== true) {
          applyYethShareMintFromClaimStay(state, owner, event.shares);
        }
        continue;
      }

      if (event.kind === "withdraw") {
        const key = buildYethWithdrawAttributionKey(event.owner, event.shares);
        const attributions = burnAttributionsByKey.get(key) ?? [];
        const attribution = attributions.shift() ?? null;
        if (attributions.length === 0) {
          burnAttributionsByKey.delete(key);
        } else {
          burnAttributionsByKey.set(key, attributions);
        }

        if (attribution !== null) {
          const withdrawAction = buildYethWithdrawAction(event, attribution, state);
          if (withdrawAction !== null) {
            actions.push(withdrawAction);
          }
          continue;
        }

        const pending = pendingWithdrawsByKey.get(key) ?? [];
        pending.push(event);
        pendingWithdrawsByKey.set(key, pending);
        continue;
      }

      const attribution = applyYethTransferLedger(
        state,
        event.sender,
        event.receiver,
        event.value,
      );
      if (attribution === null) {
        continue;
      }

      const key = buildYethWithdrawAttributionKey(
        attribution.owner,
        attribution.sharesBurned,
      );
      const pending = pendingWithdrawsByKey.get(key) ?? [];
      const pendingWithdraw = pending.shift() ?? null;
      if (pending.length === 0) {
        pendingWithdrawsByKey.delete(key);
      } else {
        pendingWithdrawsByKey.set(key, pending);
      }

      if (pendingWithdraw !== null) {
        const withdrawAction = buildYethWithdrawAction(
          pendingWithdraw,
          attribution,
          state,
        );
        if (withdrawAction !== null) {
          actions.push(withdrawAction);
        }
        continue;
      }

      const attributions = burnAttributionsByKey.get(key) ?? [];
      attributions.push(attribution);
      burnAttributionsByKey.set(key, attributions);
    }

    for (const pendingWithdraws of pendingWithdrawsByKey.values()) {
      for (const pendingWithdraw of pendingWithdraws) {
        const fallback: YethWithdrawalAttribution = {
          owner: normalizeAddress(pendingWithdraw.owner),
          sharesBurned: pendingWithdraw.shares,
          ownerSharesBefore: pendingWithdraw.shares,
          ownerSharesAfter: 0n,
          snapshotMovedEth: 0n,
          withdrawalType: "full",
        };
        const withdrawAction = buildYethWithdrawAction(
          pendingWithdraw,
          fallback,
          state,
        );
        if (withdrawAction !== null) {
          actions.push(withdrawAction);
        }
      }
    }
  }

  return actions;
}

function toEventTopics(topics: string[]): [Hex, ...Hex[]] {
  if (topics.length === 0) {
    throw new Error("Cannot decode log without topics");
  }

  return topics as [Hex, ...Hex[]];
}

function getTokenSymbolByContract(address: string): string | null {
  if (address === normalizeAddress(STYFI)) {
    return "stYFI";
  }

  if (address === normalizeAddress(STYFIX)) {
    return "stYFIX";
  }

  const locker = LIQUID_LOCKER_BY_DEPOSITOR.get(address);
  if (locker) {
    return locker.symbol;
  }

  return null;
}

function getLockerSymbolByTokenAddress(tokenAddress: string): string {
  return (
    LIQUID_LOCKER_SYMBOL_BY_TOKEN.get(tokenAddress) ??
    `unknown(${tokenAddress.slice(0, 8)})`
  );
}

function getRequiredLogMetadata(
  log: RpcLog,
): Pick<NormalizedAction, "txHash" | "blockNumber" | "logIndex"> | null {
  if (
    log.transactionHash === null ||
    log.blockNumber === null ||
    log.logIndex === null
  ) {
    console.warn("Skipping log with incomplete metadata", {
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      address: log.address,
      topic0: log.topics[0],
    });
    return null;
  }

  return {
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
  };
}

function buildAction(
  log: RpcLog,
  action: Omit<NormalizedAction, "txHash" | "blockNumber" | "logIndex">,
): NormalizedAction | null {
  const metadata = getRequiredLogMetadata(log);
  if (metadata === null) {
    return null;
  }

  return {
    ...action,
    ...metadata,
  };
}

function classifyModifyLockAction(
  previous: LegacyLockSnapshot,
  amount: bigint,
  locktime: bigint,
): "lock" | "extension" | "update" {
  const previousAmount = previous.amount > 0n ? previous.amount : 0n;

  if (previousAmount === 0n && amount > 0n) {
    return "lock";
  }

  if (previous.end < locktime && previousAmount === amount) {
    return "extension";
  }

  return "update";
}

async function getLegacyLockSnapshotAtPreviousBlock(
  rpc: RpcClient,
  cache: Map<string, LegacyLockSnapshot | null>,
  user: Address,
  eventBlockNumber: number,
): Promise<LegacyLockSnapshot | null> {
  const previousBlock = Math.max(MIN_BLOCK_NUMBER, eventBlockNumber - 1);
  const key = `${normalizeAddress(user)}:${previousBlock}`;
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const callData = encodeFunctionData({
    abi: LEGACY_VEYFI_LOCKED_ABI,
    functionName: "locked",
    args: [user],
  });

  try {
    const rawResult = await rpc.call(
      {
        to: VEYFI,
        data: callData,
      },
      previousBlock,
    );

    const [amount, end] = decodeFunctionResult({
      abi: LEGACY_VEYFI_LOCKED_ABI,
      functionName: "locked",
      data: rawResult as Hex,
    }) as readonly [bigint, bigint];

    const snapshot: LegacyLockSnapshot = { amount, end };
    cache.set(key, snapshot);
    return snapshot;
  } catch (error) {
    if (error instanceof SubrequestBudgetExceededError) {
      throw error;
    }

    console.warn("Failed to fetch previous legacy veYFI lock snapshot", {
      user,
      previousBlock,
      error,
    });

    cache.set(key, null);
    return null;
  }
}

async function decodeLogToAction(
  rpc: RpcClient,
  log: RpcLog,
  legacyLockCache: Map<string, LegacyLockSnapshot | null>,
  withdrawBurnSignatures: Set<string>,
  styfixDepositTxHashes: Set<string>,
): Promise<NormalizedAction | null> {
  if (log.removed) {
    return null;
  }

  const topic0 = log.topics[0]?.toLowerCase();
  if (!topic0) {
    return null;
  }

  const contractAddress = normalizeAddress(log.address);

  if (topic0 === ERC4626_DEPOSIT_TOPIC.toLowerCase()) {
    const tokenSymbol = getTokenSymbolByContract(contractAddress);
    if (tokenSymbol === null) {
      return null;
    }

    // stYFIx deposits also emit an internal stYFI deposit in the same tx.
    // Suppress that internal leg so we only alert on the user-facing stYFIx action.
    if (
      tokenSymbol === "stYFI" &&
      log.transactionHash !== null &&
      styfixDepositTxHashes.has(log.transactionHash.toLowerCase())
    ) {
      return null;
    }

    const decoded = decodeEventLog({
      abi: ERC4626_DEPOSIT_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
    };

    return buildAction(log, {
      kind: "staked",
      tokenSymbol,
      user: args.owner,
      owner: args.owner,
      receiver: args.owner,
      caller: args.sender,
      amounts: {
        assets: args.assets,
        shares: args.shares,
      },
    });
  }

  if (topic0 === ERC4626_WITHDRAW_TOPIC.toLowerCase()) {
    const tokenSymbol = getTokenSymbolByContract(contractAddress);
    if (tokenSymbol === null) {
      return null;
    }

    const decoded = decodeEventLog({
      abi: ERC4626_WITHDRAW_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      receiver: Address;
      owner: Address;
      assets: bigint;
      shares: bigint;
    };

    return buildAction(log, {
      kind: "withdrew_from_cooldown",
      tokenSymbol,
      user: args.owner,
      owner: args.owner,
      receiver: args.receiver,
      caller: args.sender,
      amounts: {
        assets: args.assets,
        shares: args.shares,
      },
    });
  }

  if (topic0 === ERC20_TRANSFER_TOPIC.toLowerCase()) {
    const tokenSymbol = getTokenSymbolByContract(contractAddress);
    if (tokenSymbol === null) {
      return null;
    }

    const decoded = decodeEventLog({
      abi: ERC20_TRANSFER_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      receiver: Address;
      value: bigint;
    };

    if (normalizeAddress(args.receiver) !== normalizeAddress(ZERO_ADDRESS)) {
      return null;
    }

    if (log.transactionHash !== null) {
      const withdrawBurnSignature = buildWithdrawBurnSignature(
        log.transactionHash,
        contractAddress,
        args.value,
      );
      if (withdrawBurnSignatures.has(withdrawBurnSignature)) {
        return null;
      }
    }

    let assets = args.value;
    const locker = LIQUID_LOCKER_BY_DEPOSITOR.get(contractAddress);
    if (locker) {
      // Unstake emits burned shares; convert to asset units for LLYFI alerts.
      assets = args.value * locker.scale;
    }

    return buildAction(log, {
      kind: "initiated_cooldown",
      tokenSymbol,
      user: args.sender,
      amounts: {
        shares: args.value,
        assets,
      },
    });
  }

  if (
    topic0 === LIQUID_LOCKER_REDEEM_TOPIC.toLowerCase() &&
    contractAddress === normalizeAddress(LIQUID_LOCKER_REDEMPTION)
  ) {
    const decoded = decodeEventLog({
      abi: LIQUID_LOCKER_REDEEM_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      token: Address;
      amount: bigint;
      fee: bigint;
    };

    return buildAction(log, {
      kind: "redeem",
      tokenSymbol: getLockerSymbolByTokenAddress(normalizeAddress(args.token)),
      user: UNKNOWN_USER,
      amounts: {
        amount: args.amount,
        // The redeem event encodes fee as a 1e18-scaled rate, not a YFI amount.
        fee: args.fee,
      },
    });
  }

  if (
    topic0 === LIQUID_LOCKER_EXCHANGE_TOPIC.toLowerCase() &&
    contractAddress === normalizeAddress(LIQUID_LOCKER_REDEMPTION)
  ) {
    const decoded = decodeEventLog({
      abi: LIQUID_LOCKER_EXCHANGE_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      token: Address;
      amount: bigint;
    };

    return buildAction(log, {
      kind: "exchange",
      tokenSymbol: getLockerSymbolByTokenAddress(normalizeAddress(args.token)),
      user: UNKNOWN_USER,
      amounts: {
        amount: args.amount,
      },
    });
  }

  if (
    topic0 === VEYFI_DISTRIBUTOR_MIGRATE_TOPIC.toLowerCase() &&
    contractAddress === normalizeAddress(VEYFI_REWARD_DISTRIBUTOR)
  ) {
    const decoded = decodeEventLog({
      abi: VEYFI_DISTRIBUTOR_MIGRATE_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      account: Address;
      unlock_epoch: bigint;
      amount: bigint;
    };

    return buildAction(log, {
      kind: "migrate",
      tokenSymbol: "veYFI",
      user: args.account,
      amounts: {
        amount: args.amount,
        unlockEpoch: args.unlock_epoch,
      },
    });
  }

  if (
    topic0 === LEGACY_VEYFI_MODIFY_LOCK_TOPIC.toLowerCase() &&
    contractAddress === normalizeAddress(VEYFI)
  ) {
    const decoded = decodeEventLog({
      abi: LEGACY_VEYFI_MODIFY_LOCK_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      user: Address;
      amount: bigint;
      locktime: bigint;
    };

    if (log.blockNumber === null) {
      return null;
    }

    const previousLock = await getLegacyLockSnapshotAtPreviousBlock(
      rpc,
      legacyLockCache,
      args.user,
      log.blockNumber,
    );
    if (previousLock === null) {
      console.warn("Skipping ModifyLock event due to unresolved previous lock", {
        user: args.user,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
      return null;
    }

    return buildAction(log, {
      kind: classifyModifyLockAction(previousLock, args.amount, args.locktime),
      tokenSymbol: "veYFI",
      user: args.user,
      caller: args.sender,
      amounts: {
        amount: args.amount,
        locktime: args.locktime,
        previousAmount: previousLock.amount,
        previousLocktime: previousLock.end,
      },
    });
  }

  if (
    topic0 === LEGACY_VEYFI_WITHDRAW_TOPIC.toLowerCase() &&
    contractAddress === normalizeAddress(VEYFI)
  ) {
    const decoded = decodeEventLog({
      abi: LEGACY_VEYFI_WITHDRAW_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      provider: Address;
      value: bigint;
      penalty: bigint;
    };

    return buildAction(log, {
      kind: "legacy_withdraw",
      tokenSymbol: "veYFI",
      user: args.provider,
      amounts: {
        amount: args.value,
        penalty: args.penalty,
      },
    });
  }

  if (
    topic0 === LEGACY_VEYFI_PENALTY_TOPIC.toLowerCase() &&
    contractAddress === normalizeAddress(VEYFI)
  ) {
    const decoded = decodeEventLog({
      abi: LEGACY_VEYFI_PENALTY_ABI,
      topics: toEventTopics(log.topics),
      data: log.data as Hex,
    });

    const args = decoded.args as {
      sender: Address;
      amount: bigint;
    };

    return buildAction(log, {
      kind: "penalty",
      tokenSymbol: "veYFI",
      user: args.sender,
      amounts: {
        amount: args.amount,
      },
    });
  }

  return null;
}

function buildWithdrawBurnSignature(
  txHash: string,
  contractAddress: string,
  shares: bigint,
): string {
  return `${txHash.toLowerCase()}:${contractAddress.toLowerCase()}:${shares.toString()}`;
}

function buildWithdrawBurnSignatures(logs: RpcLog[]): Set<string> {
  const signatures = new Set<string>();

  for (const log of logs) {
    if (log.removed || log.transactionHash === null) {
      continue;
    }

    const topic0 = log.topics[0]?.toLowerCase();
    if (topic0 !== ERC4626_WITHDRAW_TOPIC.toLowerCase()) {
      continue;
    }

    const contractAddress = normalizeAddress(log.address);
    if (getTokenSymbolByContract(contractAddress) === null) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: ERC4626_WITHDRAW_ABI,
        topics: toEventTopics(log.topics),
        data: log.data as Hex,
      });
      const args = decoded.args as {
        sender: Address;
        receiver: Address;
        owner: Address;
        assets: bigint;
        shares: bigint;
      };
      signatures.add(
        buildWithdrawBurnSignature(log.transactionHash, contractAddress, args.shares),
      );
    } catch (error) {
      console.warn("Failed to pre-decode withdraw log for cooldown correlation", {
        error,
        address: log.address,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }
  }

  return signatures;
}

function buildStyfixDepositTxHashes(logs: RpcLog[]): Set<string> {
  const hashes = new Set<string>();

  for (const log of logs) {
    if (log.removed || log.transactionHash === null) {
      continue;
    }

    const topic0 = log.topics[0]?.toLowerCase();
    if (topic0 !== ERC4626_DEPOSIT_TOPIC.toLowerCase()) {
      continue;
    }

    if (normalizeAddress(log.address) !== normalizeAddress(STYFIX)) {
      continue;
    }

    hashes.add(log.transactionHash.toLowerCase());
  }

  return hashes;
}

async function resolveMissingUsers(
  rpc: RpcClient,
  actions: NormalizedAction[],
): Promise<void> {
  const missingUserHashes = Array.from(
    new Set(
      actions
        .filter((action) => action.user === UNKNOWN_USER)
        .map((action) => action.txHash),
    ),
  );

  if (missingUserHashes.length === 0) {
    return;
  }

  const txs = await rpc.getTransactionByHash(missingUserHashes);
  const senderByHash = new Map<string, string>();

  missingUserHashes.forEach((hash, index) => {
    const tx = txs[index];
    if (tx?.from) {
      senderByHash.set(hash, tx.from);
    }
  });

  for (const action of actions) {
    if (action.user !== UNKNOWN_USER) {
      continue;
    }

    action.user = senderByHash.get(action.txHash) ?? UNKNOWN_USER;
  }
}

export async function scanChunkForActionsWithProgress(
  rpc: RpcClient,
  fromBlock: number,
  toBlock: number,
  options: ChunkScanOptions = {},
): Promise<ChunkScanResult> {
  const logs = await rpc.getLogs({
    address: MONITORED_CONTRACTS,
    topics: [Array.from(MONITORED_EVENT_TOPICS)],
    fromBlock,
    toBlock,
  });

  logs.sort((left, right) => {
    const leftBlock = left.blockNumber ?? Number.MAX_SAFE_INTEGER;
    const rightBlock = right.blockNumber ?? Number.MAX_SAFE_INTEGER;
    if (leftBlock !== rightBlock) {
      return leftBlock - rightBlock;
    }

    const leftIndex = left.logIndex ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = right.logIndex ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });

  const withdrawBurnSignatures = buildWithdrawBurnSignatures(logs);
  const styfixDepositTxHashes = buildStyfixDepositTxHashes(logs);
  const legacyLockCache = new Map<string, LegacyLockSnapshot | null>();
  const actions: NormalizedAction[] = [];
  let lastProcessedBlock = fromBlock - 1;
  let budgetExhausted = false;

  for (const log of logs) {
    try {
      if (options.isLogAlreadyProcessed) {
        const alreadyProcessed = await options.isLogAlreadyProcessed(log);
        if (alreadyProcessed) {
          if (log.blockNumber !== null) {
            lastProcessedBlock = Math.max(lastProcessedBlock, log.blockNumber);
          }
          continue;
        }
      }

      const action = await decodeLogToAction(
        rpc,
        log,
        legacyLockCache,
        withdrawBurnSignatures,
        styfixDepositTxHashes,
      );
      if (action !== null) {
        actions.push(action);
      }
      if (log.blockNumber !== null) {
        lastProcessedBlock = Math.max(lastProcessedBlock, log.blockNumber);
      }
    } catch (error) {
      if (error instanceof SubrequestBudgetExceededError) {
        const exhaustedAtBlock =
          log.blockNumber === null ? fromBlock : Math.max(fromBlock, log.blockNumber);
        console.warn("Subrequest budget exhausted while decoding chunk logs", {
          fromBlock,
          toBlock,
          exhaustedAtBlock,
          budget: error,
        });
        return {
          actions,
          chunkComplete: false,
          lastProcessedBlock: Math.max(fromBlock - 1, exhaustedAtBlock - 1),
          budgetExhausted: true,
        };
      }
      console.warn("Failed to decode monitored log", {
        error,
        address: log.address,
        topic0: log.topics[0],
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }
  }

  try {
    await resolveMissingUsers(rpc, actions);
  } catch (error) {
    if (error instanceof SubrequestBudgetExceededError) {
      budgetExhausted = true;
      console.warn("Subrequest budget exhausted while resolving missing users", {
        fromBlock,
        toBlock,
        actionsWithUnknownUser: actions.filter((action) => action.user === UNKNOWN_USER)
          .length,
        budget: error,
      });
    } else {
      throw error;
    }
  }

  return {
    actions,
    chunkComplete: true,
    lastProcessedBlock,
    budgetExhausted,
  };
}

export async function scanChunkForActions(
  rpc: RpcClient,
  fromBlock: number,
  toBlock: number,
): Promise<NormalizedAction[]> {
  const result = await scanChunkForActionsWithProgress(rpc, fromBlock, toBlock);
  return result.actions;
}

async function triggerAlertRun(env: Env): Promise<Response> {
  const id = env.ALERT_STATE.idFromName(ALERT_STATE_SINGLETON);
  const stub = env.ALERT_STATE.get(id);
  return stub.fetch("https://do/run");
}

async function triggerAlertAdmin(
  env: Env,
  path: "/admin/disable" | "/admin/enable" | "/admin/reset",
): Promise<Response> {
  const id = env.ALERT_STATE.idFromName(ALERT_STATE_SINGLETON);
  const stub = env.ALERT_STATE.get(id);
  return stub.fetch(`https://do${path}`, { method: "POST" });
}

async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return new Response("ok", { status: 200 });
  }

  if (request.method === "POST" && url.pathname === "/run") {
    if (!isAuthorizedManualRun(request, env)) {
      return new Response("Forbidden", { status: 403 });
    }
    return triggerAlertRun(env);
  }

  if (
    request.method === "POST" &&
    ["/admin/disable", "/admin/enable", "/admin/reset"].includes(url.pathname)
  ) {
    if (!isAuthorizedAdminRequest(request, env)) {
      return new Response("Forbidden", { status: 403 });
    }

    return triggerAlertAdmin(
      env,
      url.pathname as "/admin/disable" | "/admin/enable" | "/admin/reset",
    );
  }

  return new Response("Not Found", { status: 404 });
}

async function scheduled(_controller: ScheduledController, env: Env): Promise<void> {
  const response = await triggerAlertRun(env);
  if (!response.ok) {
    console.error("Alert run failed", response.status);
  }
}

const worker = { fetch, scheduled };
export default worker;

export class AlertState implements DurableObject {
  constructor(
    private readonly _state: DurableObjectState,
    private readonly _env: Env,
    private readonly _deps: AlertRuntimeDependencies = DEFAULT_ALERT_RUNTIME_DEPENDENCIES,
  ) {}

  private getSentStorageKeyFromMetadata(txHash: string, logIndex: number): string {
    const dedupeKey = `${txHash}:${logIndex}`;
    return `${SENT_KEY_PREFIX}${dedupeKey}`;
  }

  private getSentStorageKey(action: NormalizedAction): string {
    return this.getSentStorageKeyFromMetadata(action.txHash, action.logIndex);
  }

  private async loadYethStateFromStorage(): Promise<YethState> {
    const stored = await this._state.storage.get<StoredYethState>(YETH_STATE_KEY);
    return loadYethState(stored ?? null);
  }

  private async persistYethStateToStorage(state: YethState): Promise<void> {
    const outstandingDebt = state.snapshotStayedEth + state.snapshotUnclaimedEth;

    await this._state.storage.put(YETH_STATE_KEY, serializeYethState(state));
    await this._state.storage.put(
      YETH_TOTAL_SNAPSHOT_DEBT_KEY,
      state.totalSnapshotDebtEth.toString(),
    );
    await this._state.storage.put(
      YETH_SNAPSHOT_EXITED_KEY,
      state.snapshotExitedEth.toString(),
    );
    await this._state.storage.put(
      YETH_SNAPSHOT_STAYED_KEY,
      state.snapshotStayedEth.toString(),
    );
    await this._state.storage.put(
      YETH_SNAPSHOT_UNCLAIMED_KEY,
      state.snapshotUnclaimedEth.toString(),
    );
    await this._state.storage.put(YETH_OUTSTANDING_DEBT_KEY, outstandingDebt.toString());
  }

  private async writeYethCursor(cursorBlock: number): Promise<void> {
    await this._state.storage.put(YETH_CURSOR_BLOCK_KEY, cursorBlock);
  }

  private async maybePersistYethCursor(
    previousCursorBlock: number,
    nextCursorBlock: number,
  ): Promise<number> {
    if (nextCursorBlock <= previousCursorBlock) {
      return previousCursorBlock;
    }

    await this.writeYethCursor(nextCursorBlock);
    return nextCursorBlock;
  }

  private async getOverrideEnabled(): Promise<boolean | null> {
    const value = await this._state.storage.get<boolean | null>(OVERRIDE_ENABLED_KEY);
    if (typeof value === "boolean") {
      return value;
    }
    return null;
  }

  private async hasActionBeenSent(log: RpcLog): Promise<boolean> {
    if (log.transactionHash === null || log.logIndex === null) {
      return false;
    }

    const key = this.getSentStorageKeyFromMetadata(log.transactionHash, log.logIndex);
    const existing = await this._state.storage.get<number>(key);
    return existing !== undefined;
  }

  private async applyEnabledOverride(overrideEnabled: boolean): Promise<void> {
    await this._state.storage.put(OVERRIDE_ENABLED_KEY, overrideEnabled);
    console.log("Updated enabled override", {
      overrideEnabled,
    });
  }

  private async resetRuntimeState(): Promise<{ deletedSentKeys: number }> {
    await this._state.storage.delete(START_BLOCK_KEY);
    await this._state.storage.delete(CURSOR_BLOCK_KEY);
    await this._state.storage.delete(YETH_START_BLOCK_KEY);
    await this._state.storage.delete(YETH_CURSOR_BLOCK_KEY);
    await this._state.storage.delete(YETH_STATE_KEY);
    await this._state.storage.delete(YETH_TOTAL_SNAPSHOT_DEBT_KEY);
    await this._state.storage.delete(YETH_SNAPSHOT_EXITED_KEY);
    await this._state.storage.delete(YETH_SNAPSHOT_STAYED_KEY);
    await this._state.storage.delete(YETH_SNAPSHOT_UNCLAIMED_KEY);
    await this._state.storage.delete(YETH_OUTSTANDING_DEBT_KEY);
    await this._state.storage.delete(SENT_LAST_PRUNE_KEY);
    await this._state.storage.delete(RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY);
    await this._state.storage.delete(
      RUN_META_SCAN_BUDGET_NO_PROGRESS_LAST_ALERT_TS_KEY,
    );
    await this._state.storage.delete(RUN_META_YFI_PRICE_CTS_KEY);
    await this._state.storage.delete(RUN_META_YFI_PRICE_FETCHED_AT_KEY);
    await this._state.storage.delete(RUN_META_DAILY_IMPACT_LAST_SENT_DATE_KEY);

    const sentEntries = await this._state.storage.list<number>({
      prefix: SENT_KEY_PREFIX,
    });
    for (const key of sentEntries.keys()) {
      await this._state.storage.delete(key);
    }
    const dailyImpactEntries = await this._state.storage.list<DailyImpactStats>({
      prefix: RUN_META_DAILY_IMPACT_PREFIX,
    });
    for (const key of dailyImpactEntries.keys()) {
      await this._state.storage.delete(key);
    }

    return { deletedSentKeys: sentEntries.size };
  }

  private async pruneSentEntries(nowSeconds: number): Promise<void> {
    const lastPrunedAt =
      (await this._state.storage.get<number>(SENT_LAST_PRUNE_KEY)) ?? 0;
    const sentEntries = await this._state.storage.list<number>({
      prefix: SENT_KEY_PREFIX,
    });

    const shouldPruneByTime =
      nowSeconds - lastPrunedAt >= SENT_PRUNE_INTERVAL_SECONDS;
    const shouldPruneByCount = sentEntries.size > SENT_MAX_KEYS;

    if (!shouldPruneByTime && !shouldPruneByCount) {
      return;
    }

    const keysToDelete = new Set<string>();
    const cutoffSeconds = nowSeconds - SENT_RETENTION_SECONDS;

    if (shouldPruneByTime) {
      for (const [key, value] of sentEntries.entries()) {
        if (typeof value !== "number" || value < cutoffSeconds) {
          keysToDelete.add(key);
        }
      }
    }

    const remainingAfterCutoff = sentEntries.size - keysToDelete.size;
    if (remainingAfterCutoff > SENT_MAX_KEYS) {
      const sorted = Array.from(sentEntries.entries())
        .filter(([key]) => !keysToDelete.has(key))
        .sort((left, right) => {
          const leftTs = typeof left[1] === "number" ? left[1] : 0;
          const rightTs = typeof right[1] === "number" ? right[1] : 0;
          return leftTs - rightTs;
        });

      const overflow = remainingAfterCutoff - SENT_MAX_KEYS;
      for (let index = 0; index < overflow; index += 1) {
        const entry = sorted[index];
        if (entry) {
          keysToDelete.add(entry[0]);
        }
      }
    }

    for (const key of keysToDelete) {
      await this._state.storage.delete(key);
    }

    await this._state.storage.put(SENT_LAST_PRUNE_KEY, nowSeconds);

    console.log("Pruned sent dedupe entries", {
      deleted: keysToDelete.size,
      totalBefore: sentEntries.size,
      totalAfter: sentEntries.size - keysToDelete.size,
      reason: {
        byTime: shouldPruneByTime,
        byCount: shouldPruneByCount,
      },
    });
  }

  private async getYfiPriceCents(budget: SubrequestBudget): Promise<bigint | null> {
    const nowSeconds = Math.floor(this._deps.now() / 1000);
    const cachedPriceRaw = await this._state.storage.get<string | null>(
      RUN_META_YFI_PRICE_CTS_KEY,
    );
    const cachedFetchedAt =
      (await this._state.storage.get<number>(RUN_META_YFI_PRICE_FETCHED_AT_KEY)) ?? 0;
    const cachedPrice =
      typeof cachedPriceRaw === "string" && /^\d+$/.test(cachedPriceRaw)
        ? BigInt(cachedPriceRaw)
        : null;

    if (
      cachedPrice !== null &&
      cachedFetchedAt > 0 &&
      nowSeconds - cachedFetchedAt <= YFI_PRICE_CACHE_TTL_SECONDS
    ) {
      return cachedPrice;
    }

    const globalDataUrl = this._env.GLOBAL_DATA_URL?.trim() ?? "";
    if (globalDataUrl.length === 0) {
      return cachedPrice;
    }

    try {
      budget.consume("globalData.fetch");
    } catch (error) {
      if (error instanceof SubrequestBudgetExceededError) {
        return cachedPrice;
      }
      throw error;
    }

    try {
      const response = await globalThis.fetch(globalDataUrl, {
        headers: {
          accept: "application/json",
        },
      });
      if (!response.ok) {
        console.warn("Failed to fetch global data for YFI price", {
          status: response.status,
        });
        return cachedPrice;
      }

      const payload = (await response.json().catch(() => null)) as unknown;
      const priceCts = parseYfiPriceCts(payload);
      if (priceCts === null) {
        console.warn("YFI price not found in global data payload");
        return cachedPrice;
      }

      await this._state.storage.put(RUN_META_YFI_PRICE_CTS_KEY, priceCts.toString());
      await this._state.storage.put(RUN_META_YFI_PRICE_FETCHED_AT_KEY, nowSeconds);
      return priceCts;
    } catch (error) {
      console.warn("Failed to refresh YFI price from global data", { error });
      return cachedPrice;
    }
  }

  private async resolveBlockTimestampSeconds(
    rpc: RpcClient,
    blockNumber: number,
    cache: Map<number, number | null>,
  ): Promise<number | null> {
    const cached = cache.get(blockNumber);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const block = await rpc.getBlockByNumber(blockNumber);
      cache.set(blockNumber, block.timestamp);
      return block.timestamp;
    } catch (error) {
      const isExpectedTestStubError =
        error instanceof Error &&
        error.message.toLowerCase().includes("not implemented for test");
      if (
        !(error instanceof SubrequestBudgetExceededError) &&
        !isExpectedTestStubError
      ) {
        console.warn("Failed to resolve block timestamp for Telegram footer", {
          blockNumber,
          error,
        });
      }
      cache.set(blockNumber, null);
      return null;
    }
  }

  private getActionAddressCandidates(action: NormalizedAction): string[] {
    const candidates = [
      action.user,
      action.owner,
      action.receiver,
      action.caller,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    const deduped: string[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
      const trimmed = candidate.trim();
      if (!ETH_ADDRESS_PATTERN.test(trimmed)) {
        continue;
      }

      const normalized = normalizeAddress(trimmed);
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      deduped.push(trimmed);
    }

    return deduped;
  }

  private async resolveEnsNameForAddress(
    address: string,
    context: DispatchMessageContext,
  ): Promise<string | null> {
    const normalizedAddress = normalizeAddress(address.trim());
    const cached = context.ensNameCache.get(normalizedAddress);
    if (cached !== undefined) {
      return cached;
    }

    const reverseNode = namehash(`${normalizedAddress.slice(2)}.addr.reverse`);

    try {
      const resolverCallData = encodeFunctionData({
        abi: ENS_REGISTRY_ABI,
        functionName: "resolver",
        args: [reverseNode],
      });
      const resolverRaw = await context.rpc.call({
        to: ENS_REGISTRY,
        data: resolverCallData,
      });
      const resolverAddress = decodeFunctionResult({
        abi: ENS_REGISTRY_ABI,
        functionName: "resolver",
        data: resolverRaw as Hex,
      }) as Address;

      if (normalizeAddress(resolverAddress) === normalizeAddress(ZERO_ADDRESS)) {
        context.ensNameCache.set(normalizedAddress, null);
        return null;
      }

      const nameCallData = encodeFunctionData({
        abi: ENS_REVERSE_RESOLVER_ABI,
        functionName: "name",
        args: [reverseNode],
      });
      const reverseNameRaw = await context.rpc.call({
        to: resolverAddress,
        data: nameCallData,
      });
      const reverseName = decodeFunctionResult({
        abi: ENS_REVERSE_RESOLVER_ABI,
        functionName: "name",
        data: reverseNameRaw as Hex,
      }) as string;

      const normalizedName = reverseName.trim();
      if (normalizedName.length === 0) {
        context.ensNameCache.set(normalizedAddress, null);
        return null;
      }

      context.ensNameCache.set(normalizedAddress, normalizedName);
      return normalizedName;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";
      const isExpectedTestStubError =
        error instanceof Error &&
        errorMessage.includes("not implemented for test");
      const isAbiZeroDataError = errorMessage.includes("cannot decode zero data");

      if (
        error instanceof SubrequestBudgetExceededError ||
        isExpectedTestStubError ||
        isAbiZeroDataError
      ) {
        context.ensResolutionEnabled = false;
      } else {
        console.warn("Failed to resolve ENS reverse name", {
          address: normalizedAddress,
          error,
        });
      }

      context.ensNameCache.set(normalizedAddress, null);
      return null;
    }
  }

  private async resolveEnsNamesForAction(
    action: NormalizedAction,
    context: DispatchMessageContext,
  ): Promise<Map<string, string> | null> {
    if (!context.ensResolutionEnabled) {
      return null;
    }

    const addresses = this.getActionAddressCandidates(action);
    if (addresses.length === 0) {
      return null;
    }

    const resolved = new Map<string, string>();
    for (const address of addresses) {
      if (!context.ensResolutionEnabled) {
        break;
      }

      const ensName = await this.resolveEnsNameForAddress(address, context);
      if (ensName) {
        resolved.set(normalizeAddress(address), ensName);
      }
    }

    return resolved.size > 0 ? resolved : null;
  }

  private async getErc20BalanceAtBlock(
    rpc: RpcClient,
    token: Address,
    holder: Address,
    blockNumber: number,
  ): Promise<bigint | null> {
    try {
      const data = encodeFunctionData({
        abi: ERC20_BALANCE_OF_ABI,
        functionName: "balanceOf",
        args: [holder],
      });
      const raw = await rpc.call({ to: token, data }, blockNumber);
      const result = decodeFunctionResult({
        abi: ERC20_BALANCE_OF_ABI,
        functionName: "balanceOf",
        data: raw as Hex,
      });
      return result as bigint;
    } catch (error) {
      if (!(error instanceof SubrequestBudgetExceededError)) {
        console.warn("Failed to resolve ERC20 balance at block", {
          token,
          holder,
          blockNumber,
          error,
        });
      }
      return null;
    }
  }

  private async resolveRedemptionFacilitySnapshot(
    action: NormalizedAction,
    rpc: RpcClient,
  ): Promise<RedemptionFacilitySnapshot | null> {
    if (
      (action.kind !== "redeem" && action.kind !== "exchange") ||
      action.tokenSymbol.toLowerCase() !== "coveyfi"
    ) {
      return null;
    }

    const tokenAddress = LIQUID_LOCKER_TOKEN_BY_SYMBOL.get("coveyfi");
    if (!tokenAddress) {
      return null;
    }

    const yfiBalance = await this.getErc20BalanceAtBlock(
      rpc,
      YFI,
      LIQUID_LOCKER_REDEMPTION,
      action.blockNumber,
    );
    const tokenBalance = await this.getErc20BalanceAtBlock(
      rpc,
      tokenAddress,
      LIQUID_LOCKER_REDEMPTION,
      action.blockNumber,
    );

    if (yfiBalance === null || tokenBalance === null) {
      return null;
    }

    return {
      yfiBalance,
      tokenBalance,
      tokenSymbol: "coveYFI",
    };
  }

  private async resolveYethYieldVaultAssetsEth(
    action: NormalizedAction,
    rpc: RpcClient,
  ): Promise<bigint | null> {
    if (
      action.kind !== "yeth_claimed_stayed" &&
      action.kind !== "yeth_claimed_exited" &&
      action.kind !== "yeth_recovery_vault_withdraw"
    ) {
      return null;
    }

    try {
      const data = encodeFunctionData({
        abi: ERC4626_TOTAL_ASSETS_ABI,
        functionName: "totalAssets",
      });
      const raw = await rpc.call(
        {
          to: YETH_YIELD_VAULT,
          data,
        },
        action.blockNumber,
      );
      const result = decodeFunctionResult({
        abi: ERC4626_TOTAL_ASSETS_ABI,
        functionName: "totalAssets",
        data: raw as Hex,
      });
      return result as bigint;
    } catch (error) {
      if (!(error instanceof SubrequestBudgetExceededError)) {
        console.warn("Failed to resolve yETH yield vault totalAssets", {
          error,
          blockNumber: action.blockNumber,
          txHash: action.txHash,
        });
      }
      return null;
    }
  }

  private async buildRenderOptions(
    action: NormalizedAction,
    context: DispatchMessageContext,
  ): Promise<RenderTelegramMessageOptions> {
    const blockTimestampSeconds = await this.resolveBlockTimestampSeconds(
      context.rpc,
      action.blockNumber,
      context.blockTimestampCache,
    );
    const redemptionFacilitySnapshot = await this.resolveRedemptionFacilitySnapshot(
      action,
      context.rpc,
    );
    const yethYieldVaultAssetsEth = await this.resolveYethYieldVaultAssetsEth(
      action,
      context.rpc,
    );
    const ensNamesByAddress = await this.resolveEnsNamesForAction(action, context);

    return {
      yfiPriceCents: context.yfiPriceCents,
      blockTimestampSeconds: blockTimestampSeconds ?? context.fallbackTimestampSeconds,
      redemptionFacilitySnapshot,
      ensNamesByAddress,
      yethYieldVaultAssetsEth,
    };
  }

  private isDailyImpactDigestEnabled(): boolean {
    return parseBooleanFlag(
      this._env.DAILY_IMPACT_DIGEST_ENABLED,
      DEFAULT_DAILY_IMPACT_DIGEST_ENABLED,
    );
  }

  private getUtcDateKey(timestampSeconds: number): string {
    return new Date(Math.floor(timestampSeconds) * 1_000).toISOString().slice(0, 10);
  }

  private async recordDailyImpact(
    action: NormalizedAction,
    timestampSeconds: number,
  ): Promise<void> {
    if (!this.isDailyImpactDigestEnabled()) {
      return;
    }

    const dateKey = this.getUtcDateKey(timestampSeconds);
    const storageKey = `${RUN_META_DAILY_IMPACT_PREFIX}${dateKey}`;
    const existing =
      (await this._state.storage.get<DailyImpactStats>(storageKey)) ?? null;

    const stats: DailyImpactStats = existing ?? {
      total: 0,
      counts: {},
      largestImpactYfi: "0",
      largestTierLabel: "n/a",
      largestTxHash: null,
    };

    const impact = classifyActionImpact(action);
    stats.total += 1;
    stats.counts[impact.tier.key] = (stats.counts[impact.tier.key] ?? 0) + 1;

    const currentLargest = BigInt(stats.largestImpactYfi);
    if (impact.impactYfi > currentLargest) {
      stats.largestImpactYfi = impact.impactYfi.toString();
      stats.largestTierLabel = impact.tier.label;
      stats.largestTxHash = action.txHash;
    }

    await this._state.storage.put(storageKey, stats);
  }

  private buildDailyImpactDigestMessage(
    dateKey: string,
    stats: DailyImpactStats,
    timestampSeconds: number,
  ): string {
    const lines = [
      "<b>📊 Daily Impact Digest (UTC)</b>",
      `Date: <b>${dateKey}</b>`,
      `Alerts: <b>${stats.total}</b>`,
      `Shrimp: <b>${stats.counts.shrimp ?? 0}</b> • Fish: <b>${stats.counts.fish ?? 0}</b> • Dolphin: <b>${stats.counts.dolphin ?? 0}</b>`,
      `Shark: <b>${stats.counts.shark ?? 0}</b> • Whale: <b>${stats.counts.whale ?? 0}</b> • Info: <b>${stats.counts.info ?? 0}</b>`,
      `Largest: <b>${formatAmount(BigInt(stats.largestImpactYfi))}</b> YFI (${stats.largestTierLabel})`,
    ];

    if (stats.largestTxHash) {
      lines.push(`Top tx: ${buildTxLink(stats.largestTxHash)}`);
    }

    lines.push(`<i>Generated ${formatUtcDate(BigInt(timestampSeconds))}</i>`);
    return lines.join("\n");
  }

  private async maybeSendDailyImpactDigest(params: {
    route: ActiveChatRoute;
    budget: SubrequestBudget;
    timestampSeconds: number;
  }): Promise<void> {
    if (!this.isDailyImpactDigestEnabled()) {
      return;
    }
    if (params.route.chatId === null) {
      return;
    }

    const today = this.getUtcDateKey(params.timestampSeconds);
    const yesterday = this.getUtcDateKey(params.timestampSeconds - 24 * 60 * 60);
    if (today === yesterday) {
      return;
    }

    const lastSentDate =
      (await this._state.storage.get<string>(RUN_META_DAILY_IMPACT_LAST_SENT_DATE_KEY)) ??
      "";
    if (lastSentDate === yesterday) {
      return;
    }

    const statsKey = `${RUN_META_DAILY_IMPACT_PREFIX}${yesterday}`;
    const stats = await this._state.storage.get<DailyImpactStats>(statsKey);
    if (!stats || stats.total <= 0) {
      return;
    }

    try {
      params.budget.consume("telegram.sendMessage.dailyDigest");
    } catch (error) {
      if (error instanceof SubrequestBudgetExceededError) {
        console.warn("Skipping daily impact digest due to subrequest budget", {
          yesterday,
        });
        return;
      }
      throw error;
    }

    const message = this.buildDailyImpactDigestMessage(
      yesterday,
      stats,
      params.timestampSeconds,
    );
    await this._deps.sendMessage(params.route.chatId, message, params.route.botToken);
    await this._state.storage.put(RUN_META_DAILY_IMPACT_LAST_SENT_DATE_KEY, yesterday);
    console.log("Delivered daily impact digest", {
      date: yesterday,
      total: stats.total,
    });
  }

  private async dispatchAction(
    action: NormalizedAction,
    options: {
      dryRun: boolean;
      chatId: string | null;
      botToken: string;
      sentAtSeconds: number;
      budget: SubrequestBudget;
      emittedMessages: number;
      maxMessagesPerRun: number;
      messageContext: DispatchMessageContext;
      dailyDigestEnabled: boolean;
    },
  ): Promise<DispatchActionResult> {
    const sentKey = this.getSentStorageKey(action);
    const existing = await this._state.storage.get<number>(sentKey);
    if (existing !== undefined) {
      return {
        status: "processed",
        emitted: false,
        txHash: null,
        blockNumber: null,
      };
    }

    const previewMessage = renderTelegramMessage(action);

    if (previewMessage === null) {
      const persistSkip = shouldPersistSkippedAction(action);
      console.warn("Skipping action with no Telegram template", {
        kind: action.kind,
        tokenSymbol: action.tokenSymbol,
        txHash: action.txHash,
        logIndex: action.logIndex,
        persisted: persistSkip,
      });
      if (persistSkip) {
        await this._state.storage.put(sentKey, options.sentAtSeconds);
      }
      return {
        status: "processed",
        emitted: false,
        txHash: null,
        blockNumber: null,
      };
    }

    if (options.emittedMessages >= options.maxMessagesPerRun) {
      return { status: "throttled" };
    }

    if (options.chatId !== null) {
      try {
        options.budget.consumeReserved("telegram.sendMessage");
      } catch (error) {
        if (error instanceof SubrequestBudgetExceededError) {
          return { status: "budget_exhausted" };
        }
        throw error;
      }
    }

    const renderOptions = await this.buildRenderOptions(action, options.messageContext);
    const message = renderTelegramMessage(action, renderOptions) ?? previewMessage;

    if (options.chatId === null) {
      console.log(formatActionLine(action));
      console.log("[dry-run] telegram_html", message);
      await this._state.storage.put(sentKey, options.sentAtSeconds);
      return {
        status: "processed",
        emitted: true,
        txHash: action.txHash,
        blockNumber: action.blockNumber,
      };
    }

    if (options.dryRun) {
      console.log(formatActionLine(action));
      console.log("[dry-run -> test-chat] telegram_html", message);
    }

    await this._deps.sendMessage(options.chatId, message, options.botToken);

    await this._state.storage.put(sentKey, options.sentAtSeconds);
    if (options.dailyDigestEnabled) {
      await this.recordDailyImpact(action, renderOptions.blockTimestampSeconds ?? options.sentAtSeconds);
    }
    console.log("Delivered Telegram alert", {
      kind: action.kind,
      tokenSymbol: action.tokenSymbol,
      txHash: action.txHash,
      logIndex: action.logIndex,
    });
    return {
      status: "processed",
      emitted: true,
      txHash: action.txHash,
      blockNumber: action.blockNumber,
    };
  }

  private async countSuppressedEmittableActions(actions: NormalizedAction[]): Promise<{
    suppressedCount: number;
    fromBlock: number | null;
    toBlock: number | null;
  }> {
    let suppressedCount = 0;
    let fromBlock: number | null = null;
    let toBlock: number | null = null;

    for (const action of actions) {
      const sentKey = this.getSentStorageKey(action);
      const existing = await this._state.storage.get<number>(sentKey);
      if (existing !== undefined) {
        continue;
      }

      const message = renderTelegramMessage(action);
      if (message === null) {
        continue;
      }

      suppressedCount += 1;
      if (fromBlock === null) {
        fromBlock = action.blockNumber;
      }
      toBlock = action.blockNumber;
    }

    return {
      suppressedCount,
      fromBlock,
      toBlock,
    };
  }

  private async maybeSendThrottledSummary(params: {
    summary: ThrottledSummary | null;
    route: ActiveChatRoute;
    timestampSeconds: number;
  }): Promise<void> {
    if (params.summary === null || params.summary.suppressed <= 0) {
      return;
    }

    const message = buildThrottledSummaryMessage(
      params.summary,
      params.timestampSeconds,
    );
    if (params.route.chatId === null) {
      console.warn("Throttled summary (dry-run log-only mode)", {
        ...params.summary,
        mode: params.route.mode,
      });
      console.log("[dry-run] telegram_html", message);
      return;
    }

    try {
      await this._deps.sendMessage(params.route.chatId, message, params.route.botToken);
      console.log("Delivered throttled summary alert", {
        ...params.summary,
        mode: params.route.mode,
      });
    } catch (error) {
      console.error("Failed to deliver throttled summary alert", {
        ...params.summary,
        mode: params.route.mode,
        error,
      });
    }
  }

  private async dispatchActions(
    actions: NormalizedAction[],
    options: {
      dryRun: boolean;
      chatId: string | null;
      botToken: string;
      fromBlock: number;
      budget: SubrequestBudget;
      emittedMessagesBefore: number;
      maxMessagesPerRun: number;
      messageContext: DispatchMessageContext;
      dailyDigestEnabled: boolean;
    },
  ): Promise<DispatchActionsResult> {
    const sentAtSeconds = Math.floor(this._deps.now() / 1000);
    let lastDispatchedBlock = options.fromBlock - 1;
    let processedActions = 0;
    let emittedMessages = options.emittedMessagesBefore;
    let lastEmittedTxHash: string | null = null;

    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      if (!action) {
        continue;
      }

      const outcome = await this.dispatchAction(action, {
        ...options,
        sentAtSeconds,
        emittedMessages,
      });
      if (outcome.status === "budget_exhausted") {
        const checkpoint = Math.max(options.fromBlock - 1, action.blockNumber - 1);
        console.warn("Subrequest budget exhausted while dispatching actions", {
          fromBlock: options.fromBlock,
          exhaustedAtBlock: action.blockNumber,
          exhaustedAtTxHash: action.txHash,
          exhaustedAtLogIndex: action.logIndex,
          processedActions,
        });
        return {
          completed: false,
          lastDispatchedBlock: checkpoint,
          budgetExhausted: true,
          processedActions,
          emittedMessages,
          lastEmittedTxHash,
          throttled: false,
          throttledSuppressedCount: 0,
          throttledSuppressedFromBlock: null,
          throttledSuppressedToBlock: null,
        };
      }

      if (outcome.status === "throttled") {
        const checkpoint = Math.max(options.fromBlock - 1, action.blockNumber - 1);
        const suppressed = await this.countSuppressedEmittableActions(actions.slice(index));
        console.warn("Alerts throttled by MAX_MESSAGES_PER_RUN", {
          fromBlock: options.fromBlock,
          maxMessagesPerRun: options.maxMessagesPerRun,
          sent: emittedMessages,
          suppressed: suppressed.suppressedCount,
          suppressedFromBlock: suppressed.fromBlock,
          suppressedToBlock: suppressed.toBlock,
          throttledAtBlock: action.blockNumber,
          throttledAtTxHash: action.txHash,
        });
        return {
          completed: false,
          lastDispatchedBlock: checkpoint,
          budgetExhausted: false,
          processedActions,
          emittedMessages,
          lastEmittedTxHash,
          throttled: true,
          throttledSuppressedCount: suppressed.suppressedCount,
          throttledSuppressedFromBlock: suppressed.fromBlock,
          throttledSuppressedToBlock: suppressed.toBlock,
        };
      }

      processedActions += 1;
      lastDispatchedBlock = Math.max(lastDispatchedBlock, action.blockNumber);
      if (outcome.emitted) {
        emittedMessages += 1;
        lastEmittedTxHash = outcome.txHash;
      }
    }

    return {
      completed: true,
      lastDispatchedBlock,
      budgetExhausted: false,
      processedActions,
      emittedMessages,
      lastEmittedTxHash,
      throttled: false,
      throttledSuppressedCount: 0,
      throttledSuppressedFromBlock: null,
      throttledSuppressedToBlock: null,
    };
  }

  private async processYethBackfill(params: {
    rpc: RpcClient;
    confirmedHeadBlock: number;
    route: ActiveChatRoute;
    budget: SubrequestBudget;
    emittedMessagesBefore: number;
    maxMessagesPerRun: number;
    messageContext: DispatchMessageContext;
  }): Promise<{
    emittedMessages: number;
    lastEmittedTxHash: string | null;
    throttledSummary: ThrottledSummary | null;
    processedCursorBlock: number;
    fromBlock: number;
    toBlock: number;
  }> {
    let yethCursorBlock = await this._state.storage.get<number>(YETH_CURSOR_BLOCK_KEY);
    if (yethCursorBlock === undefined) {
      await this._state.storage.put(YETH_START_BLOCK_KEY, YETH_CLAIM_DEPLOY_BLOCK);
      yethCursorBlock = YETH_CLAIM_DEPLOY_BLOCK - 1;
      await this.writeYethCursor(yethCursorBlock);
      console.log("Initialized yETH cursor", {
        startBlock: YETH_CLAIM_DEPLOY_BLOCK,
        cursorBlock: yethCursorBlock,
      });
    }

    const fromBlock = yethCursorBlock + 1;
    const toBlock = params.confirmedHeadBlock;
    let emittedMessages = params.emittedMessagesBefore;
    let lastEmittedTxHash: string | null = null;
    let throttledSummary: ThrottledSummary | null = null;
    let processedCursorBlock = yethCursorBlock;

    if (fromBlock > toBlock) {
      return {
        emittedMessages,
        lastEmittedTxHash,
        throttledSummary,
        processedCursorBlock,
        fromBlock,
        toBlock,
      };
    }

    const persistedState = await this.loadYethStateFromStorage();
    let workingState = cloneYethState(persistedState);
    let nextFromBlock = fromBlock;

    while (nextFromBlock <= toBlock) {
      const chunkFrom = nextFromBlock;
      const chunkTo = Math.min(chunkFrom + YETH_LOG_CHUNK_SIZE - 1, toBlock);
      const chunkState = cloneYethState(workingState);

      if (params.route.chatId !== null) {
        params.budget.reserveSubrequests(RESERVED_SEND_SUBREQUESTS_PER_CHUNK);
      }

      const actions = await scanChunkForYethActions(
        params.rpc,
        chunkFrom,
        chunkTo,
        chunkState,
      );
      params.messageContext.fallbackTimestampSeconds = Math.floor(this._deps.now() / 1000);
      const dispatchResult = await this.dispatchActions(actions, {
        dryRun: params.route.dryRun,
        chatId: params.route.chatId,
        botToken: params.route.botToken,
        fromBlock: chunkFrom,
        budget: params.budget,
        emittedMessagesBefore: emittedMessages,
        maxMessagesPerRun: params.maxMessagesPerRun,
        messageContext: params.messageContext,
        dailyDigestEnabled: false,
      });
      params.budget.clearReservedSubrequests();

      emittedMessages = dispatchResult.emittedMessages;
      if (dispatchResult.lastEmittedTxHash !== null) {
        lastEmittedTxHash = dispatchResult.lastEmittedTxHash;
      }

      if (
        dispatchResult.throttled &&
        dispatchResult.throttledSuppressedCount > 0 &&
        dispatchResult.throttledSuppressedFromBlock !== null &&
        dispatchResult.throttledSuppressedToBlock !== null
      ) {
        throttledSummary = {
          sent: emittedMessages,
          suppressed: dispatchResult.throttledSuppressedCount,
          fromBlock: dispatchResult.throttledSuppressedFromBlock,
          toBlock: dispatchResult.throttledSuppressedToBlock,
          lastSentTxHash: lastEmittedTxHash,
        };
      }

      if (!dispatchResult.completed) {
        break;
      }

      workingState = chunkState;
      await this.persistYethStateToStorage(workingState);
      processedCursorBlock = await this.maybePersistYethCursor(
        processedCursorBlock,
        chunkTo,
      );
      nextFromBlock = chunkTo + 1;
    }

    return {
      emittedMessages,
      lastEmittedTxHash,
      throttledSummary,
      processedCursorBlock,
      fromBlock,
      toBlock,
    };
  }

  private async writeCursor(cursorBlock: number): Promise<void> {
    await this._state.storage.put(CURSOR_BLOCK_KEY, cursorBlock);
  }

  private async maybePersistChunkCursor(
    previousCursorBlock: number,
    nextCursorBlock: number,
  ): Promise<number> {
    if (nextCursorBlock <= previousCursorBlock) {
      return previousCursorBlock;
    }

    await this.writeCursor(nextCursorBlock);
    return nextCursorBlock;
  }

  private buildScanBudgetNoProgressAlertMessage(params: {
    consecutiveCount: number;
    cursorBlock: number;
    fromBlock: number;
    toBlock: number;
    maxSubrequestsPerRun: number;
    timestampSeconds: number;
  }): string {
    return [
      "<b>🚨 Alerts Bot Scan Budget Stall</b>",
      "Severity: <b>CRITICAL</b>",
      `Consecutive: <b>${params.consecutiveCount}</b> • Budget: <b>${params.maxSubrequestsPerRun}</b>`,
      `Cursor: <b>${params.cursorBlock}</b>`,
      `Attempted: <b>${params.fromBlock}-${params.toBlock}</b>`,
      formatAlertFooter(params.toBlock, params.timestampSeconds),
    ].join("\n");
  }

  private async updateScanBudgetNoProgressState(params: {
    triggered: boolean;
    route: ActiveChatRoute;
    cursorBlock: number;
    fromBlock: number;
    toBlock: number;
    maxSubrequestsPerRun: number;
  }): Promise<ScanBudgetNoProgressStateResult> {
    const previousCount =
      (await this._state.storage.get<number>(RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY)) ??
      0;

    if (!params.triggered) {
      if (previousCount > 0) {
        await this._state.storage.put(RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY, 0);
        console.log("Reset scan-budget no-progress counter", {
          previousCount,
        });
      }
      return { consecutiveCount: 0, alertSent: false };
    }

    const consecutiveCount = previousCount + 1;
    await this._state.storage.put(
      RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY,
      consecutiveCount,
    );

    console.warn("Scan budget exhausted with no cursor progress", {
      consecutiveCount,
      cursorBlock: params.cursorBlock,
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
      maxSubrequestsPerRun: params.maxSubrequestsPerRun,
    });

    if (params.route.chatId === null) {
      return { consecutiveCount, alertSent: false };
    }

    const threshold = parsePositiveIntegerFlag(
      this._env.BUDGET_STALL_ALERT_THRESHOLD,
      DEFAULT_BUDGET_STALL_ALERT_THRESHOLD,
      "BUDGET_STALL_ALERT_THRESHOLD",
    );
    if (consecutiveCount < threshold) {
      return { consecutiveCount, alertSent: false };
    }

    const cooldownSeconds = parsePositiveIntegerFlag(
      this._env.BUDGET_STALL_ALERT_COOLDOWN_SECONDS,
      DEFAULT_BUDGET_STALL_ALERT_COOLDOWN_SECONDS,
      "BUDGET_STALL_ALERT_COOLDOWN_SECONDS",
    );
    const nowSeconds = Math.floor(this._deps.now() / 1000);
    const lastAlertTs =
      (await this._state.storage.get<number>(
        RUN_META_SCAN_BUDGET_NO_PROGRESS_LAST_ALERT_TS_KEY,
      )) ?? 0;

    if (lastAlertTs > 0 && nowSeconds - lastAlertTs < cooldownSeconds) {
      console.log("Skipping scan-budget stall alert due to cooldown", {
        consecutiveCount,
        threshold,
        cooldownSeconds,
        lastAlertTs,
        nowSeconds,
      });
      return { consecutiveCount, alertSent: false };
    }

    try {
      await this._deps.sendMessage(
        params.route.chatId,
        this.buildScanBudgetNoProgressAlertMessage({
          consecutiveCount,
          cursorBlock: params.cursorBlock,
          fromBlock: params.fromBlock,
          toBlock: params.toBlock,
          maxSubrequestsPerRun: params.maxSubrequestsPerRun,
          timestampSeconds: nowSeconds,
        }),
        params.route.botToken,
      );
      await this._state.storage.put(
        RUN_META_SCAN_BUDGET_NO_PROGRESS_LAST_ALERT_TS_KEY,
        nowSeconds,
      );
      console.log("Delivered scan-budget stall alert", {
        consecutiveCount,
        threshold,
        cooldownSeconds,
      });
      return { consecutiveCount, alertSent: true };
    } catch (error) {
      console.error("Failed to deliver scan-budget stall alert", {
        error,
        consecutiveCount,
      });
      return { consecutiveCount, alertSent: false };
    }
  }

  private async run(): Promise<void> {
    const overrideEnabled = await this.getOverrideEnabled();
    const route = getActiveChatRoute(this._env, overrideEnabled);
    const yethRoutingConfig = parseYethRoutingConfig(this._env);
    const yethRoute = getYethChatRoute(this._env, route, yethRoutingConfig);
    const warningRoute = getOperationalWarningRoute(this._env, route);
    const yethWarningRoute = getOperationalWarningRoute(this._env, yethRoute);
    const processLegacy = !yethRoutingConfig.only;
    const processYeth = yethRoutingConfig.mode !== "off";

    if (!route.enabled) {
      console.log("Alerts bot disabled", {
        mode: route.mode,
        overrideEnabled,
      });
      return;
    }

    if (processLegacy) {
      assertActiveChatRouteConfigured(route);
    }
    if (processYeth) {
      assertActiveChatRouteConfigured(yethRoute);
    }

    const confirmations = parseConfirmations(this._env.CONFIRMATIONS);
    const maxMessagesPerRun = parsePositiveIntegerFlag(
      this._env.MAX_MESSAGES_PER_RUN,
      DEFAULT_MAX_MESSAGES_PER_RUN,
      "MAX_MESSAGES_PER_RUN",
    );
    const maxSubrequestsPerRun = parsePositiveIntegerFlag(
      this._env.MAX_SUBREQUESTS_PER_RUN,
      DEFAULT_MAX_SUBREQUESTS_PER_RUN,
      "MAX_SUBREQUESTS_PER_RUN",
    );

    const budget = new SubrequestBudget(maxSubrequestsPerRun);
    const baseRpc = this._deps.createRpcClient(this._env.RPC_URL);
    const rpc = createBudgetedRpcClient(baseRpc, budget);

    try {
      const latestHeadBlock = await rpc.getBlockNumber();
      const confirmedHeadBlock = Math.max(
        MIN_BLOCK_NUMBER,
        latestHeadBlock - confirmations,
      );

      await this.pruneSentEntries(Math.floor(this._deps.now() / 1000));
      const yfiPriceCents = await this.getYfiPriceCents(budget);
      const blockTimestampCache = new Map<number, number | null>();
      const messageContext: DispatchMessageContext = {
        rpc,
        yfiPriceCents,
        blockTimestampCache,
        fallbackTimestampSeconds: Math.floor(this._deps.now() / 1000),
        ensNameCache: new Map<string, string | null>(),
        ensResolutionEnabled: route.mode === "prod" || yethRoute.mode === "prod",
      };

      let emittedMessages = 0;
      let lastEmittedTxHash: string | null = null;
      let throttledSummary: ThrottledSummary | null = null;

      if (processYeth) {
        const yethResult = await this.processYethBackfill({
          rpc,
          confirmedHeadBlock,
          route: yethRoute,
          budget,
          emittedMessagesBefore: emittedMessages,
          maxMessagesPerRun,
          messageContext,
        });
        emittedMessages = yethResult.emittedMessages;
        if (yethResult.lastEmittedTxHash !== null) {
          lastEmittedTxHash = yethResult.lastEmittedTxHash;
        }
        const yethThrottledSummary = yethResult.throttledSummary;
        const yethThrottledSummaryTimestamp =
          yethThrottledSummary === null
            ? Math.floor(this._deps.now() / 1000)
            : (await this.resolveBlockTimestampSeconds(
                rpc,
                yethThrottledSummary.toBlock,
                blockTimestampCache,
              )) ?? Math.floor(this._deps.now() / 1000);
        await this.maybeSendThrottledSummary({
          summary: yethThrottledSummary,
          route: yethWarningRoute,
          timestampSeconds: yethThrottledSummaryTimestamp,
        });

        console.log("Completed yETH scan pass", {
          fromBlock: yethResult.fromBlock,
          processedCursorBlock: yethResult.processedCursorBlock,
          toBlock: yethResult.toBlock,
          reachedConfirmedHead: yethResult.processedCursorBlock >= yethResult.toBlock,
          remainingBlocks: Math.max(0, yethResult.toBlock - yethResult.processedCursorBlock),
          mode: yethRoute.mode,
          yethOnly: yethRoutingConfig.only,
          emittedMessages,
          throttledSuppressed: yethThrottledSummary?.suppressed ?? 0,
        });
      }

      if (!processLegacy) {
        return;
      }

      const cursorBlock = await this._state.storage.get<number>(CURSOR_BLOCK_KEY);

      if (cursorBlock === undefined) {
        const genesisTimestamp = getGenesisTimestamp();
        const startBlock = await findStartBlockByTimestamp(
          rpc,
          confirmedHeadBlock,
          genesisTimestamp,
        );
        const initializedCursorBlock = startBlock - 1;

        await this._state.storage.put(START_BLOCK_KEY, startBlock);
        await this.writeCursor(initializedCursorBlock);

        console.log("Initialized chain cursor", {
          latestHeadBlock,
          confirmedHeadBlock,
          confirmations,
          mode: route.mode,
          genesisTimestamp,
          startBlock,
          cursorBlock: initializedCursorBlock,
          subrequestBudget: budget.snapshot(),
        });
        return;
      }

      const startBlock = await this._state.storage.get<number>(START_BLOCK_KEY);
      const fromBlock = cursorBlock + 1;
      const toBlock = confirmedHeadBlock;

      if (fromBlock > toBlock) {
        console.log("No confirmed blocks to process", {
          latestHeadBlock,
          confirmedHeadBlock,
          confirmations,
          mode: route.mode,
          cursorBlock,
          subrequestBudget: budget.snapshot(),
        });
        return;
      }

      console.log("Processing block range", {
        startBlock,
        fromBlock,
        toBlock,
        latestHeadBlock,
        confirmations,
        mode: route.mode,
        maxSubrequestsPerRun,
        maxMessagesPerRun,
      });

      let processedCursorBlock = cursorBlock;
      let nextFromBlock = fromBlock;
      let chunksProcessed = 0;
      let stoppedEarly = false;
      let stoppedEarlyDueToScanBudgetExhaustion = false;

      while (nextFromBlock <= toBlock && chunksProcessed < MAX_CHUNKS_PER_RUN) {
        const chunkFrom = nextFromBlock;
        const chunkTo = Math.min(chunkFrom + LOG_CHUNK_SIZE - 1, toBlock);
        if (route.chatId !== null) {
          budget.reserveSubrequests(RESERVED_SEND_SUBREQUESTS_PER_CHUNK);
        }

        console.log("Scanning chunk", {
          chunkIndex: chunksProcessed + 1,
          chunkFrom,
          chunkTo,
          subrequestBudget: budget.snapshot(),
        });

        const scanResult = await scanChunkForActionsWithProgress(rpc, chunkFrom, chunkTo, {
          isLogAlreadyProcessed: async (log) => this.hasActionBeenSent(log),
        });
        messageContext.fallbackTimestampSeconds = Math.floor(this._deps.now() / 1000);
        const dispatchResult = await this.dispatchActions(scanResult.actions, {
          dryRun: route.dryRun,
          chatId: route.chatId,
          botToken: route.botToken,
          fromBlock: chunkFrom,
          budget,
          emittedMessagesBefore: emittedMessages,
          maxMessagesPerRun,
          messageContext,
          dailyDigestEnabled: this.isDailyImpactDigestEnabled(),
        });
        budget.clearReservedSubrequests();
        emittedMessages = dispatchResult.emittedMessages;
        if (dispatchResult.lastEmittedTxHash !== null) {
          lastEmittedTxHash = dispatchResult.lastEmittedTxHash;
        }
        if (
          dispatchResult.throttled &&
          dispatchResult.throttledSuppressedCount > 0 &&
          dispatchResult.throttledSuppressedFromBlock !== null &&
          dispatchResult.throttledSuppressedToBlock !== null
        ) {
          throttledSummary = {
            sent: emittedMessages,
            suppressed: dispatchResult.throttledSuppressedCount,
            fromBlock: dispatchResult.throttledSuppressedFromBlock,
            toBlock: dispatchResult.throttledSuppressedToBlock,
            lastSentTxHash: lastEmittedTxHash,
          };
        }

        let chunkCursorCheckpoint = scanResult.chunkComplete
          ? chunkTo
          : scanResult.lastProcessedBlock;
        if (!dispatchResult.completed) {
          chunkCursorCheckpoint = Math.min(
            chunkCursorCheckpoint,
            dispatchResult.lastDispatchedBlock,
          );
        }

        processedCursorBlock = await this.maybePersistChunkCursor(
          processedCursorBlock,
          chunkCursorCheckpoint,
        );

        chunksProcessed += 1;
        await this.pruneSentEntries(Math.floor(this._deps.now() / 1000));

        const chunkComplete = scanResult.chunkComplete && dispatchResult.completed;
        if (!chunkComplete) {
          stoppedEarly = true;
          stoppedEarlyDueToScanBudgetExhaustion = scanResult.budgetExhausted;
          console.log("Stopped chunk early before exhausting runtime budget", {
            chunkFrom,
            chunkTo,
            scanChunkComplete: scanResult.chunkComplete,
            dispatchCompleted: dispatchResult.completed,
            scanBudgetExhausted: scanResult.budgetExhausted,
            dispatchBudgetExhausted: dispatchResult.budgetExhausted,
            dispatchThrottled: dispatchResult.throttled,
            processedActions: dispatchResult.processedActions,
            emittedMessages,
            chunkCursorCheckpoint,
            subrequestBudget: budget.snapshot(),
          });
          break;
        }

        nextFromBlock = chunkTo + 1;
      }

      const throttledSummaryTimestamp =
        throttledSummary === null
          ? Math.floor(this._deps.now() / 1000)
          : (await this.resolveBlockTimestampSeconds(
              rpc,
              throttledSummary.toBlock,
              blockTimestampCache,
            )) ?? Math.floor(this._deps.now() / 1000);
      await this.maybeSendThrottledSummary({
        summary: throttledSummary,
        route: warningRoute,
        timestampSeconds: throttledSummaryTimestamp,
      });
      await this.maybeSendDailyImpactDigest({
        route,
        budget,
        timestampSeconds: Math.floor(this._deps.now() / 1000),
      });

      const scanBudgetNoProgressStall =
        stoppedEarly &&
        stoppedEarlyDueToScanBudgetExhaustion &&
        processedCursorBlock === cursorBlock;
      const scanBudgetNoProgressState = await this.updateScanBudgetNoProgressState({
        triggered: scanBudgetNoProgressStall,
        route: warningRoute,
        cursorBlock,
        fromBlock,
        toBlock,
        maxSubrequestsPerRun,
      });

      console.log("Completed scan pass", {
        startBlock,
        fromBlock,
        processedCursorBlock,
        toBlock,
        chunksProcessed,
        reachedConfirmedHead: processedCursorBlock >= toBlock,
        remainingBlocks: Math.max(0, toBlock - processedCursorBlock),
        mode: route.mode,
        dryRun: route.dryRun,
        maxMessagesPerRun,
        emittedMessages,
        throttledSuppressed: throttledSummary?.suppressed ?? 0,
        maxChunksPerRun: MAX_CHUNKS_PER_RUN,
        logChunkSize: LOG_CHUNK_SIZE,
        stoppedEarly,
        yethMode: yethRoutingConfig.mode,
        yethOnly: yethRoutingConfig.only,
        scanBudgetNoProgressStall,
        scanBudgetNoProgressConsecutiveCount:
          scanBudgetNoProgressState.consecutiveCount,
        scanBudgetNoProgressAlertSent: scanBudgetNoProgressState.alertSent,
        subrequestBudget: budget.snapshot(),
      });
    } catch (error) {
      if (error instanceof SubrequestBudgetExceededError) {
        console.warn("Subrequest budget exhausted before run completion", {
          operation: error.operation,
          budget: budget.snapshot(),
        });
        return;
      }
      throw error;
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      console.log("AlertState health check");
      return new Response("ok", { status: 200 });
    }

    if (request.method === "POST" && url.pathname === "/admin/disable") {
      await this.applyEnabledOverride(false);
      return new Response("disabled", { status: 200 });
    }

    if (request.method === "POST" && url.pathname === "/admin/enable") {
      await this.applyEnabledOverride(true);
      return new Response("enabled", { status: 200 });
    }

    if (request.method === "POST" && url.pathname === "/admin/reset") {
      const result = await this.resetRuntimeState();
      console.log("Reset alerts runtime state", result);
      return new Response("reset", { status: 200 });
    }

    if (url.pathname === "/run") {
      console.log("AlertState run triggered");

      try {
        await this.run();
        return new Response("AlertState run complete", { status: 200 });
      } catch (error) {
        console.error("AlertState run failed", error);
        return new Response("AlertState run failed", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
}
