import { formatUnits, getAddress, isAddress, type Address } from "viem";
import { BonusDistributorAbi } from "@/lib/abis/BonusDistributor";
import { TeamAbi } from "@/lib/abis/Team";
import { assertMainnetAccount, MAINNET_CHAIN_ID } from "@/lib/tx/network";
import type { PreparedTransaction } from "@/lib/tx/types";
import {
  addTeamsDecimalStrings,
  createTeamsScenarioCatalog,
  deriveTeamsFundingSummary,
  formatTeamsRawTokenAmount,
  type TeamsClient,
  type TeamsScenarioCatalogEntry,
} from "./client";
import type { TeamsMockRuntimeState } from "./mock";
import type {
  AdminBonusQueueEntry,
  AdminFundingQueueEntry,
  BonusPeriod,
  BonusPeriodStatus,
  BucketRecord,
  FundingApproval,
  FundingApprovalStatus,
  FundingReturnEntry,
  RevenueHistoryEntry,
  RevenueOption,
  RevenueTokenAdminRecord,
  TeamBonusState,
  TeamFinancials,
  TeamFinancialPeriod,
  TeamId,
  TeamLifecycleStatus,
  TeamMigrationReadiness,
  TeamReadOnlyReason,
  TeamRecord,
  TeamsAdminRecord,
  TeamsMockDataV1,
  TeamsMockScenario,
  TeamsMockScenarioId,
  TeamsViewerContext,
  TeamsViewerRole,
  TeamsFinancialDataState,
  ProtocolUsd18String,
} from "./types";
import type {
  TeamsFeed,
  TeamsFeedFinancials,
  TeamsFeedFundingApproval,
  TeamsFeedTeam,
  TeamsFeedTeamPeriod,
  TeamsFeedToken,
} from "@/lib/schemas/teams-feed";
import {
  hasCompatibleTeamsFinancialUnits,
  TEAMS_BONUS_TOKEN_DECIMALS,
  TEAMS_PROTOCOL_USD_DECIMALS,
} from "@/lib/schemas/teams-feed";

const ZERO_FINANCIALS: TeamFinancials = {
  revenueUsd: "0.00",
  costUsd: "0.00",
  profitUsd: "0.00",
  lossUsd: "0.00",
};
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const READ_ONLY_PRESET_ID: TeamsMockScenarioId = "directory-observer";
type TeamsMapOptions = {
  actionStateTrusted?: boolean;
  walletChainId?: number | null;
};

export class OnchainTeamsClient implements TeamsClient {
  constructor(
    private readonly feed: TeamsFeed,
    private readonly account: string | null = null
  ) {}

  async listScenarioCatalog(): Promise<TeamsScenarioCatalogEntry[]> {
    return createTeamsScenarioCatalog([
      {
        id: READ_ONLY_PRESET_ID,
        label: "Teams feed",
        data: mapTeamsFeedToPageData(this.feed, this.account),
      },
    ]);
  }

  async getScenario(_id: TeamsMockScenarioId): Promise<TeamsMockScenario> {
    void _id;
    return {
      id: READ_ONLY_PRESET_ID,
      label: "Teams feed",
      data: mapTeamsFeedToPageData(this.feed, this.account),
    };
  }

  async getPageState(): Promise<TeamsMockRuntimeState> {
    return mapTeamsFeedToRuntimeState(this.feed, this.account);
  }

  async prepareRevenueDeposit(
    team: Address,
    token: Address,
    amount: bigint
  ): Promise<PreparedTransaction> {
    const canonicalTeam = resolveCanonicalTeamsFeedTeamAddress(this.feed, team);
    const canonicalToken = resolveCanonicalTeamsFeedTokenAddress(this.feed, token);
    assertPositiveAmount(amount);

    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getTeamsWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: canonicalTeam,
        abi: TeamAbi,
        functionName: "deposit_revenue",
        args: [canonicalToken, amount] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "Teams revenue deposit");
    };
  }

  async prepareFundingClaim(
    team: Address,
    approvalIdx: bigint,
    amount: bigint,
    recipient: Address
  ): Promise<PreparedTransaction> {
    const canonicalTeam = resolveCanonicalTeamsFeedTeamAddress(this.feed, team);
    const approval = resolveTeamsFeedFundingApproval(
      this.feed,
      canonicalTeam,
      approvalIdx
    );
    assertValidTeamsAddress(recipient, "recipient");
    assertPositiveAmount(amount);
    if (
      approval.status !== "claimable" ||
      approval.period > this.feed.periods.current
    ) {
      throw new Error("The selected Teams funding approval is not claimable.");
    }
    if (amount > BigInt(approval.claimable)) {
      throw new Error("Teams funding claim exceeds the remaining raw balance.");
    }

    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getTeamsWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: canonicalTeam,
        abi: TeamAbi,
        functionName: "claim_funding",
        args: [approvalIdx, amount, recipient] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "Teams funding claim");
    };
  }

  async prepareFundingReturn(
    team: Address,
    approvalIdx: bigint,
    amount: bigint
  ): Promise<PreparedTransaction> {
    const canonicalTeam = resolveCanonicalTeamsFeedTeamAddress(this.feed, team);
    const approval = resolveTeamsFeedFundingApproval(
      this.feed,
      canonicalTeam,
      approvalIdx
    );
    assertPositiveAmount(amount);
    if (approval.period !== this.feed.periods.current) {
      throw new Error(
        "Only the current-period Teams funding approval can accept returns."
      );
    }
    const returnableRaw = getFeedFundingReturnableRaw(approval);
    if (amount > returnableRaw) {
      throw new Error("Teams funding return exceeds the outstanding raw balance.");
    }

    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getTeamsWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: canonicalTeam,
        abi: TeamAbi,
        functionName: "return_funding",
        args: [approvalIdx, amount] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "Teams funding return");
    };
  }

  async prepareBonusClaim(
    team: Address,
    recipient: Address
  ): Promise<PreparedTransaction> {
    const canonicalTeam = resolveCanonicalTeamsFeedTeamAddress(this.feed, team);
    assertValidTeamsAddress(recipient, "recipient");

    return async () => {
      const { getAccount, simulateThenWrite, wagmiConfig } =
        await getTeamsWriteRuntime();
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: this.feed.deployment.bonusDistributor as Address,
        abi: BonusDistributorAbi,
        functionName: "claim",
        args: [canonicalTeam, recipient] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "Teams bonus claim");
    };
  }
}

async function getTeamsWriteRuntime() {
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

export function mapTeamsFeedToRuntimeState(
  feed: TeamsFeed,
  account: string | null = null,
  options: TeamsMapOptions = {}
): TeamsMockRuntimeState {
  const data = mapTeamsFeedToPageData(feed, account, options);

  return {
    presetId: READ_ONLY_PRESET_ID,
    data,
    isLoading: false,
    isEmpty: feed.teams.length === 0,
    currentTimeSeconds: feed.generatedAt,
    periodBase: feed.periods.current,
    periodAnchorTimeSeconds: feed.periods.currentStartsAt,
    timeTravelDays: 0,
  };
}

export function mapTeamsFeedToPageData(
  feed: TeamsFeed,
  account: string | null = null,
  options: TeamsMapOptions = {}
): TeamsMockDataV1 {
  const financialData = mapFinancialDataState(feed);
  const teamIds = resolveTeamIds(feed.teams);
  const teams = feed.teams.map((team) =>
    mapTeam(feed, team, teamIds, financialData)
  );
  const viewer = mapViewer(feed, teams, account, options);
  const currentGlobalPeriod = feed.accountant.globalByPeriod.find(
    (entry) => entry.period === feed.periods.current
  );

  return {
    version: 1,
    generatedAt: feed.generatedAt,
    currentPeriod: feed.periods.current,
    financialData,
    viewer,
    selectedTeamId: null,
    totals: {
      currentPeriod: currentGlobalPeriod
        ? mapFinancials(feed, currentGlobalPeriod.financials)
        : sumFinancials(teams, "currentPeriod", financialData),
      lifetime: mapFinancials(feed, feed.accountant.lifetime),
      activeTeamCount: teams.filter((team) => team.status === "active").length,
      retiringTeamCount: teams.filter((team) => team.status === "retiring").length,
      retiredTeamCount: teams.filter((team) => team.status === "retired").length,
    },
    teams,
    admin: mapAdmin(feed, teams),
  };
}

function mapTeam(
  feed: TeamsFeed,
  team: TeamsFeedTeam,
  teamIds: Map<string, TeamId>,
  financialData: TeamsFinancialDataState
): TeamRecord {
  const currentPeriod =
    team.periods.find((period) => period.period === feed.periods.current) ?? null;
  const financialPeriods = mapFinancialPeriods(feed, team);
  const fundingApprovals = feed.fundingApprovals
    .filter((approval) => sameAddress(approval.team, team.address))
    .map((approval) => mapFundingApproval(feed, approval));
  const id = teamIds.get(normalizeAddress(team.address)) ?? createTeamId(team);

  return {
    id,
    name: team.name,
    address: team.address,
    owner: team.owner,
    pendingOwner: team.pendingOwner,
    status: mapLifecycleStatus(team),
    readOnlyReason: mapReadOnlyReason(team),
    financialData,
    currentPeriod: currentPeriod
      ? mapFinancials(feed, currentPeriod.financials)
      : ZERO_FINANCIALS,
    financialPeriods,
    lifetime: mapFinancials(feed, team.lifetime),
    lifecycle: {
      migrationReadiness: mapMigrationReadiness(team),
      successorTeamId: team.successor
        ? teamIds.get(normalizeAddress(team.successor)) ?? normalizeAddress(team.successor)
        : null,
      retirementAnnouncedAt: null,
      retirementEffectivePeriod: team.retirementPeriod,
    },
    revenueOptions: mapRevenueOptions(feed),
    revenueHistory: mapRevenueHistory(feed, team),
    fundingSummary: deriveTeamsFundingSummary(
      fundingApprovals,
      feed.periods.current
    ),
    fundingApprovals,
    fundingReturns: feed.fundingApprovals
      .filter((approval) => sameAddress(approval.team, team.address))
      .flatMap((approval) => mapFundingReturns(feed, approval)),
    bonus: mapBonus(feed, team),
  };
}

function mapFinancialPeriods(
  feed: TeamsFeed,
  team: TeamsFeedTeam
): TeamFinancialPeriod[] {
  return team.periods
    .map((period) => ({
      period: period.period,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      financials: mapFinancials(feed, period.financials),
    }))
    .sort((left, right) => right.period - left.period);
}

function mapViewer(
  feed: TeamsFeed,
  teams: TeamRecord[],
  account: string | null,
  options: TeamsMapOptions
): TeamsViewerContext {
  const normalizedAccount = account ? normalizeAddress(account) : null;
  const ownedTeam =
    normalizedAccount === null
      ? null
      : teams.find((team) => normalizeAddress(team.owner) === normalizedAccount) ??
        null;
  const isOperator =
    normalizedAccount !== null &&
    feed.revenueRecipient.operator !== null &&
    normalizeAddress(feed.revenueRecipient.operator) === normalizedAccount;
  const role: TeamsViewerRole = isOperator
    ? "operator-admin"
      : ownedTeam
      ? "team-owner"
      : "observer";
  const isMainnetAccount =
    normalizedAccount !== null &&
    options.walletChainId === MAINNET_CHAIN_ID;

  return {
    role,
    address: account,
    teamId: role === "observer" ? null : ownedTeam?.id ?? null,
    actionStateTrusted: options.actionStateTrusted !== false,
    walletStatus:
      normalizedAccount === null
        ? "disconnected"
        : isMainnetAccount
          ? "mainnet"
          : "switch-mainnet",
    revenueDepositsEnabled:
      options.actionStateTrusted !== false &&
      !feed.revenueRecipient.killed,
    canDepositRevenue: false,
    canClaimFunding: false,
    canReturnFunding: false,
    canClaimBonus: false,
    canUseAdmin: isOperator,
  };
}

function mapRevenueOptions(feed: TeamsFeed): RevenueOption[] {
  return Object.values(feed.tokens)
    .filter(isProducerSupportedRevenueToken)
    .map((token) => {
      return {
        symbol: token.symbol,
        tokenAddress: token.address,
        decimals: token.decimals,
        isConvertible:
          token.converter !== null &&
          normalizeAddress(token.converter) !== normalizeAddress(token.priceOracle ?? ""),
        convertToSymbol: resolveConvertedSymbol(feed, token),
        oraclePriceUsd: null,
        previewAmount: null,
        estimatedCreditUsd: null,
      };
    });
}

function mapRevenueHistory(feed: TeamsFeed, team: TeamsFeedTeam): RevenueHistoryEntry[] {
  return team.periods
    .flatMap((period) =>
      period.revenueDeposits.map((deposit) => {
        const token = getFeedToken(feed, deposit.token);
        return {
          id: deposit.id,
          txHash: deposit.txHash,
          logIndex: deposit.logIndex,
          period: deposit.period,
          symbol: token?.symbol ?? "UNKNOWN",
          amount: fromTokenUnits(deposit.amount, token?.decimals ?? 18, 4),
          creditedUsd: fromUsd(feed, deposit.revenueUsd),
          convertedToSymbol: resolveConvertedSymbol(feed, token),
          depositedBy: deposit.depositor,
          createdAt: deposit.timestamp ?? feed.generatedAt,
        };
      })
    )
    .sort((left, right) => right.createdAt - left.createdAt);
}

function mapFundingApproval(
  feed: TeamsFeed,
  approval: TeamsFeedFundingApproval
): FundingApproval {
  const token = getFeedToken(feed, approval.token);
  const decimals = token?.decimals ?? 18;
  const claimedRaw = approval.claims.reduce(
    (sum, claim) => sum + BigInt(claim.amount),
    0n
  );
  const returnedRaw = approval.returns.reduce(
    (sum, entry) => sum + BigInt(entry.amount),
    0n
  );
  const returnableRaw =
    claimedRaw > returnedRaw ? claimedRaw - returnedRaw : 0n;
  const claimsCostUsd = approval.claims.reduce(
    (sum, claim) => sum + BigInt(claim.costUsd),
    0n
  );
  const refundsUsd = approval.returns.reduce(
    (sum, entry) => sum + BigInt(entry.refundUsd),
    0n
  );
  const refundableUsd =
    claimsCostUsd > refundsUsd ? claimsCostUsd - refundsUsd : 0n;

  return {
    id: `approval-${approval.id}`,
    idx: approval.id,
    approvedPeriod: approval.period,
    symbol: token?.symbol ?? "UNKNOWN",
    tokenAddress: approval.token,
    decimals,
    amountRaw: approval.amount,
    usedRaw: approval.used,
    claimableRaw: approval.claimable,
    claimedRaw: claimedRaw.toString(),
    returnedRaw: returnedRaw.toString(),
    returnableRaw: returnableRaw.toString(),
    totalApproved: fromTokenUnits(approval.amount, decimals, 4),
    used: fromTokenUnits(approval.used, decimals, 4),
    claimable: fromTokenUnits(approval.claimable, decimals, 4),
    streamDurationDays: Math.floor(approval.durationSeconds / 86_400),
    status: mapFundingStatus(feed, approval),
    recipient: approval.claims.at(-1)?.recipient ?? null,
    claimedCostUsd: hasCompatibleTeamsFinancialUnits(feed)
      ? fromProtocolUsd18(refundableUsd.toString())
      : null,
    refundValueUsd: hasCompatibleTeamsFinancialUnits(feed)
      ? fromProtocolUsd18(refundableUsd.toString())
      : null,
    averageClaimPriceUsd:
      hasCompatibleTeamsFinancialUnits(feed) && approval.averageCostPriceUsd
      ? fromProtocolUsd18(approval.averageCostPriceUsd)
      : null,
  };
}

function mapFundingReturns(
  feed: TeamsFeed,
  approval: TeamsFeedFundingApproval
): FundingReturnEntry[] {
  const token = getFeedToken(feed, approval.token);
  const decimals = token?.decimals ?? 18;
  return approval.returns.map((entry) => ({
    id: entry.id,
    txHash: entry.txHash,
    logIndex: entry.logIndex,
    approvalId: `approval-${approval.id}`,
    period: entry.period,
    symbol: token?.symbol ?? "UNKNOWN",
    decimals,
    amountRaw: entry.amount,
    amount: fromTokenUnits(entry.amount, decimals, 4),
    refundValueUsd: hasCompatibleTeamsFinancialUnits(feed)
      ? fromProtocolUsd18(entry.refundUsd)
      : null,
    returnedBy: entry.sender,
    createdAt: entry.timestamp ?? feed.generatedAt,
  }));
}

function mapBonus(feed: TeamsFeed, team: TeamsFeedTeam): TeamBonusState {
  const claimsByPeriod = new Set(
    feed.bonus.claims
      .filter((claim) => sameAddress(claim.team, team.address))
      .map((claim) => claim.period)
  );
  const periods = team.periods
    .map((period) => mapBonusPeriod(feed, period, claimsByPeriod))
    .filter((period): period is BonusPeriod => period !== null);
  const totalClaimableRaw = periods.reduce(
    (sum, period) => sum + BigInt(period.claimableYfiRaw),
    0n
  );
  const hasClaimable = totalClaimableRaw > 0n;
  const hasPending = periods.some((period) => period.status === "pending-finalization");
  const hasClaimed = periods.some((period) => period.status === "claimed");

  return {
    tokenSymbol: "YFI",
    tokenDecimals: TEAMS_BONUS_TOKEN_DECIMALS,
    status: hasClaimable
      ? "claimable"
      : hasPending
        ? "pending-finalization"
        : hasClaimed
          ? "claimed"
          : "none",
    totalClaimableRaw: totalClaimableRaw.toString(),
    totalClaimable: formatTeamsRawTokenAmount(
      totalClaimableRaw.toString(),
      TEAMS_BONUS_TOKEN_DECIMALS
    ),
    includedPeriodCount: periods.length,
    periods,
  };
}

function mapBonusPeriod(
  feed: TeamsFeed,
  period: TeamsFeedTeamPeriod,
  claimsByPeriod: Set<number>
): BonusPeriod | null {
  const bonus = period.bonus;
  if (!bonus) return null;

  const claimed = claimsByPeriod.has(period.period) || bonus.status === "claimed";
  const finalized = bonus.parameters !== null || claimed || bonus.status !== "unfinalized";
  const status: BonusPeriodStatus = claimed
    ? "claimed"
    : bonus.status === "claimable" && BigInt(bonus.claimableYfi) > 0n
      ? "finalized-claimable"
      : finalized
        ? "finalized-zero"
        : "pending-finalization";
  const price = bonus.parameters?.bonusPriceUsd ?? "0";

  return {
    period: bonus.period,
    status,
    finalized,
    claimed,
    profitUsd: mapFinancials(feed, period.financials).profitUsd,
    spotPriceUsd: fromUsd(feed, price),
    adjustedPriceUsd: fromUsd(feed, price),
    growthFactorBps: bonus.parameters?.bonusFactorBps ?? 0,
    ybcSplitBps: bonus.parameters?.ybcSplitBps ?? 0,
    claimableYfiRaw: bonus.claimableYfi,
    claimableYfi: fromTokenUnits(
      bonus.claimableYfi,
      TEAMS_BONUS_TOKEN_DECIMALS,
      4
    ),
  };
}

function mapAdmin(feed: TeamsFeed, teams: TeamRecord[]): TeamsAdminRecord {
  const currentBonusPeriods = teams.flatMap((team) =>
    team.bonus.periods.filter((period) => period.period === feed.periods.current)
  );

  return {
    registryStatus: feed.revenueRecipient.killed ? "deprecated" : "active",
    periodFinalizationStatus:
      currentBonusPeriods.length > 0 &&
      currentBonusPeriods.every((period) => period.finalized)
        ? "finalized"
        : currentBonusPeriods.some((period) => period.status === "pending-finalization")
          ? "open"
          : "ready",
    rewardsBucket: mapBucket(feed, 0),
    treasuryBucket: mapBucket(feed, 1),
    recoveryBucket: mapBucket(feed, 2),
    whitelistedRevenueTokens: Object.values(feed.tokens)
      .filter(isProducerSupportedRevenueToken)
      .map(mapRevenueTokenAdminRecord),
    fundingQueue: feed.fundingApprovals.map((approval) =>
      mapAdminFundingQueueEntry(feed, teams, approval)
    ),
    bonusQueue: teams.flatMap((team) => mapAdminBonusQueue(team)),
  };
}

function mapBucket(feed: TeamsFeed, index: 0 | 1 | 2): BucketRecord {
  const token = getFeedToken(feed, feed.revenueRecipient.token);
  if (
    !token ||
    feed.revenueRecipient.sumBalance === null ||
    feed.revenueRecipient.used === null
  ) {
    return {
      sourceAvailable: false,
      unit: null,
      budget: null,
      used: null,
      remaining: null,
      status: "unavailable",
    };
  }

  const sumBalance = BigInt(feed.revenueRecipient.sumBalance);
  const budgetRaw =
    (sumBalance * BigInt(feed.revenueRecipient.tokenSplitBps[index])) / 10_000n;
  const usedRaw = BigInt(feed.revenueRecipient.used[index]);
  const remainingRaw = budgetRaw > usedRaw ? budgetRaw - usedRaw : 0n;

  return {
    sourceAvailable: true,
    unit: {
      kind: "token",
      symbol: token.symbol,
      decimals: token.decimals,
    },
    budget: fromTokenUnits(budgetRaw.toString(), token.decimals, 4),
    used: fromTokenUnits(usedRaw.toString(), token.decimals, 4),
    remaining: fromTokenUnits(remainingRaw.toString(), token.decimals, 4),
    status:
      remainingRaw === 0n && budgetRaw > 0n
        ? "limit-reached"
        : budgetRaw > 0n && (usedRaw * 10n) / budgetRaw >= 8n
          ? "watch"
          : "healthy",
  };
}

function mapRevenueTokenAdminRecord(token: TeamsFeedToken): RevenueTokenAdminRecord {
  return {
    symbol: token.symbol,
    tokenAddress: token.address,
    oracle: token.priceOracle ?? "0x0000000000000000000000000000000000000000",
    converter: token.converter,
    status: "active",
  };
}

function mapAdminFundingQueueEntry(
  feed: TeamsFeed,
  teams: TeamRecord[],
  approval: TeamsFeedFundingApproval
): AdminFundingQueueEntry {
  const teamId =
    teams.find((team) => sameAddress(team.address, approval.team))?.id ??
    normalizeAddress(approval.team);

  return {
    approvalId: `approval-${approval.id}`,
    teamId,
    status: mapFundingStatus(feed, approval),
    requiresOperatorAttention:
      approval.status === "claimable" && BigInt(approval.claimable) > 0n,
  };
}

function mapAdminBonusQueue(team: TeamRecord): AdminBonusQueueEntry[] {
  return team.bonus.periods.map((period) => ({
    teamId: team.id,
    period: period.period,
    status: period.status,
    requiresFinalization: period.status === "pending-finalization",
  }));
}

function mapFundingStatus(
  feed: TeamsFeed,
  approval: TeamsFeedFundingApproval
): FundingApprovalStatus {
  if (BigInt(approval.claimable) === 0n) return "fully-used";
  if (approval.status === "fully_claimed") return "fully-used";
  if (approval.status === "claimable" && approval.period === feed.periods.current) {
    return BigInt(approval.used) > 0n ? "partially-claimed" : "claimable-current-period";
  }
  if (approval.status === "claimable" && approval.period < feed.periods.current) {
    return "late-liquid";
  }
  return "not-current-period";
}

function mapFinancials(
  feed: TeamsFeed,
  financials: TeamsFeedFinancials
): TeamFinancials {
  if (!hasCompatibleTeamsFinancialUnits(feed)) return ZERO_FINANCIALS;

  return {
    revenueUsd: fromProtocolUsd18(financials.revenueUsd),
    costUsd: fromProtocolUsd18(financials.costUsd),
    profitUsd: fromProtocolUsd18(financials.profitUsd),
    lossUsd: fromProtocolUsd18(financials.lossUsd),
  };
}

function sumFinancials(
  teams: readonly TeamRecord[],
  key: "currentPeriod" | "lifetime",
  financialData: TeamsFinancialDataState
): TeamFinancials {
  if (financialData.status === "unavailable") return ZERO_FINANCIALS;

  return {
    revenueUsd: addTeamsDecimalStrings(
      teams.map((team) => team[key].revenueUsd)
    ),
    costUsd: addTeamsDecimalStrings(teams.map((team) => team[key].costUsd)),
    profitUsd: addTeamsDecimalStrings(
      teams.map((team) => team[key].profitUsd)
    ),
    lossUsd: addTeamsDecimalStrings(teams.map((team) => team[key].lossUsd)),
  };
}

function mapLifecycleStatus(team: TeamsFeedTeam): TeamLifecycleStatus {
  if (team.status === "retiring") return "retiring";
  if (team.status === "retired" || team.status === "migrated") return "retired";
  return "active";
}

function mapReadOnlyReason(team: TeamsFeedTeam): TeamReadOnlyReason | null {
  if (team.status === "retired" || team.status === "migrated") return "retired";
  if (team.successor) return "successor-active";
  return null;
}

function mapMigrationReadiness(team: TeamsFeedTeam): TeamMigrationReadiness {
  if (team.status === "migrated") return "completed";
  if (team.successor) return "ready";
  return "not-needed";
}

function resolveTeamIds(teams: TeamsFeedTeam[]) {
  const counts = new Map<string, number>();
  const ids = new Map<string, TeamId>();

  for (const team of teams) {
    const baseId = createTeamId(team);
    const count = counts.get(baseId) ?? 0;
    counts.set(baseId, count + 1);
    ids.set(
      normalizeAddress(team.address),
      count === 0 ? baseId : `${baseId}-${team.index}`
    );
  }

  return ids;
}

export function resolveCanonicalTeamsFeedTeamAddress(
  feed: TeamsFeed,
  requestedAddress: string
): Address {
  assertValidTeamsAddress(requestedAddress, "team");
  const team = feed.teams.find((entry) =>
    sameAddress(entry.address, requestedAddress)
  );
  if (!team) {
    throw new Error("The selected Teams contract is not present in the current feed.");
  }
  return getAddress(team.address);
}

function resolveCanonicalTeamsFeedTokenAddress(
  feed: TeamsFeed,
  requestedAddress: string
): Address {
  assertValidTeamsAddress(requestedAddress, "token");
  const token = Object.values(feed.tokens).find((entry) =>
    sameAddress(entry.address, requestedAddress)
  );
  if (!token || !isProducerSupportedRevenueToken(token)) {
    throw new Error("The selected revenue token is not supported by the current feed.");
  }
  return getAddress(token.address);
}

function isProducerSupportedRevenueToken(token: TeamsFeedToken) {
  return (
    token.kind === "revenue" &&
    token.priceOracle !== null &&
    normalizeAddress(token.priceOracle) !== ZERO_ADDRESS
  );
}

function resolveTeamsFeedFundingApproval(
  feed: TeamsFeed,
  team: Address,
  approvalIdx: bigint
): TeamsFeedFundingApproval {
  const approval = feed.fundingApprovals.find(
    (entry) =>
      BigInt(entry.id) === approvalIdx && sameAddress(entry.team, team)
  );
  if (!approval) {
    throw new Error(
      "The selected Teams funding approval is not present for this team."
    );
  }
  return approval;
}

function getFeedFundingReturnableRaw(
  approval: TeamsFeedFundingApproval
): bigint {
  const claimedRaw = approval.claims.reduce(
    (sum, claim) => sum + BigInt(claim.amount),
    0n
  );
  const returnedRaw = approval.returns.reduce(
    (sum, entry) => sum + BigInt(entry.amount),
    0n
  );
  return claimedRaw > returnedRaw ? claimedRaw - returnedRaw : 0n;
}

function createTeamId(team: TeamsFeedTeam) {
  const slug = team.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || normalizeAddress(team.address);
}

function resolveConvertedSymbol(
  feed: TeamsFeed,
  token: TeamsFeedToken | null
): string | null {
  if (!token?.converter) return null;
  const convertedToken = getFeedToken(feed, token.converter);
  return convertedToken?.symbol ?? null;
}

function getFeedToken(feed: TeamsFeed, address: string | null | undefined) {
  if (!address) return null;
  const normalized = normalizeAddress(address);
  return (
    Object.values(feed.tokens).find(
      (token) => normalizeAddress(token.address) === normalized
    ) ?? null
  );
}

function mapFinancialDataState(feed: TeamsFeed): TeamsFinancialDataState {
  return hasCompatibleTeamsFinancialUnits(feed)
    ? {
        status: "available",
        source: "feed",
        usdDecimals: TEAMS_PROTOCOL_USD_DECIMALS,
      }
    : {
        status: "unavailable",
        source: "feed",
        reason: "incompatible-feed",
        feedVersion: feed.version,
      };
}

function fromUsd(feed: TeamsFeed, value: string) {
  return hasCompatibleTeamsFinancialUnits(feed)
    ? fromProtocolUsd18(value)
    : "0";
}

function fromProtocolUsd18(value: string) {
  return toFixedDisplay(
    value as ProtocolUsd18String,
    TEAMS_PROTOCOL_USD_DECIMALS,
    2
  );
}

function fromTokenUnits(value: string, decimals: number, fractionDigits: number) {
  return toFixedDisplay(value, decimals, fractionDigits);
}

function toFixedDisplay(value: string, decimals: number, fractionDigits: number) {
  const formatted = formatUnits(BigInt(value), decimals);
  const [whole, fraction = ""] = formatted.split(".");

  if (fractionDigits === 0) return whole ?? "0";

  const paddedFraction = fraction.padEnd(fractionDigits, "0");
  const trimmedFraction = paddedFraction
    .slice(0, fractionDigits)
    .replace(/0+$/, "");
  return trimmedFraction.length > 0 ? `${whole}.${trimmedFraction}` : whole ?? "0";
}

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function sameAddress(left: string, right: string) {
  return normalizeAddress(left) === normalizeAddress(right);
}

function assertValidTeamsAddress(address: string, label: string) {
  if (!isAddress(address) || normalizeAddress(address) === ZERO_ADDRESS) {
    throw new Error(`Invalid Teams ${label} address.`);
  }
}

function assertPositiveAmount(amount: bigint) {
  if (amount <= 0n) {
    throw new Error("Teams write amount must be greater than zero.");
  }
}
