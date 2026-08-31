import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "@/workers/alerts-bot/src/index";
import { domainConfigs, runtimeConfig, type AlertsEnv } from "@/workers/alerts-bot/src/config";
import {
  ALERT_DOMAIN_GENESIS_BLOCKS,
  ALERT_DOMAIN_OBJECT_NAMES,
  ALERT_DOMAIN_REGISTRATIONS,
} from "@/workers/alerts-bot/src/domain-registry";
import { AlertState } from "@/workers/alerts-bot/src/runtime";
import { sendMessage } from "@/workers/alerts-bot/src/telegram";
import {
  applyYethClaim,
  applyYethSetClaim,
  applyYethShareMintFromClaimStay,
  applyYethTransferLedger,
  buildYethRepaymentMetrics,
  createEmptyYethState,
  serializeYethRepaymentMetrics,
  serializeYethState,
} from "@/workers/alerts-bot/src/domains/yeth/accounting";

class MemoryStorage {
  readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.values.set(key, structuredClone(value));
  }
}

function durableState(storage = new MemoryStorage()): {
  readonly state: DurableObjectState;
  readonly storage: MemoryStorage;
} {
  return {
    state: { storage } as unknown as DurableObjectState,
    storage,
  };
}

function baseEnv(overrides: Partial<AlertsEnv> = {}): AlertsEnv {
  return {
    ALERT_STATE: {} as DurableObjectNamespace,
    RPC_URL: "https://rpc.invalid",
    TELEGRAM_BOT_TOKEN: "bot-token",
    STYFI_TELEGRAM_CHAT_ID: "styfi-chat",
    VEYFI_TELEGRAM_CHAT_ID: "veyfi-chat",
    YETH_TELEGRAM_CHAT_ID: "yeth-chat",
    ADMIN_TOKEN: "admin-token",
    ...overrides,
  };
}

function hashOf(blockNumber: number): string {
  return `0x${blockNumber.toString(16).padStart(64, "0")}`;
}

function rpcFetch(params: {
  readonly latest: number;
  readonly blockHash?: (block: number) => string;
  readonly onMethod?: (method: string) => void;
}): typeof fetch {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body)) as {
      readonly id: number;
      readonly method: string;
      readonly params: readonly unknown[];
    };
    params.onMethod?.(payload.method);
    let result: unknown;
    if (payload.method === "eth_blockNumber") {
      result = `0x${params.latest.toString(16)}`;
    } else if (payload.method === "eth_getLogs") {
      result = [];
    } else if (payload.method === "eth_getBlockByNumber") {
      const block = Number.parseInt(String(payload.params[0]).slice(2), 16);
      result = {
        number: `0x${block.toString(16)}`,
        hash: params.blockHash?.(block) ?? hashOf(block),
        parentHash: hashOf(block - 1),
        timestamp: "0x6b49d200",
      };
    } else {
      throw new Error(`unexpected RPC method: ${payload.method}`);
    }
    return Response.json({ jsonrpc: "2.0", id: payload.id, result });
  }) as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("alerts rebuild registry and configuration", () => {
  it("uses three independent active objects and keeps extension seams disabled", () => {
    expect(ALERT_DOMAIN_OBJECT_NAMES).toEqual({
      styfi: "alerts:styfi:v1",
      veyfi: "alerts:veyfi:v1",
      yeth: "alerts:yeth:v1",
    });
    expect(ALERT_DOMAIN_GENESIS_BLOCKS).toEqual({
      styfi: 24_386_915,
      veyfi: 24_386_915,
      yeth: 24_522_098,
    });
    expect(
      ALERT_DOMAIN_REGISTRATIONS.filter(({ status }) => status === "disabled")
        .map(({ id }) => id),
    ).toEqual(["teams", "ybc", "dao"]);
  });

  it("defaults all domains off and does not couple one missing chat to another", () => {
    expect(domainConfigs(baseEnv()).map(({ enabled }) => enabled)).toEqual([
      false,
      false,
      false,
    ]);
    const configured = domainConfigs(baseEnv({
      ALERTS_STYFI_ENABLED: "true",
      ALERTS_YETH_ENABLED: "true",
      YETH_TELEGRAM_CHAT_ID: undefined,
    }));
    expect(configured).toMatchObject([
      { domainId: "styfi", enabled: true, chatId: "styfi-chat" },
      { domainId: "veyfi", enabled: false },
      { domainId: "yeth", enabled: true, chatId: null },
    ]);
  });

  it("uses paid-plan defaults without a general subrequest governor", () => {
    expect(runtimeConfig(baseEnv())).toMatchObject({
      confirmations: 6,
      maxMessagesPerRun: 5,
      maxRangesPerRun: 6,
      logRangeSize: 10_000,
      yethDailyCheckpointBlocks: 7_200,
      yethDailyMinDeltaWei: 5n * 10n ** 18n,
    });
  });
});

describe("minimal durable runtime", () => {
  it("does no external work for a disabled domain", async () => {
    const { state } = durableState();
    const external = vi.fn();
    vi.stubGlobal("fetch", external);
    const object = new AlertState(state, baseEnv());
    const response = await object.fetch(
      new Request("https://alerts.internal/run?domain=styfi", { method: "POST" }),
    );
    expect(await response.json()).toEqual({ domain: "styfi", outcome: "disabled" });
    expect(external).not.toHaveBeenCalled();
  });

  it("reports caught up from the canonical initial cursor", async () => {
    const { state, storage } = durableState();
    const initialCursor = ALERT_DOMAIN_GENESIS_BLOCKS.styfi - 1;
    vi.stubGlobal("fetch", rpcFetch({ latest: initialCursor + 6 }));
    const object = new AlertState(
      state,
      baseEnv({ ALERTS_STYFI_ENABLED: "true" }),
    );
    const response = await object.fetch(
      new Request("https://alerts.internal/run?domain=styfi", { method: "POST" }),
    );
    expect(await response.json()).toMatchObject({
      domain: "styfi",
      outcome: "caught_up",
      cursorBlock: initialCursor,
    });
    expect(storage.values.get("state:v1")).toMatchObject({
      cursorBlock: initialCursor,
      lastObservedHead: initialCursor,
      lastErrorCode: null,
    });
  });

  it("advances an empty range without loading every block header", async () => {
    const { state, storage } = durableState();
    const genesis = ALERT_DOMAIN_GENESIS_BLOCKS.styfi;
    const methods: string[] = [];
    vi.stubGlobal("fetch", rpcFetch({
      latest: genesis + 14,
      onMethod: (method) => methods.push(method),
    }));
    const object = new AlertState(
      state,
      baseEnv({
        ALERTS_STYFI_ENABLED: "true",
        MAX_RANGES_PER_RUN: "1",
        LOG_RANGE_SIZE: "100",
      }),
    );
    const response = await object.fetch(
      new Request("https://alerts.internal/run?domain=styfi", { method: "POST" }),
    );
    expect(await response.json()).toMatchObject({
      outcome: "caught_up",
      cursorBlock: genesis + 8,
      ranges: 1,
      messagesSent: 0,
    });
    expect(methods.filter((method) => method === "eth_getBlockByNumber")).toHaveLength(1);
    expect(storage.values.get("state:v1")).toMatchObject({
      cursorBlock: genesis + 8,
      cursorHash: hashOf(genesis + 8),
    });
  });

  it("stops when the saved cursor hash is no longer canonical", async () => {
    const { state, storage } = durableState();
    const cursor = ALERT_DOMAIN_GENESIS_BLOCKS.styfi;
    storage.values.set("state:v1", {
      version: 1,
      domainId: "styfi",
      cursorBlock: cursor,
      cursorHash: hashOf(cursor),
      lastObservedHead: cursor,
      lastRunAt: null,
      lastSuccessAt: null,
      lastErrorCode: null,
      telegramRetryAfterUntil: null,
      yethState: null,
      yethMetrics: null,
      yethDailyFlow: null,
    });
    vi.stubGlobal("fetch", rpcFetch({
      latest: cursor + 10,
      blockHash: (block) =>
        block === cursor ? `0x${"f".repeat(64)}` : hashOf(block),
    }));
    const object = new AlertState(
      state,
      baseEnv({ ALERTS_STYFI_ENABLED: "true" }),
    );
    const response = await object.fetch(
      new Request("https://alerts.internal/run?domain=styfi", { method: "POST" }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      outcome: "failed",
      code: "cursor_reorg_detected",
    });
    expect(storage.values.get("state:v1")).toMatchObject({
      cursorBlock: cursor,
      lastErrorCode: "cursor_reorg_detected",
    });
  });

  it("resumes a capped yETH checkpoint from event receipts without advancing early", async () => {
    const { state, storage } = durableState();
    const account = "0x1111111111111111111111111111111111111111";
    const zero = "0x0000000000000000000000000000000000000000";
    const one = 10n ** 18n;
    const yeth = createEmptyYethState();
    applyYethSetClaim(yeth, account, 100n * one);
    applyYethClaim(yeth, account, false, 100n * one);
    applyYethTransferLedger(yeth, zero, account, 100n * one);
    applyYethShareMintFromClaimStay(yeth, account, 100n * one, 100n * one);
    const firstCheckpoint = ALERT_DOMAIN_GENESIS_BLOCKS.yeth - 1 + 7_200;
    const secondCheckpoint = firstCheckpoint + 7_200;
    const previousMetrics = buildYethRepaymentMetrics(
      yeth,
      50n * one,
      50n * one,
    );
    storage.values.set("state:v1", {
      version: 1,
      domainId: "yeth",
      cursorBlock: firstCheckpoint,
      cursorHash: hashOf(firstCheckpoint),
      lastObservedHead: firstCheckpoint,
      lastRunAt: null,
      lastSuccessAt: null,
      lastErrorCode: null,
      telegramRetryAfterUntil: null,
      yethState: serializeYethState(yeth),
      yethMetrics: serializeYethRepaymentMetrics(previousMetrics),
      yethDailyFlow: { recoveryNetFlowEth: "0", yieldNetFlowEth: "0" },
    });
    const rpcMethods: string[] = [];
    const telegramMessages: Array<{ text: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://api.telegram.org/")) {
        telegramMessages.push(JSON.parse(String(init?.body)) as { text: string });
        return Response.json({ ok: true });
      }
      const payload = JSON.parse(String(init?.body)) as
        | Array<{ id: number; method: string }>
        | { id: number; method: string; params: readonly unknown[] };
      if (Array.isArray(payload)) {
        payload.forEach(({ method }) => rpcMethods.push(method));
        return Response.json(payload.map(({ id }) => ({
          jsonrpc: "2.0",
          id,
          result: `0x${(60n * one)
            .toString(16)
            .padStart(64, "0")}`,
        })));
      }
      rpcMethods.push(payload.method);
      if (payload.method === "eth_blockNumber") {
        return Response.json({
          jsonrpc: "2.0",
          id: payload.id,
          result: `0x${(secondCheckpoint + 6).toString(16)}`,
        });
      }
      if (payload.method === "eth_getLogs") {
        return Response.json({ jsonrpc: "2.0", id: payload.id, result: [] });
      }
      if (payload.method === "eth_getBlockByNumber") {
        const block = Number.parseInt(String(payload.params[0]).slice(2), 16);
        return Response.json({
          jsonrpc: "2.0",
          id: payload.id,
          result: {
            number: `0x${block.toString(16)}`,
            hash: hashOf(block),
            parentHash: hashOf(block - 1),
            timestamp: "0x6b49d200",
          },
        });
      }
      throw new Error(`unexpected RPC method: ${payload.method}`);
    }));
    const object = new AlertState(
      state,
      baseEnv({
        ALERTS_YETH_ENABLED: "true",
        MAX_RANGES_PER_RUN: "1",
        MAX_MESSAGES_PER_RUN: "1",
        LOG_RANGE_SIZE: "10000",
        YETH_DAILY_MIN_DELTA_ETH: "5",
      }),
    );
    const response = await object.fetch(
      new Request("https://alerts.internal/run?domain=yeth", { method: "POST" }),
    );
    expect(await response.json()).toMatchObject({
      outcome: "message_cap",
      cursorBlock: firstCheckpoint,
      messagesSent: 1,
    });
    expect(telegramMessages).toHaveLength(1);
    expect(telegramMessages[0]!.text).toContain("yETH recovery progress");
    expect(telegramMessages[0]!.text).toContain("narrowed by 10.00 ETH");
    expect(storage.values.get("state:v1")).toMatchObject({
      cursorBlock: firstCheckpoint,
      lastErrorCode: "message_cap_reached",
    });

    const resumed = await object.fetch(
      new Request("https://alerts.internal/run?domain=yeth", { method: "POST" }),
    );
    expect(await resumed.json()).toMatchObject({
      outcome: "caught_up",
      cursorBlock: secondCheckpoint,
      messagesSent: 1,
    });
    expect(telegramMessages).toHaveLength(2);
    expect(telegramMessages[1]!.text).toContain("yETH yield capacity increased");
    expect(rpcMethods.filter((method) => method === "eth_getBlockByNumber").length)
      .toBeLessThan(20);
    expect(storage.values.get("state:v1")).toMatchObject({
      cursorBlock: secondCheckpoint,
      yethDailyFlow: { recoveryNetFlowEth: "0", yieldNetFlowEth: "0" },
    });
  });
});

describe("worker routing and Telegram backoff", () => {
  it("fans the cron out to exactly the three configured object names", async () => {
    const names: string[] = [];
    const namespace = {
      idFromName(name: string) {
        names.push(name);
        return name;
      },
      get() {
        return { fetch: async () => Response.json({ outcome: "caught_up" }) };
      },
    } as unknown as DurableObjectNamespace;
    let pending: Promise<unknown> | null = null;
    worker.scheduled(
      {} as ScheduledController,
      baseEnv({
        ALERT_STATE: namespace,
        ALERTS_STYFI_ENABLED: "true",
        ALERTS_VEYFI_ENABLED: "true",
        ALERTS_YETH_ENABLED: "true",
      }),
      { waitUntil(value) { pending = value; } },
    );
    await pending;
    expect(names).toEqual([
      "alerts:styfi:v1",
      "alerts:veyfi:v1",
      "alerts:yeth:v1",
    ]);
  });

  it("requires the bearer token before reading status objects", async () => {
    const response = await worker.fetch(
      new Request("https://alerts.example/status"),
      baseEnv(),
    );
    expect(response.status).toBe(401);
  });

  it("surfaces Telegram retry_after as a typed backoff", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json(
        { ok: false, parameters: { retry_after: 42 } },
        { status: 429 },
      ),
    ));
    await expect(sendMessage("chat", "<b>test</b>", "token")).rejects.toEqual(
      expect.objectContaining({ retryAfterSeconds: 42 }),
    );
  });
});
