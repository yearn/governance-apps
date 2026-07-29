import type { Address } from "viem";
import type { YbcFeed, YbcFeedProposal } from "@/lib/schemas/ybc-feed";

export type YbcCanonicalProposal = readonly [
  account: Address,
  proposer: Address,
  epoch: bigint,
  addition: boolean,
  threshold: bigint,
  votes: bigint,
  yea: bigint,
  retracted: boolean,
  executed: boolean,
];

const FEED_STATUS_FLAGS = {
  proposed: 1,
  retracted: 2,
  voting: 4,
  passed: 8,
  failed: 16,
  executed: 32,
  expired: 64,
} as const;

export function assertCompleteYbcProposalHistory(
  feed: Pick<YbcFeed, "events" | "proposals">
): void {
  if (feed.proposals.length !== feed.events.proposalCount) {
    throw new Error(
      "The YBC proposal history is incomplete for this snapshot."
    );
  }

  const ids = new Set(feed.proposals.map((proposal) => proposal.id));
  if (ids.size !== feed.proposals.length) {
    throw new Error("The YBC proposal history contains duplicate IDs.");
  }

  for (let id = 0; id < feed.events.proposalCount; id += 1) {
    if (!ids.has(id)) {
      throw new Error(
        "The YBC proposal history must contain contiguous canonical IDs."
      );
    }
  }
}

export function assertYbcProposalSnapshotMatchesFeed(
  proposal: YbcFeedProposal,
  value: unknown
): asserts value is YbcCanonicalProposal {
  const canonical = parseYbcCanonicalProposal(proposal.id, value);
  assertYbcProposalIdentityMatchesFeed(proposal, canonical);

  assertProposalField(
    proposal,
    "votes",
    canonical[5],
    BigInt(proposal.votes)
  );
  assertProposalField(proposal, "yea", canonical[6], BigInt(proposal.yea));
  assertProposalField(
    proposal,
    "retracted",
    canonical[7],
    proposal.retracted
  );
  assertProposalField(proposal, "executed", canonical[8], proposal.executed);

  if (canonical[6] > canonical[5]) {
    throw new Error(
      `YBC proposal ${proposal.id} has invalid canonical vote totals.`
    );
  }

  assertProposalField(
    proposal,
    "nay",
    canonical[5] - canonical[6],
    BigInt(proposal.nay)
  );
}

export function assertYbcProposalIdentityMatchesFeed(
  proposal: YbcFeedProposal,
  value: unknown
): asserts value is YbcCanonicalProposal {
  const canonical = parseYbcCanonicalProposal(proposal.id, value);
  assertProposalField(
    proposal,
    "account",
    normalizeAddress(canonical[0]),
    normalizeAddress(proposal.account)
  );
  assertProposalField(
    proposal,
    "proposer",
    normalizeAddress(canonical[1]),
    normalizeAddress(proposal.proposer)
  );
  assertProposalField(proposal, "epoch", canonical[2], BigInt(proposal.epoch));
  assertProposalField(proposal, "addition", canonical[3], proposal.addition);
  assertProposalField(
    proposal,
    "threshold",
    canonical[4],
    BigInt(proposal.thresholdBps)
  );
}

export function assertYbcProposalStatusMatchesFeed(
  proposal: YbcFeedProposal,
  status: number
): void {
  const expected =
    proposal.status === "unknown"
      ? null
      : FEED_STATUS_FLAGS[proposal.status];

  if (expected === null || status !== expected) {
    throw new Error(
      `YBC proposal ${proposal.id} status does not match mainnet.`
    );
  }
}

function parseYbcCanonicalProposal(
  proposalId: number,
  value: unknown
): YbcCanonicalProposal {
  if (
    !Array.isArray(value) ||
    value.length !== 9 ||
    typeof value[0] !== "string" ||
    typeof value[1] !== "string" ||
    typeof value[2] !== "bigint" ||
    typeof value[3] !== "boolean" ||
    typeof value[4] !== "bigint" ||
    typeof value[5] !== "bigint" ||
    typeof value[6] !== "bigint" ||
    typeof value[7] !== "boolean" ||
    typeof value[8] !== "boolean"
  ) {
    throw new Error(
      `YBC proposal ${proposalId} could not be verified on mainnet.`
    );
  }

  return value as unknown as YbcCanonicalProposal;
}

function assertProposalField<T>(
  proposal: YbcFeedProposal,
  field: string,
  actual: T,
  expected: T
): void {
  if (actual !== expected) {
    throw new Error(
      `YBC proposal ${proposal.id} ${field} does not match mainnet.`
    );
  }
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}
