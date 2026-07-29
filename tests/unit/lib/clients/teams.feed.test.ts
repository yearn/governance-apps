import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import { mapTeamsFeedToPageData } from "@/lib/clients/teams/onchain";
import { TEAMS_FEED_REQUEST_TIMEOUT_MS } from "@/lib/clients/teams/payload";
import {
  TEAMS_FEED_CORRECTED_ACCOUNTING_BLOCK,
  TEAMS_FEED_MAX_PAYLOAD_BYTES,
} from "@/lib/schemas/teams-feed";

describe("Teams feed transport validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {});
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses the proxy and rejects a failed refresh so TanStack retains prior data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(feedExample))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchTeamsFeed } = await import("@/lib/clients/teams/feed");

    await expect(fetchTeamsFeed()).resolves.toEqual(feedExample);
    await expect(fetchTeamsFeed()).rejects.toThrow(/feed fetch failed/i);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/teams-data",
      {
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }
    );
  });

  it("supports a same-URL v1-to-v2 switch and fails v1 financials closed", async () => {
    const correctedButUnitlessV1 = {
      ...feedExample,
      version: 1 as const,
      units: undefined,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(correctedButUnitlessV1))
      .mockResolvedValueOnce(okResponse(feedExample))
      .mockResolvedValueOnce(okResponse(correctedButUnitlessV1));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchTeamsFeed } = await import("@/lib/clients/teams/feed");

    const v1 = await fetchTeamsFeed();
    const v2 = await fetchTeamsFeed();
    const fallbackV1 = await fetchTeamsFeed();

    expect(v1).not.toBeNull();
    expect(v2).not.toBeNull();
    expect(fallbackV1).not.toBeNull();
    const v1Data = mapTeamsFeedToPageData(v1!);
    const v2Data = mapTeamsFeedToPageData(v2!);
    const fallbackV1Data = mapTeamsFeedToPageData(fallbackV1!);
    expect(v1Data.financialData).toEqual({
      status: "unavailable",
      source: "feed",
      reason: "incompatible-feed",
      feedVersion: 1,
    });
    expect(v1Data.teams[0]).toMatchObject({
      name: "Example Team",
      currentPeriod: { revenueUsd: "0.00" },
    });
    expect(v2Data.financialData).toEqual({
      status: "available",
      source: "feed",
      usdDecimals: 18,
    });
    expect(v2Data.teams[0]?.currentPeriod.revenueUsd).toBe("125");
    expect(fallbackV1Data.financialData).toEqual({
      status: "unavailable",
      source: "feed",
      reason: "incompatible-feed",
      feedVersion: 1,
    });
    expect(fallbackV1Data.teams[0]?.currentPeriod.revenueUsd).toBe("0.00");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/teams-data",
      {
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/teams-data",
      {
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/teams-data",
      {
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }
    );
  });

  it("rejects v2 snapshots from before the accounting correction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          ...feedExample,
          blockNumber: TEAMS_FEED_CORRECTED_ACCOUNTING_BLOCK - 1,
          events: {
            ...feedExample.events,
            lastIndexedBlock:
              TEAMS_FEED_CORRECTED_ACCOUNTING_BLOCK - 1,
          },
        })
      )
    );
    const { fetchTeamsFeed } = await import("@/lib/clients/teams/feed");

    await expect(fetchTeamsFeed()).rejects.toThrow(
      /schema validation failed/i
    );
  });

  it("rejects an oversized payload before parsing it", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{}"));
      },
      cancel,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(body, {
          status: 200,
          headers: {
            "content-length": String(TEAMS_FEED_MAX_PAYLOAD_BYTES + 1),
          },
        })
      )
    );
    const { fetchTeamsFeed } = await import("@/lib/clients/teams/feed");

    await expect(fetchTeamsFeed()).rejects.toThrow(/payload exceeds/i);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("cancels a streamed payload as soon as the measured cap is exceeded", async () => {
    const cancel = vi.fn();
    let pullCount = 0;
    const chunk = new Uint8Array(256 * 1024).fill(120);
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1;
        controller.enqueue(chunk);
      },
      cancel,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body))
    );
    const { fetchTeamsFeed } = await import("@/lib/clients/teams/feed");

    await expect(fetchTeamsFeed()).rejects.toThrow(/payload exceeds/i);
    expect(cancel).toHaveBeenCalledOnce();
    expect(pullCount).toBeGreaterThan(1);
    expect(pullCount).toBeLessThan(20);
  });

  it("bounds fetch and body reads with one elapsed deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // Deliberately ignores AbortSignal to exercise the explicit race.
          })
      )
    );
    const { fetchTeamsFeed } = await import("@/lib/clients/teams/feed");
    const fetchPromise = fetchTeamsFeed();
    const fetchRejection = expect(fetchPromise).rejects.toThrow(
      /timed out|exceeded/i
    );

    await vi.advanceTimersByTimeAsync(TEAMS_FEED_REQUEST_TIMEOUT_MS);
    await fetchRejection;

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
    const bodyPromise = fetchTeamsFeed();
    const bodyRejection = expect(bodyPromise).rejects.toThrow(
      /timed out|exceeded/i
    );

    await vi.advanceTimersByTimeAsync(TEAMS_FEED_REQUEST_TIMEOUT_MS);
    await bodyRejection;
    expect(cancel).toHaveBeenCalledOnce();
  });
});

function okResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
