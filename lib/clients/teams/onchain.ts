import { formatUnits } from "viem";
import {
  createTeamsScenarioCatalog,
  deriveTeamsFundingSummary,
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
} from "./types";
import type {
  TeamsFeed,
  TeamsFeedFinancials,
  TeamsFeedFundingApproval,
  TeamsFeedTeam,
  TeamsFeedTeamPeriod,
  TeamsFeedToken,
} from "@/lib/schemas/teams-feed";

const ZERO_FINANCIALS: TeamFinancials = {
  revenueUsd: "0.00",
  costUsd: "0.00",
  profitUsd: "0.00",
  lossUsd: "0.00",
};

const READ_ONLY_PRESET_ID: TeamsMockScenarioId = "directory-observer";
const WRITE_DISABLED_PREVIEW_AMOUNT = "1000";
const USD_DECIMALS = 6;

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
}

export function mapTeamsFeedToRuntimeState(
  feed: TeamsFeed,
  account: string | null = null
): TeamsMockRuntimeState {
  const data = mapTeamsFeedToPageData(feed, account);

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
  account: string | null = null
): TeamsMockDataV1 {
  const teamIds = resolveTeamIds(feed.teams);
  const teams = feed.teams.map((team) => mapTeam(feed, team, teamIds));
  const selectedTeamId = resolveSelectedTeamId(feed, teams, account);
  const viewer = mapViewer(feed, teams, selectedTeamId, account);
  const currentGlobalPeriod = feed.accountant.globalByPeriod.find(
    (entry) => entry.period === feed.periods.current
  );

  return {
    version: 1,
    generatedAt: feed.generatedAt,
    currentPeriod: feed.periods.current,
    viewer,
    selectedTeamId,
    totals: {
      currentPeriod: currentGlobalPeriod
        ? mapFinancials(currentGlobalPeriod.financials)
        : sumFinancials(teams, "currentPeriod"),
      lifetime: mapFinancials(feed.accountant.lifetime),
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
  teamIds: Map<string, TeamId>
): TeamRecord {
  const currentPeriod =
    team.periods.find((period) => period.period === feed.periods.current) ??
    team.periods.at(-1) ??
    null;
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
    currentPeriod: currentPeriod ? mapFinancials(currentPeriod.financials) : ZERO_FINANCIALS,
    lifetime: mapFinancials(team.lifetime),
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
    fundingSummary: deriveTeamsFundingSummary(fundingApprovals),
    fundingApprovals,
    fundingReturns: feed.fundingApprovals
      .filter((approval) => sameAddress(approval.team, team.address))
      .flatMap((approval) => mapFundingReturns(feed, approval)),
    bonus: mapBonus(feed, team),
  };
}

function mapViewer(
  feed: TeamsFeed,
  teams: TeamRecord[],
  selectedTeamId: TeamId | null,
  account: string | null
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
  const teamId = ownedTeam?.id ?? selectedTeamId;

  return {
    role,
    address: account,
    teamId: role === "observer" ? null : teamId,
    canDepositRevenue: false,
    canClaimFunding: false,
    canReturnFunding: false,
    canClaimBonus: false,
    canUseAdmin: isOperator,
  };
}

function mapRevenueOptions(feed: TeamsFeed): RevenueOption[] {
  return Object.values(feed.tokens)
    .filter((token) => token.kind !== "bonus")
    .map((token) => {
      const oraclePriceUsd = "1.00";
      return {
        symbol: token.symbol,
        tokenAddress: token.address,
        decimals: token.decimals,
        isConvertible:
          token.converter !== null &&
          normalizeAddress(token.converter) !== normalizeAddress(token.priceOracle ?? ""),
        convertToSymbol: resolveConvertedSymbol(feed, token),
        oraclePriceUsd,
        previewAmount: WRITE_DISABLED_PREVIEW_AMOUNT,
        estimatedCreditUsd: (
          Number(WRITE_DISABLED_PREVIEW_AMOUNT) * Number(oraclePriceUsd)
        ).toFixed(2),
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
          period: deposit.period,
          symbol: token?.symbol ?? "UNKNOWN",
          amount: fromTokenUnits(deposit.amount, token?.decimals ?? 18, 4),
          creditedUsd: fromUsd(deposit.revenueUsd),
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
  const claimsCostUsd = approval.claims.reduce(
    (sum, claim) => sum + BigInt(claim.costUsd),
    0n
  );
  const refundsUsd = approval.returns.reduce(
    (sum, entry) => sum + BigInt(entry.refundUsd),
    0n
  );

  return {
    id: `approval-${approval.id}`,
    idx: approval.id,
    approvedPeriod: approval.period,
    symbol: token?.symbol ?? "UNKNOWN",
    tokenAddress: approval.token,
    totalApproved: fromTokenUnits(approval.amount, token?.decimals ?? 18, 4),
    used: fromTokenUnits(approval.used, token?.decimals ?? 18, 4),
    claimable: fromTokenUnits(approval.claimable, token?.decimals ?? 18, 4),
    streamDurationDays: Math.floor(approval.durationSeconds / 86_400),
    status: mapFundingStatus(feed, approval),
    recipient: approval.claims.at(-1)?.recipient ?? null,
    claimedCostUsd: fromUsd(claimsCostUsd.toString()),
    refundValueUsd: fromUsd(refundsUsd.toString()),
    averageClaimPriceUsd: approval.averageCostPriceUsd
      ? fromUsd(approval.averageCostPriceUsd)
      : null,
  };
}

function mapFundingReturns(
  feed: TeamsFeed,
  approval: TeamsFeedFundingApproval
): FundingReturnEntry[] {
  const token = getFeedToken(feed, approval.token);
  return approval.returns.map((entry) => ({
    id: entry.id,
    approvalId: `approval-${approval.id}`,
    period: entry.period,
    symbol: token?.symbol ?? "UNKNOWN",
    amount: fromTokenUnits(entry.amount, token?.decimals ?? 18, 4),
    refundValueUsd: fromUsd(entry.refundUsd),
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
    (sum, period) => sum + parseDisplayAmount(period.claimableYfi),
    0
  );
  const hasClaimable = totalClaimableRaw > 0;
  const hasPending = periods.some((period) => period.status === "pending-finalization");
  const hasClaimed = periods.some((period) => period.status === "claimed");

  return {
    tokenSymbol: "YFI",
    status: hasClaimable
      ? "claimable"
      : hasPending
        ? "pending-finalization"
        : hasClaimed
          ? "claimed"
          : "none",
    totalClaimable: trimDecimal(String(totalClaimableRaw), 4),
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
    profitUsd: mapFinancials(period.financials).profitUsd,
    spotPriceUsd: fromUsd(price),
    adjustedPriceUsd: fromUsd(price),
    growthFactorBps: bonus.parameters?.bonusFactorBps ?? 0,
    ybcSplitBps: bonus.parameters?.ybcSplitBps ?? 0,
    claimableYfi: fromTokenUnits(bonus.claimableYfi, 18, 4),
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
      .filter((token) => token.kind !== "bonus")
      .map(mapRevenueTokenAdminRecord),
    fundingQueue: feed.fundingApprovals.map((approval) =>
      mapAdminFundingQueueEntry(feed, teams, approval)
    ),
    bonusQueue: teams.flatMap((team) => mapAdminBonusQueue(team)),
  };
}

function mapBucket(feed: TeamsFeed, index: 0 | 1 | 2): BucketRecord {
  const sumBalance = BigInt(feed.revenueRecipient.sumBalance ?? "0");
  const budgetRaw =
    (sumBalance * BigInt(feed.revenueRecipient.tokenSplitBps[index])) / 10_000n;
  const usedRaw = BigInt(feed.revenueRecipient.used?.[index] ?? "0");
  const remainingRaw = budgetRaw > usedRaw ? budgetRaw - usedRaw : 0n;

  return {
    budget: fromUsd(budgetRaw.toString()),
    used: fromUsd(usedRaw.toString()),
    remaining: fromUsd(remainingRaw.toString()),
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

function mapFinancials(financials: TeamsFeedFinancials): TeamFinancials {
  return {
    revenueUsd: fromUsd(financials.revenueUsd),
    costUsd: fromUsd(financials.costUsd),
    profitUsd: fromUsd(financials.profitUsd),
    lossUsd: fromUsd(financials.lossUsd),
  };
}

function sumFinancials(
  teams: readonly TeamRecord[],
  key: "currentPeriod" | "lifetime"
): TeamFinancials {
  const totals = teams.reduce(
    (sum, team) => {
      sum.revenueUsd += Number(team[key].revenueUsd);
      sum.costUsd += Number(team[key].costUsd);
      sum.profitUsd += Number(team[key].profitUsd);
      sum.lossUsd += Number(team[key].lossUsd);
      return sum;
    },
    {
      revenueUsd: 0,
      costUsd: 0,
      profitUsd: 0,
      lossUsd: 0,
    }
  );

  return {
    revenueUsd: totals.revenueUsd.toFixed(2),
    costUsd: totals.costUsd.toFixed(2),
    profitUsd: totals.profitUsd.toFixed(2),
    lossUsd: totals.lossUsd.toFixed(2),
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

function resolveSelectedTeamId(
  feed: TeamsFeed,
  teams: TeamRecord[],
  account: string | null
) {
  const normalizedAccount = account ? normalizeAddress(account) : null;
  const ownedTeam =
    normalizedAccount === null
      ? null
      : teams.find((team) => normalizeAddress(team.owner) === normalizedAccount) ??
        null;
  return ownedTeam?.id ?? teams[0]?.id ?? (feed.teams[0] ? createTeamId(feed.teams[0]) : null);
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

function fromUsd(value: string) {
  return toFixedDisplay(value, USD_DECIMALS, 2);
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

function parseDisplayAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function trimDecimal(value: string, fractionDigits: number) {
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length === 0) return whole ?? "0";

  const trimmedFraction = fraction.slice(0, fractionDigits).replace(/0+$/, "");
  return trimmedFraction.length > 0 ? `${whole}.${trimmedFraction}` : whole ?? "0";
}

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function sameAddress(left: string, right: string) {
  return normalizeAddress(left) === normalizeAddress(right);
}
