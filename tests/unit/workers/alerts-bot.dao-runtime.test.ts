import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertState } from "@/workers/alerts-bot/src/runtime";
import { createRpcClient } from "@/workers/alerts-bot/src/rpc";
import { sendMessage, TelegramRateLimitError } from "@/workers/alerts-bot/src/telegram";
import { DAO_DEPLOYMENT_BLOCK as G, DAO_EVENTS } from "@/workers/alerts-bot/src/domains/dao/contracts";
import type { AlertsEnv } from "@/workers/alerts-bot/src/config";
import { ACCOUNT, daoLog, daoRpc, hash, trackedState, voteStart } from "./alerts-bot.dao-fixtures";

vi.mock("@/workers/alerts-bot/src/rpc", async importOriginal => ({ ...await importOriginal<typeof import("@/workers/alerts-bot/src/rpc")>(), createRpcClient: vi.fn() }));
vi.mock("@/workers/alerts-bot/src/telegram", async importOriginal => ({ ...await importOriginal<typeof import("@/workers/alerts-bot/src/telegram")>(), sendMessage: vi.fn() }));

class MemoryStorage {
  values = new Map<string, unknown>();
  get = vi.fn(async <T>(key: string): Promise<T | undefined> => structuredClone(this.values.get(key)) as T | undefined);
  put = vi.fn(async (key: string, value: unknown) => { this.values.set(key, structuredClone(value)); });
}

function setup(overrides: Partial<AlertsEnv> = {}, storage = new MemoryStorage()) {
  const env = {
    ALERT_STATE: {} as DurableObjectNamespace, RPC_URL: "https://rpc.invalid", TELEGRAM_BOT_TOKEN: "test-token",
    DAO_TELEGRAM_CHAT_ID: "dao-test-chat", ALERTS_DAO_ENABLED: "true", MAX_MESSAGES_PER_RUN: "1", ...overrides,
  };
  const object = new AlertState({ storage } as unknown as DurableObjectState, env);
  return { object, storage, run: () => object.fetch(new Request("https://alerts.internal/run?domain=dao", { method: "POST" })) };
}

beforeEach(() => { vi.mocked(sendMessage).mockReset().mockResolvedValue(undefined); vi.mocked(createRpcClient).mockReset(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("DAO durable delivery", () => {
  it("does no RPC or Telegram work while disabled or missing a destination", async () => {
    expect(await (await setup({ ALERTS_DAO_ENABLED: "false" }).run()).json()).toMatchObject({ outcome: "disabled" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await (await setup({ DAO_TELEGRAM_CHAT_ID: undefined }).run()).json()).toMatchObject({ code: "config_dao_chat_missing" });
    expect(createRpcClient).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("resumes a capped block in a fresh object without duplicating accepted messages", async () => {
    const { rpc } = daoRpc({ logs: [daoLog(DAO_EVENTS, "SetOperator", { operator: ACCOUNT }), daoLog(DAO_EVENTS, "SetThreshold", { threshold: 6_000n }, G, 1)] });
    vi.mocked(createRpcClient).mockReturnValue(rpc);
    const first = setup();
    expect(await (await first.run()).json()).toMatchObject({ outcome: "message_cap", cursorBlock: G - 1, messagesSent: 1 });
    const retry = setup({}, first.storage);
    expect(await (await retry.run()).json()).toMatchObject({ outcome: "caught_up", cursorBlock: G, messagesSent: 1 });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendMessage).mock.calls[0]![1]).toContain("operator changed");
    expect(vi.mocked(sendMessage).mock.calls[1]![1]).toContain("Approval threshold changed");
    await retry.run();
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("persists rate limits and retries the same event after backoff", async () => {
    const { rpc } = daoRpc({ logs: [daoLog(DAO_EVENTS, "SetOperator", { operator: ACCOUNT })] });
    vi.mocked(createRpcClient).mockReturnValue(rpc);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(sendMessage).mockRejectedValueOnce(new TelegramRateLimitError(30));
    const { run, storage } = setup();
    expect(await (await run()).json()).toMatchObject({ outcome: "telegram_backoff" });
    const saved = storage.values.get("state:v1") as Record<string, unknown>;
    expect(saved.cursorBlock).toBe(G - 1);
    expect(await (await run()).json()).toMatchObject({ outcome: "telegram_backoff" });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    storage.values.set("state:v1", { ...saved, telegramRetryAfterUntil: 0 });
    expect(await (await setup({}, storage).run()).json()).toMatchObject({ outcome: "caught_up" });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("does not commit deadline state until all messages are sent", async () => {
    const { rpc } = daoRpc({ startTime: voteStart });
    vi.mocked(createRpcClient).mockReturnValue(rpc);
    const { storage, run } = setup();
    // Initialize using the runtime's own schema before adding a tracked proposal.
    await setup({ ALERTS_DAO_ENABLED: "false" }, storage).object.fetch(new Request("https://alerts.internal/status?domain=dao"));
    storage.values.set("state:v1", { version: 1, domainId: "dao", cursorBlock: G - 1, cursorHash: null,
      lastObservedHead: null, lastRunAt: null, lastSuccessAt: null, lastErrorCode: null, telegramRetryAfterUntil: null,
      yethState: null, yethMetrics: null, yethDailyFlow: null, teamsState: null, ybcState: null, daoState: trackedState() });
    vi.mocked(sendMessage).mockRejectedValueOnce(new Error("test failure"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await run()).status).toBe(500);
    const saved = storage.values.get("state:v1") as { cursorBlock: number; daoState: ReturnType<typeof trackedState> };
    expect(saved.cursorBlock).toBe(G - 1);
    expect(saved.daoState.proposals["0"]!.notified).toEqual([]);
    await setup({}, storage).run();
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendMessage).mock.calls[1]![1]).toContain("voting opened");
  });

  it("halts before sending if the scanned terminal block changes", async () => {
    const { rpc, block } = daoRpc({ logs: [daoLog(DAO_EVENTS, "SetOperator", { operator: ACCOUNT })] });
    vi.mocked(createRpcClient).mockReturnValue(rpc);
    vi.mocked(rpc.getBlockByNumber).mockResolvedValueOnce(block(G)).mockResolvedValue({ ...block(G), hash: hash(1) });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { run } = setup();
    expect(await (await run()).json()).toMatchObject({ code: "terminal_block_invalid" });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
