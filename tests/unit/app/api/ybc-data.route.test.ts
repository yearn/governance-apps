import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/ybc-data/route");
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

describe("GET /api/ybc-data", () => {
  afterEach(() => {
    restoreEnv();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns a JSON error when NEXT_PUBLIC_YBC_DATA_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_YBC_DATA_URL;

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "NEXT_PUBLIC_YBC_DATA_URL is not configured",
    });
  });

  it("returns a JSON error with the upstream status for non-2xx responses", async () => {
    process.env.NEXT_PUBLIC_YBC_DATA_URL = "https://example.invalid/ybc.json";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "upstream" }, 502))
    );

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "YBC feed upstream request failed",
      upstreamStatus: 502,
    });
  });

  it("returns upstream JSON from the configured URL", async () => {
    process.env.NEXT_PUBLIC_YBC_DATA_URL = "https://example.invalid/ybc.json";
    const payload = { version: 1, generatedAt: 1 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://example.invalid/ybc.json");
    await expect(response.json()).resolves.toEqual(payload);
  });

  it("propagates upstream Cache-Control when present", async () => {
    process.env.NEXT_PUBLIC_YBC_DATA_URL = "https://example.invalid/ybc.json";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200, "max-age=60"))
    );

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("max-age=60");
  });

  it("uses no-store when upstream Cache-Control is missing", async () => {
    process.env.NEXT_PUBLIC_YBC_DATA_URL = "https://example.invalid/ybc.json";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
