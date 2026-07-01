import { z } from "@/lib/schemas/zod";

const zAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const zHash = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const zIntegerString = z.string().regex(/^(0|[1-9]\d*)$/);
const zUnixSeconds = z.number().int().nonnegative();

const TeamsFinancialsSchema = z.object({
  revenueUsd: zIntegerString,
  costUsd: zIntegerString,
  profitUsd: zIntegerString,
  lossUsd: zIntegerString,
});

const TeamsRevenueDepositSchema = z.object({
  id: z.string().min(1),
  team: zAddress,
  period: z.number().int().nonnegative(),
  token: zAddress,
  amount: zIntegerString,
  revenueUsd: zIntegerString,
  depositor: zAddress,
  txHash: zHash,
  blockNumber: z.number().int().nonnegative(),
  logIndex: z.number().int().nonnegative(),
  timestamp: zUnixSeconds.nullable(),
});

const TeamsBonusParametersSchema = z.object({
  period: z.number().int().nonnegative(),
  bonusFactorBps: z.number().int().min(0).max(100_000),
  ybcSplitBps: z.number().int().min(0).max(10_000),
  bonusPriceUsd: zIntegerString,
});

const TeamsBonusPeriodSchema = z.object({
  period: z.number().int().nonnegative(),
  status: z.enum([
    "unfinalized",
    "claimable",
    "claimed",
    "not_profitable",
    "unavailable",
  ]),
  claimableYfi: zIntegerString,
  ybcAmountYfi: zIntegerString,
  teamAmountYfi: zIntegerString,
  parameters: TeamsBonusParametersSchema.nullable(),
});

const TeamsTeamPeriodSchema = z.object({
  period: z.number().int().nonnegative(),
  startsAt: zUnixSeconds,
  endsAt: zUnixSeconds,
  financials: TeamsFinancialsSchema,
  revenueDeposits: z.array(TeamsRevenueDepositSchema),
  fundingApprovalIds: z.array(z.number().int().nonnegative()),
  bonus: TeamsBonusPeriodSchema.nullable(),
});

const TeamsFundingClaimSchema = z.object({
  id: z.string().min(1),
  approvalId: z.number().int().nonnegative(),
  team: zAddress,
  period: z.number().int().nonnegative(),
  token: zAddress,
  amount: zIntegerString,
  costUsd: zIntegerString,
  vest: zAddress.nullable(),
  recipient: zAddress,
  txHash: zHash,
  blockNumber: z.number().int().nonnegative(),
  logIndex: z.number().int().nonnegative(),
  timestamp: zUnixSeconds.nullable(),
});

const TeamsFundingReturnSchema = z.object({
  id: z.string().min(1),
  approvalId: z.number().int().nonnegative(),
  team: zAddress,
  period: z.number().int().nonnegative(),
  token: zAddress,
  amount: zIntegerString,
  refundUsd: zIntegerString,
  sender: zAddress,
  txHash: zHash,
  blockNumber: z.number().int().nonnegative(),
  logIndex: z.number().int().nonnegative(),
  timestamp: zUnixSeconds.nullable(),
});

export const TeamsFeedSchema = z.object({
  version: z.literal(1),
  chainId: z.literal(1),
  generatedAt: zUnixSeconds,
  blockNumber: z.number().int().nonnegative(),
  blockHash: zHash,
  deployment: z.object({
    budgetGenesis: zUnixSeconds,
    deployBlock: z.number().int().nonnegative(),
    teamRegistry: zAddress,
    teamImplementation: zAddress,
    teamAccountant: zAddress,
    revenueRecipient: zAddress,
    revenuePriceOracle: zAddress,
    fundingDistributor: zAddress,
    bonusDistributor: zAddress,
    bonusPriceOracle: zAddress,
    ybcBonusRecipient: zAddress,
    yfi: zAddress,
    multicall3: zAddress,
    source: z.object({
      repo: z.literal("styfi"),
      ref: z.string().min(1),
    }),
  }),
  periods: z.object({
    current: z.number().int().nonnegative(),
    lengthSeconds: z.number().int().positive(),
    currentStartsAt: zUnixSeconds,
    currentEndsAt: zUnixSeconds,
    indexed: z.array(z.number().int().nonnegative()),
  }),
  tokens: z.record(
    zAddress,
    z.object({
      address: zAddress,
      symbol: z.string().min(1),
      name: z.string().nullable(),
      decimals: z.number().int().min(0).max(36),
      kind: z.enum(["revenue", "funding", "bonus", "unknown"]),
      priceOracle: zAddress.nullable(),
      converter: zAddress.nullable(),
    })
  ),
  teams: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      address: zAddress,
      name: z.string().min(1),
      owner: zAddress,
      pendingOwner: zAddress.nullable(),
      status: z.enum(["active", "retiring", "retired", "migrated", "unknown"]),
      retirementPeriod: z.number().int().nonnegative().nullable(),
      isRegisteredAtSnapshot: z.boolean(),
      successor: zAddress.nullable(),
      periods: z.array(TeamsTeamPeriodSchema),
      lifetime: TeamsFinancialsSchema,
      claimCursor: z.object({
        nextBonusPeriod: z.number().int().nonnegative(),
      }),
      availableActions: z.object({
        canDepositRevenue: z.boolean(),
        canClaimFunding: z.boolean(),
        canReturnFunding: z.boolean(),
        canClaimBonus: z.boolean(),
      }),
    })
  ),
  fundingApprovals: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      team: zAddress,
      period: z.number().int().nonnegative(),
      token: zAddress,
      amount: zIntegerString,
      used: zIntegerString,
      claimable: zIntegerString,
      durationSeconds: z.number().int().nonnegative(),
      status: z.enum([
        "pending",
        "claimable",
        "fully_claimed",
        "expired",
        "inactive_team",
      ]),
      averageCostPriceUsd: zIntegerString.nullable(),
      claims: z.array(TeamsFundingClaimSchema),
      returns: z.array(TeamsFundingReturnSchema),
    })
  ),
  bonus: z.object({
    token: zAddress,
    pendingPeriod: z.number().int().nonnegative(),
    finalizedPeriods: z.array(TeamsBonusParametersSchema),
    claims: z.array(
      z.object({
        id: z.string().min(1),
        team: zAddress,
        period: z.number().int().nonnegative(),
        amountYfi: zIntegerString,
        ybcAmountYfi: zIntegerString,
        recipient: zAddress,
        txHash: zHash,
        blockNumber: z.number().int().nonnegative(),
        logIndex: z.number().int().nonnegative(),
        timestamp: zUnixSeconds.nullable(),
      })
    ),
  }),
  revenueRecipient: z.object({
    address: zAddress,
    killed: z.boolean(),
    operator: zAddress.nullable(),
    treasury: zAddress.nullable(),
    rewardDistributor: zAddress.nullable(),
    recoveryAuction: zAddress.nullable(),
    tokenSplitBps: z.tuple([
      z.number().int().min(0).max(10_000),
      z.number().int().min(0).max(10_000),
      z.number().int().min(0).max(10_000),
    ]),
    lastBalance: zIntegerString.nullable(),
    sumBalance: zIntegerString.nullable(),
    used: z.tuple([zIntegerString, zIntegerString, zIntegerString]).nullable(),
  }),
  accountant: z.object({
    globalByPeriod: z.array(
      z.object({
        period: z.number().int().nonnegative(),
        financials: TeamsFinancialsSchema,
      })
    ),
    lifetime: TeamsFinancialsSchema,
  }),
  events: z.object({
    firstIndexedBlock: z.number().int().nonnegative(),
    lastIndexedBlock: z.number().int().nonnegative(),
    teamCount: z.number().int().nonnegative(),
    revenueDepositCount: z.number().int().nonnegative(),
    fundingApprovalCount: z.number().int().nonnegative(),
    fundingClaimCount: z.number().int().nonnegative(),
    fundingReturnCount: z.number().int().nonnegative(),
    bonusClaimCount: z.number().int().nonnegative(),
  }),
});

export type TeamsFeed = z.infer<typeof TeamsFeedSchema>;
export type TeamsFeedFinancials = TeamsFeed["teams"][number]["lifetime"];
export type TeamsFeedFundingApproval = TeamsFeed["fundingApprovals"][number];
export type TeamsFeedTeam = TeamsFeed["teams"][number];
export type TeamsFeedTeamPeriod = TeamsFeedTeam["periods"][number];
export type TeamsFeedToken = TeamsFeed["tokens"][string];
