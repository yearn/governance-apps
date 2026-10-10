import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTreasuryFeed, TreasuryFeedReader, TREASURY_FEED_POLICY } from "@/lib/clients/treasury/feed";
import { createTreasuryMockFeed } from "@/lib/clients/treasury/mock";
import { parseTreasuryFeed, TREASURY_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/treasury-feed";
import { GET, HEAD } from "@/app/api/treasury-data/route";

function live() {
  const feed = createTreasuryMockFeed();
  feed.mode = "live";
  return feed;
}
const response = (value: unknown) => new Response(JSON.stringify(value));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("treasury live transport", () => {
  it.each(["height", "hash", "timestamp"])("retains the accepted block after a newer conflicting %s publication", async (field) => {
    const first = live();
    const next = { ...first, generatedAt: first.generatedAt + 1 };
    if (field === "height") next.blockNumber -= 1;
    if (field === "hash") next.blockHash = "0x" + "2".repeat(64);
    if (field === "timestamp") next.blockTimestamp -= 1;
    const reader = new TreasuryFeedReader(vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(next));
    await reader.refresh();
    await expect(reader.refresh()).rejects.toThrow("block");
    expect(reader.current()).toBe(first);
  });

  it("loads a validated same-origin publication", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(live()));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchTreasuryFeed()).allocations).toHaveLength(8);
    expect(fetchMock).toHaveBeenCalledWith("/api/treasury-data", expect.objectContaining({ cache: "no-store", redirect: "manual", signal: expect.any(AbortSignal) }));
  });

  it("rejects a browser-filtered redirect response", async () => {
    // Browsers expose manual redirects as opaque responses with status zero.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.error()));
    await expect(fetchTreasuryFeed()).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("never accepts example data from the live endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(createTreasuryMockFeed())));
    await expect(fetchTreasuryFeed()).rejects.toThrow("example data");
  });

  it("retains its last valid publication after schema failures, older data and conflicts", async () => {
    const first = live();
    const reader = new TreasuryFeedReader(vi.fn().mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new Error("schema failure"))
      .mockResolvedValueOnce({ ...first, generatedAt: first.generatedAt - 1 })
      .mockResolvedValueOnce({ ...first, registryRevision: "0".repeat(64) }));
    await reader.refresh();
    for (let i = 0; i < 3; i++) {
      await expect(reader.refresh()).rejects.toThrow();
      expect(reader.current()).toBe(first);
    }
  });

  it("rejects future observations and accepts a later consistent publication", async () => {
    const first = live();
    const replacement = { ...first, generatedAt: first.generatedAt + 1, blockNumber: first.blockNumber + 1 };
    const reader = new TreasuryFeedReader(vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(replacement).mockResolvedValueOnce({ ...replacement, generatedAt: Math.floor(Date.now() / 1000) + 1000 }));
    await reader.refresh();
    expect(await reader.refresh()).toBe(replacement);
    await expect(reader.refresh()).rejects.toThrow("future");
    expect(reader.current()).toBe(replacement);
  });

  it("does not promote a response from a superseded request", async () => {
    let finish!: (value: ReturnType<typeof live>) => void;
    const first = new Promise<ReturnType<typeof live>>((resolve) => { finish = resolve; });
    const accepted = live();
    const reader = new TreasuryFeedReader(vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(accepted));
    const pending = reader.refresh();
    await reader.refresh();
    finish({ ...accepted, generatedAt: accepted.generatedAt - 10 });
    expect(await pending).toBe(accepted);
  });

  it.each([true, false])("bounds declared and streamed payloads (%s)", async (declared) => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start(controller) { if (!declared) controller.enqueue(new Uint8Array(TREASURY_FEED_MAX_PAYLOAD_BYTES + 1)); }, cancel,
    }), { headers: declared ? { "content-length": String(TREASURY_FEED_MAX_PAYLOAD_BYTES + 1) } : {} })));
    await expect(fetchTreasuryFeed()).rejects.toMatchObject({ kind: "oversized" });
    expect(cancel).toHaveBeenCalled();
  });

  it.each(["headers", "body"])("times out during %s", async (phase) => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => phase === "headers" ? new Promise(() => undefined) : Promise.resolve(new Response(new ReadableStream({ cancel })))));
    const result = expect(fetchTreasuryFeed()).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(TREASURY_FEED_POLICY.requestTimeoutMs);
    await result;
    if (phase === "body") expect(cancel).toHaveBeenCalled();
  });

  it("rejects malformed UTF-8", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125]))));
    await expect(fetchTreasuryFeed()).rejects.toThrow();
  });
});

describe("treasury feed proxy", () => {
  it.each([301, 302, 303, 307, 308])("rejects upstream redirects without following them (%s)", async (status) => {
    vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TREASURY", "true");
    vi.stubEnv("TREASURY_DATA_URL", "https://operator.example/treasury.json");
    const cancel = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel }), {
      status,
      headers: { location: "https://other.example/treasury.json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await GET();

    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({ error: "Treasury upstream is unavailable." });
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://operator.example/treasury.json",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("permits only explicit loopback HTTP outside production (%s)", async (host) => {
    vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "preview");
    vi.stubEnv("TREASURY_DATA_URL", "http://" + host + ":8080/treasury.json");
    const fetchMock = vi.fn().mockImplementation(async () => response(live()));
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET()).status).toBe(200);
    vi.stubEnv("TREASURY_DATA_URL", "http://localhost.evil.example/treasury.json");
    expect((await GET()).status).toBe(503);
    vi.stubEnv("TREASURY_DATA_URL", "http://user:password@localhost/treasury.json");
    expect((await GET()).status).toBe(503);
    vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TREASURY", "true");
    vi.stubEnv("TREASURY_DATA_URL", "http://" + host + ":8080/treasury.json");
    expect((await GET()).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("gates GET and HEAD before any network request", async () => {
    vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TREASURY", "false");
    vi.stubEnv("TREASURY_DATA_URL", "https://operator.example/treasury.json");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET()).status).toBe(404);
    expect((await HEAD()).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates the configured HTTPS source and never substitutes mocks", async () => {
    vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TREASURY", "true");
    vi.stubEnv("TREASURY_DATA_URL", "");
    expect((await GET()).status).toBe(503);
    vi.stubEnv("TREASURY_DATA_URL", "http://operator.example/treasury.json");
    expect((await GET()).status).toBe(503);
    vi.stubEnv("TREASURY_DATA_URL", "https://operator.example/treasury.json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(live())).mockResolvedValueOnce(response(createTreasuryMockFeed())).mockResolvedValueOnce(response({ version: 2 })));
    const result = await GET();
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(parseTreasuryFeed(await result.json()).mode).toBe("live");
    expect((await GET()).status).toBe(502);
    expect((await GET()).status).toBe(502);
  });
});
