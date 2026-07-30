import type { Hash, PublicClient } from "viem";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";
import { assertTeamsMainnetDeployment } from "./deployment";

export type TeamsVerifiedBlock = {
  blockHash: Hash;
  blockNumber: bigint;
  blockTimestamp: number;
  tipBlockNumber: bigint;
};

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
  if (tipBlockNumber < blockNumber) {
    throw new Error(
      "The Ethereum Mainnet RPC tip is behind the Teams snapshot block."
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
