import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { verifyYbcSnapshotBlock } from "@/lib/clients/ybc";
import { YbcFeedSchema } from "@/lib/schemas/ybc-feed";

const feed = YbcFeedSchema.parse(feedExample);

describe("YBC canonical snapshot block", () => {
  it("verifies an old canonical block without imposing an age or tip-lag cutoff", async () => {
    const blockTimestamp = 2_000_000_000;
    const client = createClient({
      blockTimestamp,
      tipBlockNumber: BigInt(feed.blockNumber) + 10_000n,
    });

    await expect(
      verifyYbcSnapshotBlock(client, feed)
    ).resolves.toMatchObject({
      blockHash: feed.blockHash,
      blockNumber: BigInt(feed.blockNumber),
      blockTimestamp,
      tipBlockNumber: BigInt(feed.blockNumber) + 10_000n,
    });
  });

  it("accepts a same-height replacement only when RPC confirms its hash", async () => {
    const replacementHash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const replacementFeed = {
      ...feed,
      blockHash: replacementHash,
    };
    const client = createClient({
      blockHash: replacementHash,
      blockTimestamp: 2_000_000_000,
    });

    await expect(
      verifyYbcSnapshotBlock(client, replacementFeed)
    ).resolves.toMatchObject({ blockHash: replacementHash });
  });

  it("rejects a feed block hash that RPC does not confirm", async () => {
    const client = createClient({
      blockHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      blockTimestamp: 2_000_000_000,
    });

    await expect(
      verifyYbcSnapshotBlock(client, feed)
    ).rejects.toThrow(/not canonical/i);
  });

  it("rejects an RPC tip behind the feed block", async () => {
    const client = createClient({
      blockTimestamp: 2_000_000_000,
      tipBlockNumber: BigInt(feed.blockNumber) - 1n,
    });

    await expect(
      verifyYbcSnapshotBlock(client, feed)
    ).rejects.toThrow(/RPC tip is behind/i);
  });

  it("rejects non-mainnet client configuration before RPC", async () => {
    const getChainId = vi.fn();
    const getBlock = vi.fn();
    const getBlockNumber = vi.fn();
    const client = {
      chain: { id: 10 },
      getChainId,
      getBlock,
      getBlockNumber,
    } as unknown as PublicClient;

    await expect(
      verifyYbcSnapshotBlock(client, feed)
    ).rejects.toThrow(/requires an Ethereum Mainnet RPC client/i);
    expect(getChainId).not.toHaveBeenCalled();
    expect(getBlock).not.toHaveBeenCalled();
    expect(getBlockNumber).not.toHaveBeenCalled();
  });

  it("rejects a non-mainnet RPC endpoint", async () => {
    const getBlock = vi.fn();
    const getBlockNumber = vi.fn();
    const client = {
      chain: { id: 1 },
      getChainId: vi.fn(async () => 10),
      getBlock,
      getBlockNumber,
    } as unknown as PublicClient;

    await expect(
      verifyYbcSnapshotBlock(client, feed)
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
