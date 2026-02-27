import { describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  type Address,
  type Hex,
} from "viem";
import deployment from "@/lib/deployment.json";
import worker, { AlertState } from "@/workers/alerts-bot/src/index";
import {
  ERC4626_DEPOSIT_ABI,
  LEGACY_VEYFI_LOCKED_ABI,
  LEGACY_VEYFI_MODIFY_LOCK_ABI,
  LEGACY_VEYFI_PENALTY_ABI,
  LIQUID_LOCKER_REDEEM_ABI,
} from "@/workers/alerts-bot/src/abis";
import { LIQUID_LOCKER_REDEMPTION, STYFI, VEYFI } from "@/workers/alerts-bot/src/contracts";
import type {
  RpcClient,
  RpcLog,
  RpcTransaction,
  RpcTransactionReceipt,
} from "@/workers/alerts-bot/src/rpc";

const ONE = 10n ** 18n;
const SENT_KEY_PREFIX = "sent:";
const SENT_LAST_PRUNE_KEY = "sentMeta:lastPruneTs";
const SENT_MAX_KEYS = 5_000;
const SENT_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY =
  "runMeta:scanBudgetNoProgressCount";

class MemoryStorage {
  private readonly data = new Map<string, unknown>();

  constructor(initialEntries: Array<[string, unknown]> = []) {
    for (const [key, value] of initialEntries) {
      this.data.set(key, value);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async list<T>(options?: { prefix?: string }): Promise<Map<string, T>> {
    const prefix = options?.prefix;
    const entries = new Map<string, T>();
    for (const [key, value] of this.data.entries()) {
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }
      entries.set(key, value as T);
    }
    return entries;
  }
}

function createMockState(initialEntries: Array<[string, unknown]> = []): {
  state: DurableObjectState;
  storage: MemoryStorage;
} {
  const storage = new MemoryStorage(initialEntries);
  const state = { storage } as unknown as DurableObjectState;
  return { state, storage };
}

function hashOf(index: number): Hex {
  return `0x${index.toString(16).padStart(64, "0")}`;
}

function addressOf(index: number): Address {
  return `0x${index.toString(16).padStart(40, "0")}` as Address;
}

function createDepositLog(params: {
  blockNumber: number;
  logIndex: number;
  txHash: Hex;
  owner?: Address;
}): RpcLog {
  const owner = params.owner ?? addressOf(1);
  return {
    address: STYFI,
    topics: encodeEventTopics({
      abi: ERC4626_DEPOSIT_ABI,
      eventName: "Deposit",
      args: {
        sender: owner,
        owner,
      },
    }) as Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [ONE, ONE],
    ),
    blockNumber: params.blockNumber,
    transactionHash: params.txHash,
    logIndex: params.logIndex,
    removed: false,
  };
}

function createPenaltyLog(params: {
  blockNumber: number;
  logIndex: number;
  txHash: Hex;
}): RpcLog {
  return {
    address: VEYFI,
    topics: encodeEventTopics({
      abi: LEGACY_VEYFI_PENALTY_ABI,
      eventName: "Penalty",
      args: {
        sender: addressOf(9),
        receiver: addressOf(10),
      },
    }) as Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [ONE / 2n]),
    blockNumber: params.blockNumber,
    transactionHash: params.txHash,
    logIndex: params.logIndex,
    removed: false,
  };
}

function createUnknownRedeemLog(params: {
  blockNumber: number;
  logIndex: number;
  txHash: Hex;
}): RpcLog {
  return {
    address: LIQUID_LOCKER_REDEMPTION,
    topics: encodeEventTopics({
      abi: LIQUID_LOCKER_REDEEM_ABI,
      eventName: "Redeem",
      args: {
        token: addressOf(999),
      },
    }) as Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [3n * ONE, 0n],
    ),
    blockNumber: params.blockNumber,
    transactionHash: params.txHash,
    logIndex: params.logIndex,
    removed: false,
  };
}

function createModifyLockLog(params: {
  blockNumber: number;
  logIndex: number;
  txHash: Hex;
  user?: Address;
}): RpcLog {
  const user = params.user ?? addressOf(88);
  return {
    address: VEYFI,
    topics: encodeEventTopics({
      abi: LEGACY_VEYFI_MODIFY_LOCK_ABI,
      eventName: "ModifyLock",
      args: {
        sender: user,
        user,
      },
    }) as Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [2n * ONE, 2_000_000n, 1_900_000n],
    ),
    blockNumber: params.blockNumber,
    transactionHash: params.txHash,
    logIndex: params.logIndex,
    removed: false,
  };
}

interface MockRpcOverrides {
  getBlockNumber?: RpcClient["getBlockNumber"];
  getBlockByNumber?: RpcClient["getBlockByNumber"];
  getLogs?: RpcClient["getLogs"];
  getTransactionByHash?: (
    hashOrHashes: string | string[],
  ) => Promise<RpcTransaction | null | Array<RpcTransaction | null>>;
  getTransactionReceipt?: (
    hashOrHashes: string | string[],
  ) => Promise<RpcTransactionReceipt | null | Array<RpcTransactionReceipt | null>>;
  call?: RpcClient["call"];
}

function createMockRpc(overrides: MockRpcOverrides): RpcClient {
  const notImplemented = async (): Promise<never> => {
    throw new Error("RPC method not implemented for test");
  };

  const getTransactionByHashRaw =
    overrides.getTransactionByHash ??
    (async (hashOrHashes: string | string[]) =>
      Array.isArray(hashOrHashes) ? hashOrHashes.map(() => null) : null);

  const getTransactionReceiptRaw =
    overrides.getTransactionReceipt ??
    (async (hashOrHashes: string | string[]) =>
      Array.isArray(hashOrHashes) ? hashOrHashes.map(() => null) : null);

  async function getTransactionByHash(
    hash: string,
  ): Promise<RpcTransaction | null>;
  async function getTransactionByHash(
    hashes: string[],
  ): Promise<Array<RpcTransaction | null>>;
  async function getTransactionByHash(
    hashOrHashes: string | string[],
  ): Promise<RpcTransaction | null | Array<RpcTransaction | null>> {
    return getTransactionByHashRaw(hashOrHashes);
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
    return getTransactionReceiptRaw(hashOrHashes);
  }

  return {
    getBlockNumber: overrides.getBlockNumber ?? notImplemented,
    getBlockByNumber: overrides.getBlockByNumber ?? notImplemented,
    getLogs: overrides.getLogs ?? notImplemented,
    getTransactionByHash,
    getTransactionReceipt,
    call: overrides.call ?? notImplemented,
  } as RpcClient;
}

function createFetchRequest(pathname: string, options?: RequestInit): Request {
  return new Request(`https://alerts-bot.example${pathname}`, options);
}

describe("alerts-bot handler wiring", () => {
  function createHttpEnv(overrides?: Record<string, string>): {
    env: Record<string, unknown>;
    doFetch: ReturnType<typeof vi.fn>;
  } {
    const doFetch = vi.fn(async () => new Response("ok", { status: 200 }));
    const env = {
      ALERT_STATE: {
        idFromName: vi.fn(() => ({ toString: () => "singleton-id" })),
        get: vi.fn(() => ({
          fetch: doFetch,
        })),
      },
      RPC_URL: "https://rpc.example",
      ...overrides,
    };
    return { env, doFetch };
  }

  it("keeps /health public", async () => {
    const { env } = createHttpEnv();
    const response = await worker.fetch(
      createFetchRequest("/health", { method: "GET" }),
      env as never,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("forbids POST /run when manual runs are disabled", async () => {
    const { env, doFetch } = createHttpEnv({
      MANUAL_RUN_ENABLED: "false",
      MANUAL_RUN_TOKEN: "secret-token",
    });

    const response = await worker.fetch(
      createFetchRequest("/run", { method: "POST" }),
      env as never,
    );

    expect(response.status).toBe(403);
    expect(doFetch).not.toHaveBeenCalled();
  });

  it("requires a valid bearer token on POST /run when enabled", async () => {
    const { env, doFetch } = createHttpEnv({
      MANUAL_RUN_ENABLED: "true",
      MANUAL_RUN_TOKEN: "secret-token",
    });

    const forbidden = await worker.fetch(
      createFetchRequest("/run", { method: "POST" }),
      env as never,
    );
    expect(forbidden.status).toBe(403);

    const allowed = await worker.fetch(
      createFetchRequest("/run", {
        method: "POST",
        headers: {
          authorization: "Bearer secret-token",
        },
      }),
      env as never,
    );

    expect(allowed.status).toBe(200);
    expect(doFetch).toHaveBeenCalledTimes(1);
  });

  it("scheduled handler still triggers runs without manual HTTP auth", async () => {
    const { env, doFetch } = createHttpEnv({
      MANUAL_RUN_ENABLED: "false",
    });

    await worker.scheduled({} as ScheduledController, env as never);

    expect(doFetch).toHaveBeenCalledTimes(1);
  });

  it("requires ADMIN_TOKEN and forwards authorized admin requests", async () => {
    const { env, doFetch } = createHttpEnv({
      ADMIN_TOKEN: "admin-token",
    });

    const forbidden = await worker.fetch(
      createFetchRequest("/admin/disable", { method: "POST" }),
      env as never,
    );
    expect(forbidden.status).toBe(403);
    expect(doFetch).toHaveBeenCalledTimes(0);

    const allowed = await worker.fetch(
      createFetchRequest("/admin/reset", {
        method: "POST",
        headers: {
          authorization: "Bearer admin-token",
        },
      }),
      env as never,
    );
    expect(allowed.status).toBe(200);
    expect(doFetch).toHaveBeenCalledTimes(1);
    expect(doFetch).toHaveBeenCalledWith("https://do/admin/reset", {
      method: "POST",
    });
  });
});

describe("alerts-bot Durable Object runtime state", () => {
  it("bootstraps cursor from deployment GENESIS on first run", async () => {
    const { state, storage } = createMockState();
    const rpc = createMockRpc({
      getBlockNumber: async () => 20,
      getBlockByNumber: async (blockNumber) => ({
        number: typeof blockNumber === "number" ? blockNumber : 20,
        hash: "0x1",
        parentHash: "0x0",
        timestamp: deployment.GENESIS - 50 + (blockNumber as number) * 5,
      }),
      getLogs: async () => [],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);

    expect(await storage.get<number>("startBlock")).toBe(10);
    expect(await storage.get<number>("cursorBlock")).toBe(9);
  });

  it("buckets daily impact stats by event block UTC date instead of send time", async () => {
    const txHash = hashOf(370);
    const eventBlockTimestamp = 1_700_000_000;
    const nowSeconds = 1_800_000_000;
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const getBlockByNumber = vi.fn(async () => ({
      number: 1,
      hash: "0x1",
      parentHash: "0x0",
      timestamp: eventBlockTimestamp,
    }));
    const rpc = createMockRpc({
      getBlockNumber: async () => 1,
      getBlockByNumber,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash,
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        DAILY_IMPACT_DIGEST_ENABLED: "true",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => nowSeconds * 1000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(getBlockByNumber).toHaveBeenCalledWith(1);

    const eventDateKey = new Date(eventBlockTimestamp * 1_000)
      .toISOString()
      .slice(0, 10);
    const sendDateKey = new Date(nowSeconds * 1_000).toISOString().slice(0, 10);

    const stats = await storage.get<{
      total: number;
      counts: Record<string, number>;
      largestTxHash: string | null;
    }>(`runMeta:dailyImpact:${eventDateKey}`);
    expect(stats).toMatchObject({
      total: 1,
      largestTxHash: txHash,
      counts: { fish: 1 },
    });
    expect(await storage.get(`runMeta:dailyImpact:${sendDateKey}`)).toBeUndefined();
  });

  it("exits quickly when ENABLED=false without scanning RPC or sending Telegram", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const getBlockNumber = vi.fn(async () => 20);
    const rpc = createMockRpc({
      getBlockNumber,
      getLogs: async () => [],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        ENABLED: "false",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(getBlockNumber).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("treats invalid ENABLED value as disabled (fail-safe)", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const getBlockNumber = vi.fn(async () => 20);
    const rpc = createMockRpc({
      getBlockNumber,
      getLogs: async () => [],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        ENABLED: "oops",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(getBlockNumber).not.toHaveBeenCalled();
  });

  it("routes DRY_RUN=true alerts to TEST_TO_CHAT_ID only when configured", async () => {
    const txHash = hashOf(350);
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 1,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash,
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        TEST_TO_CHAT_ID: "test-chat",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      "test-chat",
      expect.stringContaining("stYFI Staked"),
      "bot-token",
    );
  });

  it("uses log-only dry-run mode when TEST_TO_CHAT_ID is unset", async () => {
    const txHash = hashOf(351);
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 1,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash,
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(0);
    expect(await storage.get<number>(`${SENT_KEY_PREFIX}${txHash}:0`)).toBe(
      1_800_000_000,
    );
  });

  it("routes DRY_RUN=false alerts to TELEGRAM_CHAT_ID even when TEST_TO_CHAT_ID is set", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 1,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: hashOf(352),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        TEST_TO_CHAT_ID: "test-chat",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      "prod-chat",
      expect.any(String),
      "bot-token",
    );
  });

  it("treats invalid DRY_RUN value as true (fail-safe)", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 1,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: hashOf(353),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "not-a-bool",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        TEST_TO_CHAT_ID: "test-chat",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith("test-chat", expect.any(String), "bot-token");
  });

  it("checkpoints completed chunks before a later chunk fails", async () => {
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);

    const firstChunkLog = createDepositLog({
      blockNumber: 100,
      logIndex: 0,
      txHash: hashOf(1),
    });
    const secondChunkLog = createDepositLog({
      blockNumber: 3_000,
      logIndex: 0,
      txHash: hashOf(2),
    });

    const rpc = createMockRpc({
      getBlockNumber: async () => 4_000,
      getLogs: async (filter) => {
        if (filter.fromBlock === 1 && filter.toBlock === 2_000) {
          return [firstChunkLog];
        }
        if (filter.fromBlock === 2_001 && filter.toBlock === 4_000) {
          return [secondChunkLog];
        }
        return [];
      },
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("forced telegram failure"));

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "chat-id",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(500);

    expect(await storage.get<number>("cursorBlock")).toBe(2_000);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("keeps unknown null-render actions retryable but persists intentional penalty skips", async () => {
    const txUnknown = hashOf(100);
    const txPenalty = hashOf(101);
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);

    const rpc = createMockRpc({
      getBlockNumber: async () => 2,
      getLogs: async () => [
        createUnknownRedeemLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: txUnknown,
        }),
        createPenaltyLog({
          blockNumber: 2,
          logIndex: 0,
          txHash: txPenalty,
        }),
      ],
      getTransactionByHash: async (hashOrHashes) => {
        const toTx = (hash: string) => ({
          hash,
          from: addressOf(77),
          to: null,
          blockHash: null,
          blockNumber: 1,
          nonce: 0,
          transactionIndex: 0,
          value: "0x0",
          input: "0x",
        });

        if (typeof hashOrHashes === "string") {
          return toTx(hashOrHashes);
        }
        return hashOrHashes.map((hash) => toTx(hash));
      },
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);

    expect(await storage.get<number>(`${SENT_KEY_PREFIX}${txUnknown}:0`)).toBeUndefined();
    expect(await storage.get<number>(`${SENT_KEY_PREFIX}${txPenalty}:0`)).toBe(
      1_800_000_000,
    );
  });

  it("stops early under the subrequest budget and checkpoints partial progress", async () => {
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);

    const rpc = createMockRpc({
      getBlockNumber: async () => 20,
      getLogs: async () => [
        createModifyLockLog({
          blockNumber: 10,
          logIndex: 0,
          txHash: hashOf(200),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
        MAX_SUBREQUESTS_PER_RUN: "2",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(await storage.get<number>("cursorBlock")).toBe(9);
  });

  it("sends a single throttling summary in prod mode when MAX_MESSAGES_PER_RUN is exceeded", async () => {
    const firstTx = hashOf(360);
    const secondTx = hashOf(361);
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 2,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: firstTx,
        }),
        createDepositLog({
          blockNumber: 2,
          logIndex: 0,
          txHash: secondTx,
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        MAX_MESSAGES_PER_RUN: "1",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[0]?.[0]).toBe("prod-chat");
    expect(sendMessage.mock.calls[1]?.[0]).toBe("prod-chat");
    expect(sendMessage.mock.calls[1]?.[1]).toContain("⚠️ Alerts Throttled");
    expect(sendMessage.mock.calls[1]?.[1]).toContain("Sent: <b>1</b>");
    expect(sendMessage.mock.calls[1]?.[1]).toContain("Deferred: <b>1</b>");
    expect(sendMessage.mock.calls[1]?.[1]).toContain("Blocks: <b>2-2</b>");
    expect(sendMessage.mock.calls[1]?.[1]).toContain(
      `Last tx: <a href="https://etherscan.io/tx/${firstTx}">`,
    );
    expect(await storage.get<number>("cursorBlock")).toBe(1);
  });

  it("sends throttling summary to test chat in DRY_RUN=true test mode", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 2,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: hashOf(362),
        }),
        createDepositLog({
          blockNumber: 2,
          logIndex: 0,
          txHash: hashOf(363),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TEST_TO_CHAT_ID: "test-chat",
        MAX_MESSAGES_PER_RUN: "1",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[0]?.[0]).toBe("test-chat");
    expect(sendMessage.mock.calls[1]?.[0]).toBe("test-chat");
    expect(sendMessage.mock.calls[1]?.[1]).toContain("⚠️ Alerts Throttled");
  });

  it("routes throttling summary to ADMIN_CHAT_ID in prod while keeping regular alerts on TELEGRAM_CHAT_ID", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 2,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: hashOf(370),
        }),
        createDepositLog({
          blockNumber: 2,
          logIndex: 0,
          txHash: hashOf(371),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        ADMIN_CHAT_ID: "admin-chat",
        MAX_MESSAGES_PER_RUN: "1",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[0]?.[0]).toBe("prod-chat");
    expect(sendMessage.mock.calls[1]?.[0]).toBe("admin-chat");
    expect(sendMessage.mock.calls[1]?.[1]).toContain("⚠️ Alerts Throttled");
  });

  it("does not fail the run when throttling summary delivery fails", async () => {
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 2,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: hashOf(368),
        }),
        createDepositLog({
          blockNumber: 2,
          logIndex: 0,
          txHash: hashOf(369),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Telegram sendMessage failed: Too Many Requests"));

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        MAX_MESSAGES_PER_RUN: "1",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(await storage.get<number>("cursorBlock")).toBe(1);
  });

  it("still sends throttling summary when MAX_SUBREQUESTS_PER_RUN is exhausted", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 2,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: hashOf(366),
        }),
        createDepositLog({
          blockNumber: 2,
          logIndex: 0,
          txHash: hashOf(367),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        MAX_MESSAGES_PER_RUN: "1",
        MAX_SUBREQUESTS_PER_RUN: "3",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[1]?.[1]).toContain("⚠️ Alerts Throttled");
  });

  it("logs throttling summary instead of sending when dry-run has no active chat", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 2,
      getLogs: async () => [
        createDepositLog({
          blockNumber: 1,
          logIndex: 0,
          txHash: hashOf(364),
        }),
        createDepositLog({
          blockNumber: 2,
          logIndex: 0,
          txHash: hashOf(365),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
        MAX_MESSAGES_PER_RUN: "1",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    try {
      const response = await object.fetch(new Request("https://do/run"));
      expect(response.status).toBe(200);
      expect(sendMessage).toHaveBeenCalledTimes(0);
      const loggedSummary = logSpy.mock.calls.some(
        ([tag, payload]) =>
          tag === "[dry-run] telegram_html" &&
          typeof payload === "string" &&
          payload.includes("⚠️ Alerts Throttled"),
      );
      expect(loggedSummary).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("tracks repeated scan-budget stalls and alerts the same Telegram channel", async () => {
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 9],
    ]);

    const rpc = createMockRpc({
      getBlockNumber: async () => 20,
      getLogs: async () => [
        createModifyLockLog({
          blockNumber: 10,
          logIndex: 0,
          txHash: hashOf(210),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () =>
        encodeFunctionResult({
          abi: LEGACY_VEYFI_LOCKED_ABI,
          functionName: "locked",
          result: [0n, 0n],
        }),
    });

    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "chat-id",
        MAX_SUBREQUESTS_PER_RUN: "3",
        BUDGET_STALL_ALERT_THRESHOLD: "2",
        BUDGET_STALL_ALERT_COOLDOWN_SECONDS: "3600",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const firstRun = await object.fetch(new Request("https://do/run"));
    expect(firstRun.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(0);

    const secondRun = await object.fetch(new Request("https://do/run"));
    expect(secondRun.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      "chat-id",
      expect.stringContaining("Alerts Bot Scan Budget Stall"),
      "bot-token",
    );

    const thirdRun = await object.fetch(new Request("https://do/run"));
    expect(thirdRun.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(
      await storage.get<number>(RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY),
    ).toBe(3);
  });

  it("routes scan-budget stall alerts to ADMIN_CHAT_ID in prod", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 9],
    ]);

    const rpc = createMockRpc({
      getBlockNumber: async () => 20,
      getLogs: async () => [
        createModifyLockLog({
          blockNumber: 10,
          logIndex: 0,
          txHash: hashOf(211),
        }),
      ],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () =>
        encodeFunctionResult({
          abi: LEGACY_VEYFI_LOCKED_ABI,
          functionName: "locked",
          result: [0n, 0n],
        }),
    });

    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
        ADMIN_CHAT_ID: "admin-chat",
        MAX_SUBREQUESTS_PER_RUN: "3",
        BUDGET_STALL_ALERT_THRESHOLD: "2",
        BUDGET_STALL_ALERT_COOLDOWN_SECONDS: "3600",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const firstRun = await object.fetch(new Request("https://do/run"));
    expect(firstRun.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(0);

    const secondRun = await object.fetch(new Request("https://do/run"));
    expect(secondRun.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      "admin-chat",
      expect.stringContaining("Alerts Bot Scan Budget Stall"),
      "bot-token",
    );
  });

  it("avoids same-block replay stalls by skipping already-sent logs before decode", async () => {
    const { state, storage } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);

    const firstLog = createModifyLockLog({
      blockNumber: 1,
      logIndex: 0,
      txHash: hashOf(300),
      user: addressOf(300),
    });
    const secondLog = createModifyLockLog({
      blockNumber: 1,
      logIndex: 1,
      txHash: hashOf(301),
      user: addressOf(301),
    });

    const rpc = createMockRpc({
      getBlockNumber: async () => 1,
      getLogs: async () => [firstLog, secondLog],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () =>
        encodeFunctionResult({
          abi: LEGACY_VEYFI_LOCKED_ABI,
          functionName: "locked",
          result: [0n, 0n],
        }),
    });

    const sendMessage = vi
      .fn<(_chatId: string, _html: string, _token: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "chat-id",
        MAX_SUBREQUESTS_PER_RUN: "4",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage,
        now: () => 1_800_000_000_000,
      },
    );

    const firstRun = await object.fetch(new Request("https://do/run"));
    expect(firstRun.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(await storage.get<number>("cursorBlock")).toBe(0);

    const secondRun = await object.fetch(new Request("https://do/run"));
    expect(secondRun.status).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(await storage.get<number>("cursorBlock")).toBe(1);
  });

  it("supports admin disable/enable overrides in durable object state", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const getBlockNumber = vi.fn(async () => 0);
    const rpc = createMockRpc({
      getBlockNumber,
      getLogs: async () => [],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        ENABLED: "true",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => 1_800_000_000_000,
      },
    );

    const disableResponse = await object.fetch(
      new Request("https://do/admin/disable", { method: "POST" }),
    );
    expect(disableResponse.status).toBe(200);

    const disabledRun = await object.fetch(new Request("https://do/run"));
    expect(disabledRun.status).toBe(200);
    expect(getBlockNumber).toHaveBeenCalledTimes(0);

    const enableResponse = await object.fetch(
      new Request("https://do/admin/enable", { method: "POST" }),
    );
    expect(enableResponse.status).toBe(200);

    const enabledRun = await object.fetch(new Request("https://do/run"));
    expect(enabledRun.status).toBe(200);
    expect(getBlockNumber).toHaveBeenCalledTimes(1);
  });

  it("keeps bot disabled when ENABLED=false even after /admin/enable", async () => {
    const { state } = createMockState([
      ["startBlock", 1],
      ["cursorBlock", 0],
    ]);
    const getBlockNumber = vi.fn(async () => 1);
    const rpc = createMockRpc({
      getBlockNumber,
      getLogs: async () => [],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        ENABLED: "false",
        DRY_RUN: "false",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "prod-chat",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => 1_800_000_000_000,
      },
    );

    const enableResponse = await object.fetch(
      new Request("https://do/admin/enable", { method: "POST" }),
    );
    expect(enableResponse.status).toBe(200);

    const runResponse = await object.fetch(new Request("https://do/run"));
    expect(runResponse.status).toBe(200);
    expect(getBlockNumber).toHaveBeenCalledTimes(0);
  });

  it("resets cursor and dedupe keys via /admin/reset", async () => {
    const { state, storage } = createMockState([
      ["startBlock", 123],
      ["cursorBlock", 122],
      [`${SENT_KEY_PREFIX}a:0`, 1_700_000_000],
      [`${SENT_KEY_PREFIX}b:1`, 1_700_000_001],
      ["runMeta:scanBudgetNoProgressCount", 5],
      ["runMeta:scanBudgetNoProgressLastAlertTs", 1_700_000_100],
    ]);
    const rpc = createMockRpc({
      getBlockNumber: async () => 0,
      getLogs: async () => [],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });
    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => 1_800_000_000_000,
      },
    );

    const response = await object.fetch(
      new Request("https://do/admin/reset", { method: "POST" }),
    );
    expect(response.status).toBe(200);
    expect(await storage.get<number>("startBlock")).toBeUndefined();
    expect(await storage.get<number>("cursorBlock")).toBeUndefined();
    expect(await storage.get<number>(`${SENT_KEY_PREFIX}a:0`)).toBeUndefined();
    expect(await storage.get<number>(`${SENT_KEY_PREFIX}b:1`)).toBeUndefined();
    expect(await storage.get<number>(RUN_META_SCAN_BUDGET_NO_PROGRESS_COUNT_KEY)).toBeUndefined();
  });

  it("prunes old dedupe keys and enforces max dedupe cardinality", async () => {
    const nowSeconds = 1_800_000_000;
    const entries: Array<[string, unknown]> = [
      ["startBlock", 1],
      ["cursorBlock", 0],
      [SENT_LAST_PRUNE_KEY, nowSeconds],
      [`${SENT_KEY_PREFIX}stale`, nowSeconds - SENT_RETENTION_SECONDS - 1],
      [`${SENT_KEY_PREFIX}fresh`, nowSeconds - 60],
    ];

    for (let index = 0; index < SENT_MAX_KEYS + 1; index += 1) {
      entries.push([`${SENT_KEY_PREFIX}overflow-${index}`, nowSeconds - 1_000 - index]);
    }

    const { state, storage } = createMockState(entries);
    const rpc = createMockRpc({
      getBlockNumber: async () => 1,
      getLogs: async () => [],
      getTransactionByHash: async () => null,
      getTransactionReceipt: async () => null,
      call: async () => "0x",
    });

    const object = new AlertState(
      state,
      {
        ALERT_STATE: {} as DurableObjectNamespace,
        RPC_URL: "https://rpc.example",
        CONFIRMATIONS: "0",
        DRY_RUN: "true",
      } as never,
      {
        createRpcClient: () => rpc,
        sendMessage: vi.fn(async () => undefined),
        now: () => nowSeconds * 1000,
      },
    );

    const response = await object.fetch(new Request("https://do/run"));
    expect(response.status).toBe(200);

    const sentEntries = await storage.list<number>({ prefix: SENT_KEY_PREFIX });
    expect(sentEntries.size).toBe(SENT_MAX_KEYS);
    expect(sentEntries.has(`${SENT_KEY_PREFIX}stale`)).toBe(false);
    expect(sentEntries.has(`${SENT_KEY_PREFIX}fresh`)).toBe(true);
  });
});
