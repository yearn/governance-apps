import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import { TEAMS_FEED_REQUEST_TIMEOUT_MS } from "@/lib/clients/teams/payload";
import { TEAMS_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/teams-feed";

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
      { signal: expect.any(AbortSignal) }
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
