import type { Address } from "viem";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";

type YbcAuthoritySnapshot = Pick<
  YbcFeed,
  | "blockHash"
  | "blockNumber"
  | "chainId"
  | "config"
  | "events"
  | "proposals"
>;

export const ybcKeys = {
  all: ["ybc"] as const,
  feed: () => [...ybcKeys.all, "feed"] as const,
  canonicalSnapshot: (feed?: YbcAuthoritySnapshot | null) => {
    const prefix = [...ybcKeys.all, "canonical-snapshot"] as const;
    return feed
      ? ([...prefix, getYbcAuthorityFingerprint(feed)] as const)
      : prefix;
  },
  walletOverlay: (
    address?: Address | string | null,
    feed?: YbcAuthoritySnapshot | null
  ) => {
    const prefix = [
      ...ybcKeys.all,
      "wallet-overlay",
      address ? address.toLowerCase() : null,
    ] as const;

    return feed
      ? ([...prefix, getYbcAuthorityFingerprint(feed)] as const)
      : prefix;
  },
};

function getYbcAuthorityFingerprint(feed: YbcAuthoritySnapshot) {
  return [
    feed.chainId,
    feed.blockNumber,
    feed.blockHash.toLowerCase(),
    feed.events.proposalCount,
    feed.config.additionThresholdBps,
    feed.config.expulsionThresholdBps,
    feed.proposals.map((proposal) => [
      proposal.id,
      proposal.account.toLowerCase(),
      proposal.proposer.toLowerCase(),
      proposal.epoch,
      proposal.addition,
      proposal.thresholdBps,
      proposal.votes,
      proposal.yea,
      proposal.nay,
      proposal.status,
      proposal.retracted,
      proposal.executed,
    ]),
  ] as const;
}
