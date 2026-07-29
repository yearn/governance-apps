import { z } from "@/lib/schemas/zod";

export const YBC_FEED_MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
export const YBC_FEED_MAX_MEMBERS = 512;
export const YBC_FEED_MAX_OPERATORS = 64;
export const YBC_FEED_MAX_REWARD_CLAIMERS = 64;
export const YBC_FEED_MAX_PROPOSALS = 512;
export const YBC_FEED_MAX_VOTES = 4_096;
export const YBC_FEED_MAX_REWARD_CLAIMS = 4_096;
export const YBC_FEED_MAX_EVENT_ID_LENGTH = 160;
export const YBC_FEED_MAX_SOURCE_REF_LENGTH = 128;

const UINT256_MAX = (1n << 256n) - 1n;
const zAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const zHash = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const zSafeInteger = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const zPositiveSafeInteger = zSafeInteger.refine((value) => value > 0, {
  message: "Expected a positive safe integer",
});
const zUnixSeconds = zSafeInteger;
const zUint256String = z
  .string()
  .max(78)
  .regex(/^(0|[1-9]\d*)$/)
  .refine(isUint256String, {
    message: "Expected an unsigned 256-bit integer string",
  });
const zEventId = z.string().min(1).max(YBC_FEED_MAX_EVENT_ID_LENGTH);

const YbcFeedMemberSchema = z.object({
  address: zAddress,
  status: z.enum(["active", "removed"]),
  addedAt: zUnixSeconds.nullable(),
  removedAt: zUnixSeconds.nullable(),
  upstreamStaked: zUint256String,
  effectiveWeight: zUint256String,
  weightMaturityBps: z.number().int().min(0).max(10_000),
  maturesAt: zUnixSeconds.nullable(),
  pendingRewards: zUint256String,
});

const YbcFeedProposalSchema = z.object({
  id: zSafeInteger,
  account: zAddress,
  proposer: zAddress,
  epoch: zSafeInteger,
  addition: z.boolean(),
  thresholdBps: z.number().int().min(0).max(10_000),
  votes: zUint256String,
  yea: zUint256String,
  nay: zUint256String,
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
});

const YbcFeedVoteSchema = z.object({
  id: zEventId,
  proposalId: zSafeInteger,
  voter: zAddress,
  weight: zUint256String,
  yea: z.boolean(),
  txHash: zHash,
  blockNumber: zSafeInteger,
  logIndex: zSafeInteger,
  timestamp: zUnixSeconds.nullable(),
});

const YbcFeedRewardClaimSchema = z.object({
  id: zEventId,
  account: zAddress,
  rewards: zUint256String,
  txHash: zHash,
  blockNumber: zSafeInteger,
  logIndex: zSafeInteger,
  timestamp: zUnixSeconds.nullable(),
});

export const YbcFeedSchema = z
  .object({
    version: z.literal(1),
    chainId: z.literal(1),
    generatedAt: zUnixSeconds,
    blockNumber: zSafeInteger,
    blockHash: zHash,
    deployment: z.object({
      genesis: zUnixSeconds,
      deployBlock: zSafeInteger,
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
        ref: z.string().min(1).max(YBC_FEED_MAX_SOURCE_REF_LENGTH),
      }),
    }),
    epoch: z.object({
      current: zSafeInteger,
      lengthSeconds: zPositiveSafeInteger,
      voteLengthSeconds: zPositiveSafeInteger,
      decayLengthSeconds: zPositiveSafeInteger,
      currentStartsAt: zUnixSeconds,
      currentEndsAt: zUnixSeconds,
      votingStartsAt: zUnixSeconds,
      votingEndsAt: zUnixSeconds,
    }),
    config: z.object({
      additionThresholdBps: z.number().int().min(0).max(10_000),
      expulsionThresholdBps: z.number().int().min(0).max(10_000),
      hooks: zAddress.nullable(),
      operators: boundedArray(
        zAddress,
        YBC_FEED_MAX_OPERATORS,
        "operators"
      )
        .refine(hasUniqueNormalizedValues, {
          message: "Operator addresses must be unique",
        }),
      rewardClaimers: boundedArray(
        zAddress,
        YBC_FEED_MAX_REWARD_CLAIMERS,
        "rewardClaimers"
      )
        .refine(hasUniqueNormalizedValues, {
          message: "Reward claimer addresses must be unique",
        }),
      rewardDistributorKilled: z.boolean(),
      rewardClaimFrom: zAddress.nullable(),
    }),
    members: boundedArray(
      YbcFeedMemberSchema,
      YBC_FEED_MAX_MEMBERS,
      "members"
    )
      .refine(
        (members) =>
          hasUniqueNormalizedValues(
            members.map((member) => member.address)
        ),
        { message: "Member addresses must be unique" }
      ),
    proposals: boundedArray(
      YbcFeedProposalSchema,
      YBC_FEED_MAX_PROPOSALS,
      "proposals"
    ),
    votes: boundedArray(
      YbcFeedVoteSchema,
      YBC_FEED_MAX_VOTES,
      "votes"
    ),
    rewards: z.object({
      token: zAddress,
      distributor: zAddress,
      rewardIntegral: zUint256String.nullable(),
      totalPendingRewards: zUint256String,
      claims: boundedArray(
        YbcFeedRewardClaimSchema,
        YBC_FEED_MAX_REWARD_CLAIMS,
        "rewards.claims"
      ),
    }),
    events: z.object({
      firstIndexedBlock: zSafeInteger,
      lastIndexedBlock: zSafeInteger,
      activeMemberCount: zSafeInteger,
      removedMemberCount: zSafeInteger,
      proposalCount: zSafeInteger.max(YBC_FEED_MAX_PROPOSALS),
      voteCount: zSafeInteger.max(YBC_FEED_MAX_VOTES),
      rewardClaimCount: zSafeInteger.max(YBC_FEED_MAX_REWARD_CLAIMS),
    }),
  })
  .superRefine((feed, context) => {
    const proposalIds = new Set(feed.proposals.map((proposal) => proposal.id));
    if (
      proposalIds.size !== feed.proposals.length ||
      feed.proposals.length !== feed.events.proposalCount
    ) {
      addIssue(
        context,
        ["proposals"],
        "Proposal IDs must be unique and match proposalCount"
      );
    } else {
      for (let id = 0; id < feed.events.proposalCount; id += 1) {
        if (!proposalIds.has(id)) {
          addIssue(
            context,
            ["proposals"],
            "Proposal IDs must contain the complete canonical range"
          );
          break;
        }
      }
    }

    if (
      feed.events.activeMemberCount !==
        feed.members.filter((member) => member.status === "active").length ||
      feed.events.removedMemberCount !==
        feed.members.filter((member) => member.status === "removed").length
    ) {
      addIssue(
        context,
        ["events"],
        "Member event counts must match the member records"
      );
    }

    if (feed.events.voteCount !== feed.votes.length) {
      addIssue(
        context,
        ["votes"],
        "voteCount must match the vote records"
      );
    }
    if (feed.events.rewardClaimCount !== feed.rewards.claims.length) {
      addIssue(
        context,
        ["rewards", "claims"],
        "rewardClaimCount must match the reward claim records"
      );
    }

    assertUniqueEvents(feed.votes, context, ["votes"], "vote");
    assertUniqueEvents(
      feed.rewards.claims,
      context,
      ["rewards", "claims"],
      "reward claim"
    );

    for (const [index, vote] of feed.votes.entries()) {
      if (!proposalIds.has(vote.proposalId)) {
        addIssue(
          context,
          ["votes", index, "proposalId"],
          "Vote references an unknown proposal"
        );
      }
    }
  });

export type YbcFeed = z.infer<typeof YbcFeedSchema>;
export type YbcFeedMember = YbcFeed["members"][number];
export type YbcFeedProposal = YbcFeed["proposals"][number];

function hasUniqueNormalizedValues(values: string[]): boolean {
  return new Set(values.map((value) => value.toLowerCase())).size ===
    values.length;
}

function isUint256String(value: string): boolean {
  if (!/^(0|[1-9]\d*)$/.test(value)) return false;
  try {
    return BigInt(value) <= UINT256_MAX;
  } catch {
    return false;
  }
}

function boundedArray<T extends z.ZodType>(
  itemSchema: T,
  maximumLength: number,
  fieldName: string
) {
  return z
    .custom<unknown[]>(
      (value) =>
        Array.isArray(value) && value.length <= maximumLength,
      {
        message: `${fieldName} must be an array with at most ${maximumLength} items`,
      }
    )
    .pipe(z.array(itemSchema));
}

function assertUniqueEvents(
  events: Array<{
    id: string;
    txHash: string;
    logIndex: number;
  }>,
  context: z.core.$RefinementCtx<unknown>,
  path: PropertyKey[],
  label: string
): void {
  const ids = new Set<string>();
  const logCoordinates = new Set<string>();

  for (const event of events) {
    const normalizedId = event.id.toLowerCase();
    const coordinate = `${event.txHash.toLowerCase()}:${event.logIndex}`;
    if (ids.has(normalizedId) || logCoordinates.has(coordinate)) {
      addIssue(
        context,
        path,
        `${label} IDs and transaction log coordinates must be unique`
      );
      return;
    }
    ids.add(normalizedId);
    logCoordinates.add(coordinate);
  }
}

function addIssue(
  context: z.core.$RefinementCtx<unknown>,
  path: PropertyKey[],
  message: string
): void {
  context.addIssue({
    code: "custom",
    message,
    path,
  });
}
