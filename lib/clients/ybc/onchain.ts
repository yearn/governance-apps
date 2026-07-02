import { formatUnits, isAddress, type Address, type PublicClient } from "viem";
import { YbcAbi } from "@/lib/abis/Ybc";
import { YbcElectionAbi } from "@/lib/abis/YbcElection";
import { YbcWeightAggregatorAbi } from "@/lib/abis/YbcWeightAggregator";
import { assertMainnetAccount, MAINNET_CHAIN_ID } from "@/lib/tx/network";
import type { PreparedTransaction } from "@/lib/tx/types";
import type { YbcClient, YbcPageState } from "./client";
import type {
  YbcAdminRecord,
  YbcMemberRecord,
  YbcMemberStatus,
  YbcMockDataV1,
  YbcProposalOutcome,
  YbcProposalPhase,
  YbcProposalRecord,
  YbcProposalType,
  YbcScenarioId,
  YbcVoteChoice,
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
const YBC_PROPOSAL_STATUS = {
  PROPOSED: 1,
  RETRACTED: 2,
  VOTING: 4,
  PASSED: 8,
  FAILED: 16,
  EXECUTED: 32,
  EXPIRED: 64,
  INVALID: 128,
} as const;

type YbcProposalStatusFlag =
  (typeof YBC_PROPOSAL_STATUS)[keyof typeof YBC_PROPOSAL_STATUS];

export type YbcWalletOverlay = {
  isMember: boolean | null;
  isOperator: boolean | null;
  staked: bigint | null;
  weight: bigint | null;
  proposalStatusById: Record<number, YbcProposalStatusFlag | null>;
  votedByProposalId: Record<number, boolean | null>;
};

type YbcMapOptions = {
  walletChainId?: number | null;
  walletOverlay?: YbcWalletOverlay | null;
};

type YbcProposalActionContext = {
  account: Address | null;
  normalizedAccount: string | null;
  currentEpoch: number;
  isActiveMember: boolean;
  isMainnetAccount: boolean;
  effectiveWeightRaw: bigint;
  votedByProposalId: Record<number, boolean | null>;
  proposalStatusById: Record<number, YbcProposalStatusFlag | null>;
  feedVotes: YbcFeed["votes"];
};

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

  async preparePropose(
    type: YbcProposalType,
    target: Address
  ): Promise<PreparedTransaction> {
    assertValidYbcProposalTarget(this.feed, target);

    if (type === "addition") {
      return async () => {
        const { getAccount, simulateThenWrite, wagmiConfig } =
          await getYbcWriteRuntime();
        const account = getAccount(wagmiConfig);
        const address = assertMainnetAccount(account);
        const request = {
          address: this.feed.deployment.ybcElection as Address,
          abi: YbcElectionAbi,
          functionName: "propose_addition",
          args: [target] as const,
          account: address,
          chainId: MAINNET_CHAIN_ID,
        };
        return simulateThenWrite(request, request, "YBC propose addition");
      };
    }

    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getYbcWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: this.feed.deployment.ybcElection as Address,
        abi: YbcElectionAbi,
        functionName: "propose_expulsion",
        args: [target] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "YBC propose expulsion");
    };
  }

  async prepareRetract(proposalId: bigint): Promise<PreparedTransaction> {
    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getYbcWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: this.feed.deployment.ybcElection as Address,
        abi: YbcElectionAbi,
        functionName: "retract",
        args: [proposalId] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "YBC retract proposal");
    };
  }

  async prepareVote(
    proposalId: bigint,
    choice: YbcVoteChoice
  ): Promise<PreparedTransaction> {
    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getYbcWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: this.feed.deployment.ybcElection as Address,
        abi: YbcElectionAbi,
        functionName: choice === "yea" ? "vote_yea" : "vote_nay",
        args: [proposalId] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, `YBC vote ${choice}`);
    };
  }

  async prepareExecute(proposalId: bigint): Promise<PreparedTransaction> {
    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getYbcWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: this.feed.deployment.ybcElection as Address,
        abi: YbcElectionAbi,
        functionName: "execute",
        args: [proposalId] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "YBC execute proposal");
    };
  }
}

async function getYbcWriteRuntime() {
  const [{ getAccount }, { simulateThenWrite }, { wagmiConfig }] =
    await Promise.all([
      import("wagmi/actions"),
      import("@/lib/tx/simulateWrite"),
      import("@/web3/wagmi"),
    ]);

  return {
    getAccount,
    simulateThenWrite,
    wagmiConfig,
  };
}

export function mapYbcFeedToPageState(
  feed: YbcFeed,
  account: Address | null = null,
  options: YbcMapOptions = {}
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
  const feedActiveMember =
    currentMember?.status !== "removed" && currentMember !== null;
  const isActiveMember = options.walletOverlay?.isMember ?? feedActiveMember;
  const isMainnetAccount =
    normalizedAccount !== null &&
    (options.walletChainId === undefined ||
      options.walletChainId === MAINNET_CHAIN_ID);
  const operatorAddresses = new Set(feed.config.operators.map(normalizeAddress));
  const isOperator =
    options.walletOverlay?.isOperator ??
    (normalizedAccount !== null && operatorAddresses.has(normalizedAccount));
  const effectiveWeightRaw =
    options.walletOverlay?.weight ??
    BigInt(feedMemberForAddress(feed, account)?.effectiveWeight ?? "0");
  const proposals = feed.proposals.map((proposal) =>
    mapProposal(feed, proposal, {
      account,
      normalizedAccount,
      currentEpoch: feed.epoch.current,
      isActiveMember,
      isMainnetAccount,
      effectiveWeightRaw,
      votedByProposalId: options.walletOverlay?.votedByProposalId ?? {},
      proposalStatusById: options.walletOverlay?.proposalStatusById ?? {},
      feedVotes: feed.votes,
    })
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
  const meWeight =
    currentMember && options.walletOverlay?.weight !== undefined
      ? {
          ...currentMember.weight,
          rawStaked:
            options.walletOverlay.staked === null
              ? currentMember.weight.rawStaked
              : fromBaseUnits(options.walletOverlay.staked.toString()),
          effectiveWeight:
            options.walletOverlay.weight === null
              ? currentMember.weight.effectiveWeight
              : fromBaseUnits(options.walletOverlay.weight.toString()),
        }
      : currentMember?.weight ?? ZERO_WEIGHT;
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
      canPropose: isActiveMember && isMainnetAccount,
      canVote:
        isActiveMember && isMainnetAccount && effectiveWeightRaw > 0n,
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

function mapProposal(
  feed: YbcFeed,
  proposal: YbcFeedProposal,
  context: YbcProposalActionContext
): YbcProposalRecord {
  const phase = mapProposalPhase(proposal, context.proposalStatusById[proposal.id]);
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
      ...deriveProposalActions(proposal, phase, context),
    },
  };
}

function mapProposalPhase(
  proposal: YbcFeedProposal,
  statusFlag: YbcProposalStatusFlag | null | undefined
): YbcProposalPhase {
  if (statusFlag !== null && statusFlag !== undefined) {
    return mapStatusFlagToProposalPhase(statusFlag);
  }

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

function mapStatusFlagToProposalPhase(
  statusFlag: YbcProposalStatusFlag
): YbcProposalPhase {
  switch (statusFlag) {
    case YBC_PROPOSAL_STATUS.PROPOSED:
      return "discussion";
    case YBC_PROPOSAL_STATUS.RETRACTED:
      return "retracted";
    case YBC_PROPOSAL_STATUS.VOTING:
      return "voting";
    case YBC_PROPOSAL_STATUS.PASSED:
      return "awaiting-execution";
    case YBC_PROPOSAL_STATUS.EXECUTED:
      return "executed";
    case YBC_PROPOSAL_STATUS.EXPIRED:
      return "expired";
    case YBC_PROPOSAL_STATUS.FAILED:
    case YBC_PROPOSAL_STATUS.INVALID:
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

function deriveProposalActions(
  proposal: YbcFeedProposal,
  phase: YbcProposalPhase,
  context: YbcProposalActionContext
): YbcProposalRecord["actions"] {
  if (!context.account || !context.normalizedAccount) {
    return {
      canRetract: false,
      canVote: false,
      canExecute: false,
      nextAction: "none",
      disabledReason: "Connect a wallet to act on this proposal.",
    };
  }

  if (!context.isMainnetAccount) {
    return {
      canRetract: false,
      canVote: false,
      canExecute: false,
      nextAction: "none",
      disabledReason: "Switch to Ethereum Mainnet to act on this proposal.",
    };
  }

  if (TERMINAL_PHASES.has(phase)) {
    return {
      canRetract: false,
      canVote: false,
      canExecute: false,
      nextAction: "none",
      disabledReason: "This proposal is terminal.",
    };
  }

  if (phase === "discussion") {
    const isProposer =
      normalizeAddress(proposal.proposer) === context.normalizedAccount;
    const canRetract = isProposer && proposal.epoch > context.currentEpoch;

    return {
      canRetract,
      canVote: false,
      canExecute: false,
      nextAction: canRetract ? "retract" : "none",
      disabledReason: canRetract
        ? null
        : isProposer
          ? "The retract window has closed."
          : "Only the proposer can retract during discussion.",
    };
  }

  if (phase === "voting") {
    const hasVoted = getHasVoted(proposal.id, context);
    const isOwnExpulsion =
      !proposal.addition &&
      normalizeAddress(proposal.account) === context.normalizedAccount;

    if (!context.isActiveMember) {
      return {
        canRetract: false,
        canVote: false,
        canExecute: false,
        nextAction: "none",
        disabledReason: "Only current YBC members can vote.",
      };
    }

    if (isOwnExpulsion) {
      return {
        canRetract: false,
        canVote: false,
        canExecute: false,
        nextAction: "none",
        disabledReason: "Members cannot vote on their own expulsion.",
      };
    }

    if (hasVoted) {
      return {
        canRetract: false,
        canVote: false,
        canExecute: false,
        nextAction: "none",
        disabledReason: "This wallet has already voted.",
      };
    }

    if (context.effectiveWeightRaw <= 0n) {
      return {
        canRetract: false,
        canVote: false,
        canExecute: false,
        nextAction: "none",
        disabledReason: "This wallet has no live voting weight.",
      };
    }

    return {
      canRetract: false,
      canVote: true,
      canExecute: false,
      nextAction: "vote",
      disabledReason: null,
    };
  }

  if (phase === "awaiting-execution") {
    return {
      canRetract: false,
      canVote: false,
      canExecute: true,
      nextAction: "execute",
      disabledReason: null,
    };
  }

  return {
    canRetract: false,
    canVote: false,
    canExecute: false,
    nextAction: "none",
    disabledReason: "No proposal action is currently available.",
  };
}

function getHasVoted(
  proposalId: number,
  context: YbcProposalActionContext
): boolean {
  const overlayVote = context.votedByProposalId[proposalId];
  if (overlayVote !== null && overlayVote !== undefined) {
    return overlayVote;
  }

  if (!context.normalizedAccount) {
    return false;
  }

  return context.feedVotes.some(
    (vote) =>
      vote.proposalId === proposalId &&
      normalizeAddress(vote.voter) === context.normalizedAccount
  );
}

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

export function parseYbcProposalContractId(proposalId: string): bigint {
  const match = /^YBC-(\d+)$/.exec(proposalId);
  if (!match) {
    throw new Error(`Invalid YBC proposal id: ${proposalId}`);
  }
  return BigInt(match[1]);
}

export async function readYbcWalletOverlay(
  publicClient: PublicClient,
  feed: YbcFeed,
  account: Address
): Promise<YbcWalletOverlay> {
  const ybc = feed.deployment.ybc as Address;
  const election = feed.deployment.ybcElection as Address;
  const weightAggregator = feed.deployment.ybcWeightAggregator as Address;

  const [isMember, isOperator, staked, weight] = await Promise.all([
    readContractOrNull(publicClient, {
      address: ybc,
      abi: YbcAbi,
      functionName: "members",
      args: [account] as const,
    }),
    readContractOrNull(publicClient, {
      address: ybc,
      abi: YbcAbi,
      functionName: "operators",
      args: [account] as const,
    }),
    readContractOrNull(publicClient, {
      address: weightAggregator,
      abi: YbcWeightAggregatorAbi,
      functionName: "staked",
      args: [account] as const,
    }),
    readContractOrNull(publicClient, {
      address: weightAggregator,
      abi: YbcWeightAggregatorAbi,
      functionName: "weight",
      args: [account] as const,
    }),
  ]);
  const proposalEntries = await Promise.all(
    feed.proposals.map(async (proposal) => {
      const proposalId = BigInt(proposal.id);
      const [status, voted] = await Promise.all([
        readContractOrNull(publicClient, {
          address: election,
          abi: YbcElectionAbi,
          functionName: "status",
          args: [proposalId] as const,
        }),
        readContractOrNull(publicClient, {
          address: election,
          abi: YbcElectionAbi,
          functionName: "voted",
          args: [account, proposalId] as const,
        }),
      ]);

      return {
        proposalId: proposal.id,
        status: coerceProposalStatus(status),
        voted: typeof voted === "boolean" ? voted : null,
      };
    })
  );

  return {
    isMember: typeof isMember === "boolean" ? isMember : null,
    isOperator: typeof isOperator === "boolean" ? isOperator : null,
    staked: typeof staked === "bigint" ? staked : null,
    weight: typeof weight === "bigint" ? weight : null,
    proposalStatusById: Object.fromEntries(
      proposalEntries.map((entry) => [entry.proposalId, entry.status])
    ),
    votedByProposalId: Object.fromEntries(
      proposalEntries.map((entry) => [entry.proposalId, entry.voted])
    ),
  };
}

async function readContractOrNull<
  const TParameters extends Parameters<PublicClient["readContract"]>[0],
>(
  publicClient: PublicClient,
  parameters: TParameters
): Promise<Awaited<ReturnType<PublicClient["readContract"]>> | null> {
  try {
    return await publicClient.readContract(parameters);
  } catch (error) {
    console.warn("[ybc] wallet overlay read failed", error);
    return null;
  }
}

function coerceProposalStatus(
  value: Awaited<ReturnType<PublicClient["readContract"]>> | null
): YbcProposalStatusFlag | null {
  const status =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "number"
        ? value
        : null;

  if (status === null) {
    return null;
  }

  return Object.values(YBC_PROPOSAL_STATUS).includes(
    status as YbcProposalStatusFlag
  )
    ? (status as YbcProposalStatusFlag)
    : null;
}

function assertValidYbcProposalTarget(feed: YbcFeed, target: Address) {
  if (!isAddress(target)) {
    throw new Error("Invalid YBC proposal target address.");
  }

  if (normalizeAddress(target) === ZERO_ADDRESS) {
    throw new Error("YBC proposal target cannot be the zero address.");
  }

  if (normalizeAddress(target) === normalizeAddress(feed.deployment.ybc)) {
    throw new Error("YBC proposal target cannot be the YBC contract.");
  }
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
