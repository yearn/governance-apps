import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { YBC_FEED_REQUEST_TIMEOUT_MS } from "@/lib/clients/ybc/payload";
import { YBC_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/ybc-feed";

describe("YBC feed transport validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("rejects a failed refresh so TanStack can retain the prior payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(feedExample))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchYbcFeed } = await import("@/lib/clients/ybc/feed");

    await expect(fetchYbcFeed()).resolves.toEqual(feedExample);
    await expect(fetchYbcFeed()).rejects.toThrow(/feed fetch failed/i);
  });

  it("rejects feed-supplied deployment authority", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          ...feedExample,
          deployment: {
            ...feedExample.deployment,
            ybcElection: "0x9999999999999999999999999999999999999999",
          },
        })
      )
    );
    const { fetchYbcFeed } = await import("@/lib/clients/ybc/feed");

    await expect(fetchYbcFeed()).rejects.toThrow(
      /deployment mismatch: ybcElection/i
    );
  });

  it("rejects an oversized payload before parsing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          status: 200,
          headers: {
            "content-length": String(YBC_FEED_MAX_PAYLOAD_BYTES + 1),
          },
        })
      )
    );
    const { fetchYbcFeed } = await import("@/lib/clients/ybc/feed");

    await expect(fetchYbcFeed()).rejects.toThrow(/payload exceeds/i);
  });

  it("does not let publisher clock skew reject a higher block", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(feedExample))
      .mockResolvedValueOnce(
        okResponse({
          ...feedExample,
          blockNumber: feedExample.blockNumber + 1,
          generatedAt: feedExample.generatedAt - 30,
        })
      );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchYbcFeed } = await import("@/lib/clients/ybc/feed");

    await expect(fetchYbcFeed()).resolves.toEqual(feedExample);
    await expect(fetchYbcFeed()).resolves.toMatchObject({
      blockNumber: feedExample.blockNumber + 1,
      generatedAt: feedExample.generatedAt - 30,
    });
  });

  it("allows a same-height replacement to reach canonical RPC verification", async () => {
    const replacementHash =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse(feedExample))
        .mockResolvedValueOnce(
          okResponse({
            ...feedExample,
            generatedAt: feedExample.generatedAt + 1,
            blockHash: replacementHash,
          })
        )
    );
    const { fetchYbcFeed } = await import("@/lib/clients/ybc/feed");

    await expect(fetchYbcFeed()).resolves.toEqual(feedExample);
    await expect(fetchYbcFeed()).resolves.toMatchObject({
      blockHash: replacementHash,
    });
  });

  it("parses a same-block republish without treating generatedAt as authority", async () => {
    const nextFeed = {
      ...feedExample,
      generatedAt: feedExample.generatedAt + 1,
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse(feedExample))
        .mockResolvedValueOnce(okResponse(nextFeed))
    );
    const { fetchYbcFeed } = await import("@/lib/clients/ybc/feed");

    await fetchYbcFeed();
    await expect(fetchYbcFeed()).resolves.toEqual(nextFeed);
  });

  it("bounds a direct fetch and body read with one elapsed deadline", async () => {
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
    const { fetchYbcFeed } = await import("@/lib/clients/ybc/feed");
    const fetchPromise = fetchYbcFeed();
    const fetchExpectation = expect(fetchPromise).rejects.toThrow(
      /feed request timed out/i
    );

    await vi.advanceTimersByTimeAsync(YBC_FEED_REQUEST_TIMEOUT_MS);

    await fetchExpectation;

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
    const bodyPromise = fetchYbcFeed();
    const bodyExpectation = expect(bodyPromise).rejects.toThrow(
      /feed request timed out/i
    );

    await vi.advanceTimersByTimeAsync(YBC_FEED_REQUEST_TIMEOUT_MS);

    await bodyExpectation;
    expect(cancel).toHaveBeenCalledOnce();
  });
});

function okResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
