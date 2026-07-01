import { z } from "@/lib/schemas/zod";

const zAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const zHash = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const zIntegerString = z.string().regex(/^(0|[1-9]\d*)$/);
const zUnixSeconds = z.number().int().nonnegative();

export const YbcFeedSchema = z.object({
  version: z.literal(1),
  chainId: z.literal(1),
  generatedAt: zUnixSeconds,
  blockNumber: z.number().int().nonnegative(),
  blockHash: zHash,
  deployment: z.object({
    genesis: zUnixSeconds,
    deployBlock: z.number().int().nonnegative(),
    ybc: zAddress,
    ybcElection: zAddress,
    ybcWeightAggregator: zAddress,
    ybcRewardDistributor: zAddress,
    ybcBonusRecipient: zAddress,
    upstreamWeightAggregator: zAddress,
    rewardToken: zAddress,
    rewardClaimer: zAddress,
    multicall3: zAddress,
    source: z.object({
      repo: z.literal("styfi"),
      ref: z.string().min(1),
    }),
  }),
  epoch: z.object({
    current: z.number().int().nonnegative(),
    lengthSeconds: z.number().int().positive(),
    voteLengthSeconds: z.number().int().positive(),
    decayLengthSeconds: z.number().int().positive(),
    currentStartsAt: zUnixSeconds,
    currentEndsAt: zUnixSeconds,
    votingStartsAt: zUnixSeconds,
    votingEndsAt: zUnixSeconds,
  }),
  config: z.object({
    additionThresholdBps: z.number().int().min(0).max(10_000),
    expulsionThresholdBps: z.number().int().min(0).max(10_000),
    hooks: zAddress.nullable(),
    operators: z.array(zAddress),
    rewardClaimers: z.array(zAddress),
    rewardDistributorKilled: z.boolean(),
    rewardClaimFrom: zAddress.nullable(),
  }),
  members: z.array(
    z.object({
      address: zAddress,
      status: z.enum(["active", "removed"]),
      addedAt: zUnixSeconds.nullable(),
      removedAt: zUnixSeconds.nullable(),
      upstreamStaked: zIntegerString,
      effectiveWeight: zIntegerString,
      weightMaturityBps: z.number().int().min(0).max(10_000),
      maturesAt: zUnixSeconds.nullable(),
      pendingRewards: zIntegerString,
    })
  ),
  proposals: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      account: zAddress,
      proposer: zAddress,
      epoch: z.number().int().nonnegative(),
      addition: z.boolean(),
      thresholdBps: z.number().int().min(0).max(10_000),
      votes: zIntegerString,
      yea: zIntegerString,
      nay: zIntegerString,
      status: z.enum([
        "proposed",
        "voting",
        "passed",
        "failed",
        "expired",
        "executed",
        "retracted",
        "unknown",
      ]),
      retracted: z.boolean(),
      executed: z.boolean(),
      proposedAt: zUnixSeconds.nullable(),
      votingStartsAt: zUnixSeconds,
      votingEndsAt: zUnixSeconds,
      executableStartsAt: zUnixSeconds,
      expiresAt: zUnixSeconds,
    })
  ),
  votes: z.array(
    z.object({
      id: z.string().min(1),
      proposalId: z.number().int().nonnegative(),
      voter: zAddress,
      weight: zIntegerString,
      yea: z.boolean(),
      txHash: zHash,
      blockNumber: z.number().int().nonnegative(),
      logIndex: z.number().int().nonnegative(),
      timestamp: zUnixSeconds.nullable(),
    })
  ),
  rewards: z.object({
    token: zAddress,
    distributor: zAddress,
    rewardIntegral: zIntegerString.nullable(),
    totalPendingRewards: zIntegerString,
    claims: z.array(
      z.object({
        id: z.string().min(1),
        account: zAddress,
        rewards: zIntegerString,
        txHash: zHash,
        blockNumber: z.number().int().nonnegative(),
        logIndex: z.number().int().nonnegative(),
        timestamp: zUnixSeconds.nullable(),
      })
    ),
  }),
  events: z.object({
    firstIndexedBlock: z.number().int().nonnegative(),
    lastIndexedBlock: z.number().int().nonnegative(),
    activeMemberCount: z.number().int().nonnegative(),
    removedMemberCount: z.number().int().nonnegative(),
    proposalCount: z.number().int().nonnegative(),
    voteCount: z.number().int().nonnegative(),
    rewardClaimCount: z.number().int().nonnegative(),
  }),
});

export type YbcFeed = z.infer<typeof YbcFeedSchema>;
export type YbcFeedMember = YbcFeed["members"][number];
export type YbcFeedProposal = YbcFeed["proposals"][number];
