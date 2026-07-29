import type { Hash, PublicClient } from "viem";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { assertYbcMainnetDeployment } from "./deployment";

export const YBC_SNAPSHOT_MAX_AGE_SECONDS = 5 * 60;
export const YBC_SNAPSHOT_MAX_FUTURE_SKEW_SECONDS = 2 * 60;
export const YBC_SNAPSHOT_MAX_TIP_LAG_BLOCKS = 32n;

export type YbcSnapshotFreshness = {
  isCurrent: boolean;
  warning: Error | null;
};

export type YbcVerifiedBlock = {
  blockHash: Hash;
  blockNumber: bigint;
  blockTimestamp: number;
  tipBlockNumber: bigint;
  verifiedAtSeconds: number;
};

export function getYbcSnapshotFreshness(
  blockTimestamp: number | null,
  nowSeconds = Math.floor(Date.now() / 1_000)
): YbcSnapshotFreshness {
  if (blockTimestamp === null) {
    return {
      isCurrent: false,
      warning: new Error(
        "The YBC snapshot has not been verified on Ethereum Mainnet."
      ),
    };
  }

  if (
    blockTimestamp >
    nowSeconds + YBC_SNAPSHOT_MAX_FUTURE_SKEW_SECONDS
  ) {
    return {
      isCurrent: false,
      warning: new Error(
        "The canonical YBC snapshot block is unexpectedly in the future. Actions are paused."
      ),
    };
  }

  if (blockTimestamp < nowSeconds - YBC_SNAPSHOT_MAX_AGE_SECONDS) {
    return {
      isCurrent: false,
      warning: new Error(
        "The canonical YBC snapshot block is older than five minutes. Actions are paused."
      ),
    };
  }

  return { isCurrent: true, warning: null };
}

export async function verifyYbcSnapshotBlock(
  publicClient: PublicClient,
  feed: YbcFeed,
  nowSeconds?: number
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

  const blockTimestamp = Number(block.timestamp);
  const verifiedAtSeconds = nowSeconds ?? Math.floor(Date.now() / 1_000);
  const freshness = getYbcSnapshotFreshness(
    blockTimestamp,
    verifiedAtSeconds
  );
  if (!freshness.isCurrent) {
    throw freshness.warning ?? new Error("YBC actions are paused.");
  }

  if (tipBlockNumber < blockNumber) {
    throw new Error(
      "The Ethereum Mainnet RPC tip is behind the YBC snapshot block."
    );
  }

  if (tipBlockNumber - blockNumber > YBC_SNAPSHOT_MAX_TIP_LAG_BLOCKS) {
    throw new Error(
      "The YBC snapshot is too far behind the Ethereum Mainnet tip. Actions are paused."
    );
  }

  return {
    blockHash: block.hash,
    blockNumber,
    blockTimestamp,
    tipBlockNumber,
    verifiedAtSeconds,
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
