import { describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import {
  assertTeamsSnapshotTransition,
  readTeamsCanonicalSnapshot,
  TEAMS_MAINNET_DEPLOYMENT,
  TEAMS_SNAPSHOT_MAX_REORG_ROLLBACK_BLOCKS,
  type TeamsCanonicalSnapshot,
} from "@/lib/clients/teams";
import { TeamsFeedSchema, type TeamsFeed } from "@/lib/schemas/teams-feed";

const NOW_SECONDS = 2_000_000_000;
const REPLACEMENT_HASH =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

function createFeed(patch: Partial<TeamsFeed> = {}): TeamsFeed {
  return TeamsFeedSchema.parse({
    ...feedExample,
    ...patch,
  });
}

function createPublicClient(options: {
  blockHash?: `0x${string}`;
  blockTimestamp?: bigint;
  chainId?: number;
  registryField?: string;
  registryValue?: unknown;
  tipBlockNumber?: bigint;
} = {}) {
  const feed = createFeed();
  return {
    chain: { id: options.chainId ?? 1 },
    getBlock: vi.fn().mockResolvedValue({
      hash: options.blockHash ?? feed.blockHash,
      timestamp: options.blockTimestamp ?? BigInt(NOW_SECONDS),
    }),
    getBlockNumber: vi.fn().mockResolvedValue(
      options.tipBlockNumber ?? BigInt(feed.blockNumber)
    ),
    getChainId: vi.fn().mockResolvedValue(options.chainId ?? 1),
    readContract: vi.fn(
      async ({ functionName }: { functionName: string }) => {
        if (functionName === options.registryField) {
          return options.registryValue;
        }
        switch (functionName) {
          case "num_teams":
            return BigInt(feed.events.teamCount);
          case "implementation":
            return TEAMS_MAINNET_DEPLOYMENT.teamImplementation;
          case "revenue_recipient":
            return TEAMS_MAINNET_DEPLOYMENT.revenueRecipient;
          case "funding_distributor":
            return TEAMS_MAINNET_DEPLOYMENT.fundingDistributor;
          default:
            throw new Error(`Unexpected read: ${functionName}`);
        }
      }
    ),
  };
}

describe("Teams canonical snapshot authority", () => {
  it("accepts the pinned deployment and canonical registry roots", async () => {
    const feed = createFeed();
    const publicClient = createPublicClient();

    await expect(
      readTeamsCanonicalSnapshot(
        publicClient as never,
        feed,
        null
      )
    ).resolves.toMatchObject({
      blockHash: feed.blockHash,
      blockNumber: BigInt(feed.blockNumber),
      blockTimestamp: NOW_SECONDS,
      numTeams: BigInt(feed.events.teamCount),
    });
    expect(publicClient.getBlock).toHaveBeenCalledTimes(2);
    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
        blockNumber: BigInt(feed.blockNumber),
      })
    );
  });

  it("rejects feed-controlled deployment roots before RPC reads", async () => {
    const canonicalFeed = createFeed();
    const feed: TeamsFeed = {
      ...canonicalFeed,
      deployment: {
        ...canonicalFeed.deployment,
        teamRegistry: "0x9999999999999999999999999999999999999999",
      },
    };
    const publicClient = createPublicClient();

    await expect(
      readTeamsCanonicalSnapshot(
        publicClient as never,
        feed,
        null
      )
    ).rejects.toThrow("deployment.teamRegistry");
    expect(publicClient.getBlock).not.toHaveBeenCalled();
  });

  it("rejects wrong-chain clients and endpoints", async () => {
    const feed = createFeed();
    const wrongClient = createPublicClient({ chainId: 10 });

    await expect(
      readTeamsCanonicalSnapshot(
        wrongClient as never,
        feed,
        null
      )
    ).rejects.toThrow("Mainnet RPC client");

    const wrongEndpoint = createPublicClient();
    wrongEndpoint.getChainId.mockResolvedValue(10);
    await expect(
      readTeamsCanonicalSnapshot(
        wrongEndpoint as never,
        feed,
        null
      )
    ).rejects.toThrow("Mainnet RPC endpoint");
  });

  it("rejects a noncanonical block hash and a mid-read reorg", async () => {
    const feed = createFeed();
    const wrongHash = createPublicClient({
      blockHash: REPLACEMENT_HASH,
    });

    await expect(
      readTeamsCanonicalSnapshot(
        wrongHash as never,
        feed,
        null
      )
    ).rejects.toThrow("not canonical");

    const midReadReorg = createPublicClient();
    midReadReorg.getBlock
      .mockResolvedValueOnce({
        hash: feed.blockHash,
        timestamp: BigInt(NOW_SECONDS),
      })
      .mockResolvedValueOnce({
        hash: REPLACEMENT_HASH,
        timestamp: BigInt(NOW_SECONDS),
      });
    await expect(
      readTeamsCanonicalSnapshot(
        midReadReorg as never,
        feed,
        null
      )
    ).rejects.toThrow("not canonical");
  });

  it("accepts canonical historical data without age or tip-lag cutoffs", async () => {
    const feed = createFeed({
      generatedAt: NOW_SECONDS + 86_400,
    });
    const historicalBlock = createPublicClient({
      blockTimestamp: BigInt(NOW_SECONDS - 86_400),
      tipBlockNumber: BigInt(feed.blockNumber) + 10_000n,
    });

    await expect(
      readTeamsCanonicalSnapshot(
        historicalBlock as never,
        feed,
        null
      )
    ).resolves.toMatchObject({
      blockTimestamp: NOW_SECONDS - 86_400,
      tipBlockNumber: BigInt(feed.blockNumber) + 10_000n,
    });
  });

  it("rejects an RPC tip behind the feed block", async () => {
    const feed = createFeed();
    const behindTip = createPublicClient({
      tipBlockNumber: BigInt(feed.blockNumber) - 1n,
    });

    await expect(
      readTeamsCanonicalSnapshot(behindTip as never, feed, null)
    ).rejects.toThrow(/RPC tip is behind/i);
  });

  it("rejects mismatched canonical registry roots and team count", async () => {
    const feed = createFeed();
    const wrongRoot = createPublicClient({
      registryField: "implementation",
      registryValue:
        "0x9999999999999999999999999999999999999999",
    });
    await expect(
      readTeamsCanonicalSnapshot(
        wrongRoot as never,
        feed,
        null
      )
    ).rejects.toThrow("registry implementation");

    const wrongCount = createPublicClient({
      registryField: "num_teams",
      registryValue: 999n,
    });
    await expect(
      readTeamsCanonicalSnapshot(
        wrongCount as never,
        feed,
        null
      )
    ).rejects.toThrow("registry count");
  });

  it("accepts canonical replacements and shallow reorgs but rejects deep rollback", () => {
    const previous = createSnapshot(100n, feedExample.blockHash);

    expect(() =>
      assertTeamsSnapshotTransition(
        previous,
        createSnapshot(100n, REPLACEMENT_HASH)
      )
    ).not.toThrow();
    expect(() =>
      assertTeamsSnapshotTransition(
        previous,
        createSnapshot(
          100n - TEAMS_SNAPSHOT_MAX_REORG_ROLLBACK_BLOCKS,
          REPLACEMENT_HASH
        )
      )
    ).not.toThrow();
    expect(() =>
      assertTeamsSnapshotTransition(
        previous,
        createSnapshot(
          100n - TEAMS_SNAPSHOT_MAX_REORG_ROLLBACK_BLOCKS - 1n,
          REPLACEMENT_HASH
        )
      )
    ).toThrow("rolled back");
  });
});

function createSnapshot(
  blockNumber: bigint,
  blockHash: string
): TeamsCanonicalSnapshot {
  return {
    blockHash: blockHash as `0x${string}`,
    blockNumber,
    blockTimestamp: NOW_SECONDS,
    numTeams: 1n,
    tipBlockNumber: blockNumber,
  };
}
