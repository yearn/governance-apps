import type { Hash, PublicClient } from "viem";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";
import { assertTeamsMainnetDeployment } from "./deployment";

export const TEAMS_SNAPSHOT_MAX_AGE_SECONDS = 20 * 60;
export const TEAMS_SNAPSHOT_MAX_FUTURE_SKEW_SECONDS = 2 * 60;
export const TEAMS_SNAPSHOT_MAX_TIP_LAG_BLOCKS = 128n;

export type TeamsSnapshotFreshness = {
  isCurrent: boolean;
  warning: Error | null;
};

export type TeamsVerifiedBlock = {
  blockHash: Hash;
  blockNumber: bigint;
  blockTimestamp: number;
  tipBlockNumber: bigint;
};

export function getTeamsSnapshotTrust(
  snapshot: TeamsVerifiedBlock | null,
  nowSeconds = Math.floor(Date.now() / 1_000)
): TeamsSnapshotFreshness {
  if (!snapshot) {
    return getTeamsSnapshotFreshness(null, nowSeconds);
  }

  const freshness = getTeamsSnapshotFreshness(
    snapshot.blockTimestamp,
    nowSeconds
  );
  if (!freshness.isCurrent) return freshness;

  if (snapshot.tipBlockNumber < snapshot.blockNumber) {
    return {
      isCurrent: false,
      warning: new Error(
        "The Ethereum Mainnet RPC tip is behind the Teams snapshot block. Actions are paused."
      ),
    };
  }

  if (
    snapshot.tipBlockNumber - snapshot.blockNumber >
    TEAMS_SNAPSHOT_MAX_TIP_LAG_BLOCKS
  ) {
    return {
      isCurrent: false,
      warning: new Error(
        "The Teams snapshot is too far behind the Ethereum Mainnet tip. Actions are paused."
      ),
    };
  }

  return { isCurrent: true, warning: null };
}

export function getTeamsSnapshotFreshness(
  blockTimestamp: number | null,
  nowSeconds = Math.floor(Date.now() / 1_000)
): TeamsSnapshotFreshness {
  if (blockTimestamp === null) {
    return {
      isCurrent: false,
      warning: new Error(
        "The Teams snapshot has not been verified on Ethereum Mainnet."
      ),
    };
  }

  if (
    blockTimestamp >
    nowSeconds + TEAMS_SNAPSHOT_MAX_FUTURE_SKEW_SECONDS
  ) {
    return {
      isCurrent: false,
      warning: new Error(
        "The canonical Teams snapshot block is unexpectedly in the future. Actions are paused."
      ),
    };
  }

  if (blockTimestamp < nowSeconds - TEAMS_SNAPSHOT_MAX_AGE_SECONDS) {
    return {
      isCurrent: false,
      warning: new Error(
        "The canonical Teams snapshot block is older than twenty minutes. Actions are paused."
      ),
    };
  }

  return { isCurrent: true, warning: null };
}

export async function verifyTeamsSnapshotBlock(
  publicClient: PublicClient,
  feed: TeamsFeed
): Promise<TeamsVerifiedBlock> {
  assertTeamsMainnetDeployment(feed);
  assertTeamsMainnetPublicClient(publicClient);

  const blockNumber = BigInt(feed.blockNumber);
  const [rpcChainId, block, tipBlockNumber] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getBlock({ blockNumber }),
    publicClient.getBlockNumber(),
  ]);

  if (rpcChainId !== MAINNET_CHAIN_ID) {
    throw new Error(
      "Teams snapshot verification requires an Ethereum Mainnet RPC endpoint."
    );
  }

  if (
    !block.hash ||
    block.hash.toLowerCase() !== feed.blockHash.toLowerCase()
  ) {
    throw new Error(
      "The Teams snapshot block is not canonical on Ethereum Mainnet. Actions are paused."
    );
  }

  if (typeof block.timestamp !== "bigint") {
    throw new Error(
      "The canonical Teams snapshot block timestamp is unavailable."
    );
  }

  if (block.timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      "The canonical Teams snapshot block timestamp is outside the supported range."
    );
  }

  return {
    blockHash: block.hash,
    blockNumber,
    blockTimestamp: Number(block.timestamp),
    tipBlockNumber,
  };
}

export function assertTeamsMainnetPublicClient(
  publicClient: PublicClient
): void {
  if (publicClient.chain?.id !== MAINNET_CHAIN_ID) {
    throw new Error(
      "Teams snapshot verification requires an Ethereum Mainnet RPC client."
    );
  }
}
