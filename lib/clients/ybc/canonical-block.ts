import type { Hash, PublicClient } from "viem";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { assertYbcMainnetDeployment } from "./deployment";

export type YbcVerifiedBlock = {
  blockHash: Hash;
  blockNumber: bigint;
  blockTimestamp: number;
  tipBlockNumber: bigint;
};

export async function verifyYbcSnapshotBlock(
  publicClient: PublicClient,
  feed: YbcFeed
): Promise<YbcVerifiedBlock> {
  assertYbcMainnetDeployment(feed);
  assertYbcMainnetPublicClient(publicClient);

  const rpcChainId = await publicClient.getChainId();
  if (rpcChainId !== 1) {
    throw new Error(
      "The configured YBC RPC endpoint is not Ethereum Mainnet."
    );
  }

  const blockNumber = BigInt(feed.blockNumber);
  const [block, tipBlockNumber] = await Promise.all([
    publicClient.getBlock({ blockNumber }),
    publicClient.getBlockNumber(),
  ]);

  if (
    !block.hash ||
    block.hash.toLowerCase() !== feed.blockHash.toLowerCase()
  ) {
    throw new Error(
      "The YBC snapshot block is not canonical on Ethereum Mainnet. Actions are paused."
    );
  }

  if (typeof block.timestamp !== "bigint") {
    throw new Error(
      "The canonical YBC snapshot block timestamp is unavailable."
    );
  }

  if (block.timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      "The canonical YBC snapshot block timestamp is outside the supported range."
    );
  }

  if (tipBlockNumber < blockNumber) {
    throw new Error(
      "The Ethereum Mainnet RPC tip is behind the YBC snapshot block."
    );
  }

  return {
    blockHash: block.hash,
    blockNumber,
    blockTimestamp: Number(block.timestamp),
    tipBlockNumber,
  };
}

export function assertYbcMainnetPublicClient(
  publicClient: PublicClient
): void {
  if (publicClient.chain?.id !== 1) {
    throw new Error(
      "YBC snapshot verification requires an Ethereum Mainnet RPC client."
    );
  }
}
