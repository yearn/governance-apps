import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import {
  getYbcSnapshotFreshness,
  verifyYbcSnapshotBlock,
  YBC_SNAPSHOT_MAX_AGE_SECONDS,
  YBC_SNAPSHOT_MAX_FUTURE_SKEW_SECONDS,
  YBC_SNAPSHOT_MAX_TIP_LAG_BLOCKS,
} from "@/lib/clients/ybc";
import { YbcFeedSchema } from "@/lib/schemas/ybc-feed";

const NOW_SECONDS = 2_000_000_000;
const feed = YbcFeedSchema.parse(feedExample);

describe("YBC canonical snapshot freshness", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts canonical block timestamps at the age and skew boundaries", () => {
    expect(
      getYbcSnapshotFreshness(
        NOW_SECONDS - YBC_SNAPSHOT_MAX_AGE_SECONDS,
        NOW_SECONDS
      )
    ).toEqual({ isCurrent: true, warning: null });
    expect(
      getYbcSnapshotFreshness(
        NOW_SECONDS + YBC_SNAPSHOT_MAX_FUTURE_SKEW_SECONDS,
        NOW_SECONDS
      )
    ).toEqual({ isCurrent: true, warning: null });
  });

  it("rejects stale, excessive-future, and unverified block timestamps", () => {
    expect(
      getYbcSnapshotFreshness(
        NOW_SECONDS - YBC_SNAPSHOT_MAX_AGE_SECONDS - 1,
        NOW_SECONDS
      )
    ).toMatchObject({ isCurrent: false });
    expect(
      getYbcSnapshotFreshness(
        NOW_SECONDS + YBC_SNAPSHOT_MAX_FUTURE_SKEW_SECONDS + 1,
        NOW_SECONDS
      )
    ).toMatchObject({ isCurrent: false });
    expect(getYbcSnapshotFreshness(null, NOW_SECONDS)).toMatchObject({
      isCurrent: false,
    });
  });

  it("verifies mainnet block hash, timestamp, and bounded tip lag", async () => {
    const client = createClient({
      blockTimestamp: NOW_SECONDS,
      tipBlockNumber:
        BigInt(feed.blockNumber) + YBC_SNAPSHOT_MAX_TIP_LAG_BLOCKS,
    });

    await expect(
      verifyYbcSnapshotBlock(client, feed, NOW_SECONDS)
    ).resolves.toMatchObject({
      blockHash: feed.blockHash,
      blockNumber: BigInt(feed.blockNumber),
      blockTimestamp: NOW_SECONDS,
      verifiedAtSeconds: NOW_SECONDS,
    });
  });

  it("uses the production clock after RPC reads and keeps injected time deterministic", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_SECONDS * 1_000);
    const block = createDeferred<
      Awaited<ReturnType<PublicClient["getBlock"]>>
    >();
    const tip = createDeferred<bigint>();
    const client = {
      chain: { id: 1 },
      getChainId: vi.fn(async () => 1),
      getBlock: vi.fn(() => block.promise),
      getBlockNumber: vi.fn(() => tip.promise),
    } as unknown as PublicClient;
    const boundaryFeed = {
      ...feed,
    };
    const verification = verifyYbcSnapshotBlock(client, boundaryFeed);

    await waitForRpcReads(client);
    vi.setSystemTime(
      (NOW_SECONDS + YBC_SNAPSHOT_MAX_AGE_SECONDS + 1) * 1_000
    );
    block.resolve({
      hash: feed.blockHash,
      timestamp: BigInt(NOW_SECONDS),
    } as Awaited<ReturnType<PublicClient["getBlock"]>>);
    tip.resolve(BigInt(feed.blockNumber));

    await expect(verification).rejects.toThrow(/older than five minutes/i);

    const deterministicClient = createClient({
      blockTimestamp: NOW_SECONDS,
    });
    await expect(
      verifyYbcSnapshotBlock(
        deterministicClient,
        boundaryFeed,
        NOW_SECONDS + YBC_SNAPSHOT_MAX_AGE_SECONDS
      )
    ).resolves.toMatchObject({
      verifiedAtSeconds:
        NOW_SECONDS + YBC_SNAPSHOT_MAX_AGE_SECONDS,
    });
  });

  it("rejects stale blocks even when publisher generatedAt is fresh", async () => {
    const republishedFeed = {
      ...feed,
      generatedAt: NOW_SECONDS,
    };
    const client = createClient({
      blockTimestamp:
        NOW_SECONDS - YBC_SNAPSHOT_MAX_AGE_SECONDS - 1,
    });

    await expect(
      verifyYbcSnapshotBlock(client, republishedFeed, NOW_SECONDS)
    ).rejects.toThrow(/canonical YBC snapshot block is older/i);
  });

  it("accepts a same-height replacement only when RPC confirms its hash", async () => {
    const replacementHash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const replacementFeed = {
      ...feed,
      blockHash: replacementHash,
      generatedAt: feed.generatedAt - 60,
    };
    const client = createClient({
      blockHash: replacementHash,
      blockTimestamp: NOW_SECONDS,
    });

    await expect(
      verifyYbcSnapshotBlock(client, replacementFeed, NOW_SECONDS)
    ).resolves.toMatchObject({ blockHash: replacementHash });
  });

  it("rejects excessive tip lag and non-mainnet clients before RPC", async () => {
    const laggedClient = createClient({
      blockTimestamp: NOW_SECONDS,
      tipBlockNumber:
        BigInt(feed.blockNumber) +
        YBC_SNAPSHOT_MAX_TIP_LAG_BLOCKS +
        1n,
    });
    await expect(
      verifyYbcSnapshotBlock(laggedClient, feed, NOW_SECONDS)
    ).rejects.toThrow(/behind the Ethereum Mainnet tip/i);

    const getBlock = vi.fn();
    const getBlockNumber = vi.fn();
    const wrongChainClient = {
      chain: { id: 10 },
      getBlock,
      getBlockNumber,
    } as unknown as PublicClient;
    await expect(
      verifyYbcSnapshotBlock(wrongChainClient, feed, NOW_SECONDS)
    ).rejects.toThrow(/requires an Ethereum Mainnet RPC client/i);
    expect(getBlock).not.toHaveBeenCalled();
    expect(getBlockNumber).not.toHaveBeenCalled();
  });

  it("rejects a non-mainnet RPC endpoint even when client metadata says mainnet", async () => {
    const getBlock = vi.fn();
    const getBlockNumber = vi.fn();
    const publicClient = {
      chain: { id: 1 },
      getChainId: vi.fn(async () => 10),
      getBlock,
      getBlockNumber,
    } as unknown as PublicClient;

    await expect(
      verifyYbcSnapshotBlock(publicClient, feed, NOW_SECONDS)
    ).rejects.toThrow(/RPC endpoint is not Ethereum Mainnet/i);
    expect(getBlock).not.toHaveBeenCalled();
    expect(getBlockNumber).not.toHaveBeenCalled();
  });
});

function createClient({
  blockHash = feed.blockHash,
  blockTimestamp,
  tipBlockNumber = BigInt(feed.blockNumber),
}: {
  blockHash?: string;
  blockTimestamp: number;
  tipBlockNumber?: bigint;
}): PublicClient {
  return {
    chain: { id: 1 },
    getChainId: vi.fn(async () => 1),
    getBlock: vi.fn(async () => ({
      hash: blockHash,
      timestamp: BigInt(blockTimestamp),
    })),
    getBlockNumber: vi.fn(async () => tipBlockNumber),
  } as unknown as PublicClient;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitForRpcReads(client: PublicClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (
      vi.mocked(client.getBlock).mock.calls.length > 0 &&
      vi.mocked(client.getBlockNumber).mock.calls.length > 0
    ) {
      return;
    }
    await Promise.resolve();
  }
  throw new Error("YBC verification did not start its RPC reads.");
}
