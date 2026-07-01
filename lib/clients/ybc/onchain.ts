import { formatUnits, type Address } from "viem";
import type { YbcClient, YbcPageState } from "./client";
import type {
  YbcAdminRecord,
  YbcMemberRecord,
  YbcMemberStatus,
  YbcMockDataV1,
  YbcProposalOutcome,
  YbcProposalPhase,
  YbcProposalRecord,
  YbcScenarioId,
  YbcWeightRecord,
} from "./types";
import type {
  YbcFeed,
  YbcFeedMember,
  YbcFeedProposal,
} from "@/lib/schemas/ybc-feed";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const ZERO_WEIGHT: YbcWeightRecord = {
  rawStaked: "0",
  effectiveWeight: "0",
  targetWeight: "0",
  maturityBps: 10_000,
  maturesAt: null,
};
const TERMINAL_PHASES = new Set<YbcProposalPhase>([
  "executed",
  "expired",
  "failed",
  "retracted",
]);

export class OnchainYbcClient implements YbcClient {
  constructor(
    private readonly feed: YbcFeed,
    private readonly account: Address | null = null
  ) {}

  resolveDefaultScenario(address?: Address | null): YbcScenarioId {
    const member = feedMemberForAddress(this.feed, address ?? null);
    if (!member || member.status === "removed") return "observer";

    const weight = mapWeight(member);
    return mapMemberStatus(member, weight) === "ramping"
      ? "member-ramping"
      : "member-matured";
  }

  async getPageState(): Promise<YbcPageState> {
    return mapYbcFeedToPageState(this.feed, this.account);
  }
}

export function mapYbcFeedToPageState(
  feed: YbcFeed,
  account: Address | null = null
): YbcPageState {
  const normalizedAccount = account ? normalizeAddress(account) : null;
  const members = feed.members.map((member) => mapMember(feed, member));
  const currentMember =
    normalizedAccount === null
      ? null
      : members.find(
          (member) => normalizeAddress(member.address) === normalizedAccount
        ) ?? null;
  const currentFeedMember = feedMemberForAddress(feed, account);
  const isActiveMember = currentMember?.status !== "removed" && currentMember !== null;
  const operatorAddresses = new Set(feed.config.operators.map(normalizeAddress));
  const isOperator =
    normalizedAccount !== null && operatorAddresses.has(normalizedAccount);
  const proposals = feed.proposals.map((proposal) =>
    mapProposal(feed, proposal)
  );
  const activeProposalCount = proposals.filter(
    (proposal) => proposal.phase === "discussion" || proposal.phase === "voting"
  ).length;
  const awaitingExecutionCount = proposals.filter(
    (proposal) => proposal.phase === "awaiting-execution"
  ).length;
  const terminalCount = proposals.filter((proposal) =>
    TERMINAL_PHASES.has(proposal.phase)
  ).length;
  const meWeight = currentMember?.weight ?? ZERO_WEIGHT;
  const pendingRewards = currentMember
    ? currentMember.weight.rawStaked === "0"
      ? "0"
      : fromBaseUnits(
          currentFeedMember?.pendingRewards ?? "0"
        )
    : "0";
  const effectiveWeightTotal = sumDisplayAmounts(
    members.map((member) => member.weight.effectiveWeight)
  );

  const data: YbcMockDataV1 = {
    version: 1,
    generatedAt: feed.generatedAt,
    asOf: feed.generatedAt,
    epoch: {
      current: feed.epoch.current,
      startsAt: feed.epoch.currentStartsAt,
      endsAt: feed.epoch.currentEndsAt,
    },
    hero: {
      collectiveAddress: feed.deployment.ybc as Address,
      memberCount: members.filter((member) => member.status !== "removed").length,
      internalWeight: effectiveWeightTotal,
      delegatedWeight: "0",
      totalInfluence: effectiveWeightTotal,
      currentEpoch: feed.epoch.current,
      activeProposalCount,
      awaitingExecutionCount,
    },
    me: {
      address: account,
      isMember: isActiveMember,
      isOperator,
      canPropose: isActiveMember,
      canVote:
        isActiveMember && BigInt(feedMemberForAddress(feed, account)?.effectiveWeight ?? "0") > 0n,
      weight: meWeight,
      pendingRewards,
    },
    roster: {
      totals: {
        rawStaked: sumDisplayAmounts(
          members.map((member) => member.weight.rawStaked)
        ),
        effectiveWeight: effectiveWeightTotal,
        targetWeight: sumDisplayAmounts(
          members.map((member) => member.weight.targetWeight)
        ),
        rampingMemberCount: members.filter(
          (member) =>
            member.status === "ramping" && Number(member.weight.targetWeight) > 0
        ).length,
      },
      members,
    },
    proposals: {
      summary: {
        activeCount: activeProposalCount,
        awaitingExecutionCount,
        terminalCount,
      },
      items: proposals,
    },
    rewards: mapRewards(
      feed,
      pendingRewards,
      currentFeedMember?.pendingRewards ?? "0",
      isActiveMember
    ),
    admin: mapAdmin(feed, isOperator),
  };

  return {
    scenarioId: isOperator
      ? "operator-admin"
      : currentMember?.status === "ramping"
        ? "member-ramping"
      : isActiveMember
        ? "member-matured"
        : "observer",
    label: "YBC feed",
    data,
  };
}

function mapMember(feed: YbcFeed, member: YbcFeedMember): YbcMemberRecord {
  const weight = mapWeight(member);

  return {
    address: member.address as Address,
    ens: null,
    status: mapMemberStatus(member, weight),
    joinedAt: member.addedAt ?? feed.generatedAt,
    weight,
    sources: {
      stYFI: weight.rawStaked,
      stYFIx: "0",
      migratedVeYfi: "0",
    },
  };
}

function mapWeight(member: YbcFeedMember): YbcWeightRecord {
  const targetRaw = BigInt(member.upstreamStaked);
  const effectiveRaw = BigInt(member.effectiveWeight);
  const maturityBps =
    targetRaw === 0n
      ? 10_000
      : member.weightMaturityBps > 0
        ? member.weightMaturityBps
        : Number((effectiveRaw * 10_000n) / targetRaw);

  return {
    rawStaked: fromBaseUnits(member.upstreamStaked),
    effectiveWeight: fromBaseUnits(member.effectiveWeight),
    targetWeight: fromBaseUnits(member.upstreamStaked),
    maturityBps: clampBps(maturityBps),
    maturesAt: member.maturesAt,
  };
}

function mapMemberStatus(
  member: YbcFeedMember,
  weight: YbcWeightRecord
): YbcMemberStatus {
  if (member.status === "removed") return "removed";
  if (Number(weight.targetWeight) > 0 && weight.maturityBps < 10_000) {
    return "ramping";
  }
  return "active";
}

function mapProposal(feed: YbcFeed, proposal: YbcFeedProposal): YbcProposalRecord {
  const phase = mapProposalPhase(proposal);
  const outcome = mapProposalOutcome(phase, proposal);
  const createdAt =
    proposal.proposedAt ??
    Math.max(0, proposal.votingStartsAt - feed.epoch.voteLengthSeconds);

  return {
    id: `YBC-${proposal.id}`,
    type: proposal.addition ? "addition" : "expulsion",
    targetAccount: proposal.account as Address,
    proposer: proposal.proposer as Address,
    epoch: proposal.epoch,
    phase,
    outcome,
    thresholdBps: proposal.thresholdBps,
    votes: {
      total: fromBaseUnits(proposal.votes),
      yea: fromBaseUnits(proposal.yea),
      nay: fromBaseUnits(proposal.nay),
    },
    timing: {
      createdAt,
      discussionStartsAt: createdAt,
      votingStartsAt: proposal.votingStartsAt,
      votingEndsAt: proposal.votingEndsAt,
      executionOpensAt: proposal.executableStartsAt,
      expiresAt: proposal.expiresAt,
      ...(proposal.executed ? { executedAt: feed.generatedAt } : {}),
    },
    actions: {
      canRetract: false,
      canVote: false,
      canExecute: false,
      nextAction: "none",
      disabledReason: getFeedWriteDisabledReason(phase),
    },
  };
}

function mapProposalPhase(proposal: YbcFeedProposal): YbcProposalPhase {
  if (proposal.executed) return "executed";
  if (proposal.retracted) return "retracted";

  switch (proposal.status) {
    case "proposed":
      return "discussion";
    case "voting":
      return "voting";
    case "passed":
      return "awaiting-execution";
    case "executed":
      return "executed";
    case "expired":
      return "expired";
    case "failed":
      return "failed";
    case "retracted":
      return "retracted";
    case "unknown":
      return "failed";
  }
}

function mapProposalOutcome(
  phase: YbcProposalPhase,
  proposal: YbcFeedProposal
): YbcProposalOutcome {
  if (phase === "awaiting-execution" || phase === "executed" || phase === "expired") {
    return "passed";
  }
  if (phase === "failed" || phase === "retracted") {
    return "failed";
  }
  if (BigInt(proposal.votes) === 0n) {
    return "pending";
  }
  return BigInt(proposal.yea) * 10_000n >=
    BigInt(proposal.votes) * BigInt(proposal.thresholdBps)
    ? "passing"
    : "failing";
}

function mapRewards(
  feed: YbcFeed,
  pendingRewards: string,
  pendingRewardsRaw: string,
  isActiveMember: boolean
): YbcMockDataV1["rewards"] {
  return {
    token: {
      symbol: "YFI",
      address: feed.rewards.token as Address,
      decimals: 18,
    },
    claimable: pendingRewards,
    accruing: fromBaseUnits(feed.rewards.totalPendingRewards),
    lastUpdatedAt: feed.generatedAt,
    claim: {
      mode: "shared-claim-surface",
      href: "/styfi",
      ctaLabel: "Open shared rewards",
      disabledReason: isActiveMember
        ? BigInt(pendingRewardsRaw) > 0n
          ? null
          : "No YBC rewards are claimable yet."
        : "Connect a member wallet to view claimable rewards.",
    },
    periods: [],
  };
}

function mapAdmin(feed: YbcFeed, isOperator: boolean): YbcAdminRecord {
  return {
    isOperator,
    operators: feed.config.operators.map((operator) => ({
      address: operator as Address,
      ens: null,
      role: "operator",
    })),
    thresholds: {
      additionBps: feed.config.additionThresholdBps,
      expulsionBps: feed.config.expulsionThresholdBps,
    },
    hooks: {
      membershipHook: (feed.config.hooks ?? ZERO_ADDRESS) as Address,
      rewardsDistributor: feed.deployment.ybcRewardDistributor as Address,
      bonusRecipient: feed.deployment.ybcBonusRecipient as Address,
    },
    scopedOperations: [
      {
        id: "add-member",
        label: "Add member",
        enabled: false,
      },
      {
        id: "remove-member",
        label: "Remove member",
        enabled: false,
      },
    ],
    rewardStatus: {
      distributorFunded: !feed.config.rewardDistributorKilled,
      lastSyncedAt: feed.generatedAt,
    },
  };
}

function feedMemberForAddress(
  feed: YbcFeed,
  account: Address | null | undefined
) {
  if (!account) return null;
  const normalized = normalizeAddress(account);
  return (
    feed.members.find((member) => normalizeAddress(member.address) === normalized) ??
    null
  );
}

function getFeedWriteDisabledReason(phase: YbcProposalPhase) {
  if (TERMINAL_PHASES.has(phase)) {
    return "This proposal is terminal.";
  }
  return "YBC writes are disabled until fork smoke validation is complete.";
}

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function fromBaseUnits(value: string) {
  const formatted = formatUnits(BigInt(value), 18);
  return trimDecimal(formatted, 4);
}

function trimDecimal(value: string, fractionDigits: number) {
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length === 0) return whole ?? "0";

  const trimmedFraction = fraction.slice(0, fractionDigits).replace(/0+$/, "");
  return trimmedFraction.length > 0 ? `${whole}.${trimmedFraction}` : whole ?? "0";
}

function sumDisplayAmounts(values: string[]) {
  const sum = values.reduce((total, value) => total + Number(value), 0);
  return Number.isFinite(sum) ? trimDecimal(String(sum), 4) : "0";
}

function clampBps(value: number) {
  return Math.min(Math.max(value, 0), 10_000);
}
