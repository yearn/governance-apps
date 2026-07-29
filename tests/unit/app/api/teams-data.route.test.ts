import { afterEach, describe, expect, it, vi } from "vitest";
import { TEAMS_FEED_REQUEST_TIMEOUT_MS } from "@/lib/clients/teams/payload";
import { TEAMS_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/teams-feed";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/teams-data/route");
}

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl?: string
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(cacheControl ? { "cache-control": cacheControl } : {}),
    },
  });
}

describe("GET /api/teams-data", () => {
  afterEach(() => {
    restoreEnv();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns a JSON error when NEXT_PUBLIC_TEAMS_DATA_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_TEAMS_DATA_URL;

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "NEXT_PUBLIC_TEAMS_DATA_URL is not configured",
    });
  });

  it("returns a JSON error with the upstream status for non-2xx responses", async () => {
    process.env.NEXT_PUBLIC_TEAMS_DATA_URL =
      "https://example.invalid/teams.json";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "upstream" }, 502))
    );

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Teams feed upstream request failed",
      upstreamStatus: 502,
    });
  });

  it("returns upstream JSON from the configured URL", async () => {
    process.env.NEXT_PUBLIC_TEAMS_DATA_URL =
      "https://example.invalid/teams.json";
    const payload = { version: 1, generatedAt: 1 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.invalid/teams.json",
      {
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }
    );
    await expect(response.json()).resolves.toEqual(payload);
  });

  it("uses app-owned no-store when the upstream response is cacheable", async () => {
    process.env.NEXT_PUBLIC_TEAMS_DATA_URL =
      "https://example.invalid/teams.json";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200, "max-age=60"))
    );

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("uses no-store when upstream Cache-Control is missing", async () => {
    process.env.NEXT_PUBLIC_TEAMS_DATA_URL =
      "https://example.invalid/teams.json";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects declared and measured oversized upstream payloads", async () => {
    process.env.NEXT_PUBLIC_TEAMS_DATA_URL =
      "https://example.invalid/teams.json";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          headers: {
            "content-length": String(TEAMS_FEED_MAX_PAYLOAD_BYTES + 1),
          },
        })
      )
    );
    const declaredRoute = await loadRoute();

    await expect(declaredRoute.GET()).resolves.toMatchObject({
      status: 500,
    });

    const cancel = vi.fn();
    let pullCount = 0;
    const chunk = new Uint8Array(256 * 1024).fill(120);
    const chunkedBody = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1;
        controller.enqueue(chunk);
      },
      cancel,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(chunkedBody))
    );
    const measuredRoute = await loadRoute();

    await expect(measuredRoute.GET()).resolves.toMatchObject({
      status: 500,
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(pullCount).toBeGreaterThan(1);
    expect(pullCount).toBeLessThan(20);
  });

  it("times out a fetch that never resolves", async () => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_TEAMS_DATA_URL =
      "https://example.invalid/teams.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // Deliberately ignores AbortSignal to exercise the explicit race.
          })
      )
    );
    const { GET } = await loadRoute();
    const responsePromise = GET();

    await vi.advanceTimersByTimeAsync(TEAMS_FEED_REQUEST_TIMEOUT_MS);

    await expect(responsePromise).resolves.toMatchObject({ status: 504 });
  });

  it("cancels and times out a response body that never resolves", async () => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_TEAMS_DATA_URL =
      "https://example.invalid/teams.json";
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      pull() {
        return new Promise<void>(() => {
          // Deliberately never produces a chunk.
        });
      },
      cancel,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body))
    );
    const { GET } = await loadRoute();
    const responsePromise = GET();

    await vi.advanceTimersByTimeAsync(TEAMS_FEED_REQUEST_TIMEOUT_MS);

    await expect(responsePromise).resolves.toMatchObject({ status: 504 });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
