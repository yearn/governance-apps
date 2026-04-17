import type {
  BasisPoints,
  DecimalString,
  FundingApproval,
  FundingApprovalStatus,
  FundingReturnEntry,
  RevenueOption,
  TeamFinancials,
  TeamFundingSummary,
  TeamId,
  TeamRecord,
  TeamsMockDataV1,
  TeamsMockExampleScenariosV1,
  TeamsMockScenario,
  TeamsMockScenarioId,
  TeamsAddress,
  TeamsViewerRole,
  UnixTimestampSeconds,
  UsdDecimalString,
} from "./types";

export type TeamsScenarioCatalogEntry = {
  id: TeamsMockScenarioId;
  label: string;
  selectedTeamId: TeamId | null;
  viewerRole: TeamsViewerRole;
  teamCount: number;
  hasAdmin: boolean;
};

export interface TeamsClient {
  listScenarioCatalog(): Promise<TeamsScenarioCatalogEntry[]>;
  getScenario(id: TeamsMockScenarioId): Promise<TeamsMockScenario>;
}

export function createTeamsScenarioCatalog(
  scenarios: TeamsMockExampleScenariosV1["scenarios"]
): TeamsScenarioCatalogEntry[] {
  return scenarios.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    selectedTeamId: scenario.data.selectedTeamId,
    viewerRole: scenario.data.viewer.role,
    teamCount: scenario.data.teams.length,
    hasAdmin: Boolean(scenario.data.admin),
  }));
}

export function resolveSelectedTeam(
  data: TeamsMockDataV1 | null | undefined,
  teamId?: TeamId | null
): TeamRecord | null {
  if (!data) return null;

  const resolvedTeamId = teamId ?? data.selectedTeamId;
  if (!resolvedTeamId) return null;

  return data.teams.find((team) => team.id === resolvedTeamId) ?? null;
}

export function formatTeamsUsd(
  value: UsdDecimalString,
  maximumFractionDigits = 0
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0";

  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  });
}

export function formatTeamsDecimal(
  value: DecimalString,
  maximumFractionDigits = 2
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";

  return numeric.toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

export function formatTeamsTokenAmount(
  value: DecimalString,
  symbol?: string,
  maximumFractionDigits = symbol ? 2 : 4
): string {
  const amount = formatTeamsDecimal(value, maximumFractionDigits);
  return symbol ? `${amount} ${symbol}` : amount;
}

export function formatTeamsAmount(
  value: DecimalString,
  maximumFractionDigits = 4
): string {
  return formatTeamsDecimal(value, maximumFractionDigits);
}

export function formatTeamsPercentFromBps(
  value: BasisPoints,
  maximumFractionDigits = 0
): string {
  const numeric = value / 10_000;
  if (!Number.isFinite(numeric)) return "0%";

  return numeric.toLocaleString("en-US", {
    style: "percent",
    maximumFractionDigits,
  });
}

const TEAMS_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatTeamsDate(value: UnixTimestampSeconds | null | undefined) {
  if (typeof value !== "number") return null;
  return TEAMS_DATE_FORMATTER.format(value * 1000);
}

export function estimateRevenueCreditUsd(
  option: RevenueOption,
  amount: DecimalString
): UsdDecimalString | null {
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;

  const quotedAmount = Number(option.previewAmount);
  const quotedCredit = Number(option.estimatedCreditUsd);

  if (
    Number.isFinite(quotedAmount) &&
    quotedAmount > 0 &&
    Number.isFinite(quotedCredit)
  ) {
    return ((parsedAmount / quotedAmount) * quotedCredit).toFixed(2);
  }

  const oraclePriceUsd = Number(option.oraclePriceUsd);
  if (!Number.isFinite(oraclePriceUsd)) return null;

  return (parsedAmount * oraclePriceUsd).toFixed(2);
}

export function getFinancialNetState(financials: TeamFinancials) {
  const profit = Number(financials.profitUsd);
  const loss = Number(financials.lossUsd);

  if (Number.isFinite(loss) && loss > 0) {
    return {
      label: "Loss",
      value: financials.lossUsd,
      tone: "loss" as const,
    };
  }

  if (Number.isFinite(profit) && profit > 0) {
    return {
      label: "Profit",
      value: financials.profitUsd,
      tone: "profit" as const,
    };
  }

  return {
    label: "Net",
    value: "0.00" as UsdDecimalString,
    tone: "neutral" as const,
  };
}

const DECIMAL_SCALE = 1_000_000;
const stableFundingSymbols = new Set(["USDC", "DAI", "yvUSDC-1", "yvDAI"]);

type ApplyMockFundingClaimInput = {
  approvalId: string;
  amount: DecimalString;
  recipient: TeamsAddress;
};

type ApplyMockFundingReturnInput = {
  approvalId: string;
  amount: DecimalString;
  returnedBy: TeamsAddress;
  currentPeriod: number;
  createdAt?: number;
};

export function isTeamsFundingApprovalClaimable(approval: FundingApproval): boolean {
  return (
    toScaledInteger(approval.claimable) > 0 &&
    approval.status !== "fully-used" &&
    approval.status !== "not-current-period"
  );
}

export function isTeamsFundingApprovalReturnable(approval: FundingApproval): boolean {
  return toScaledInteger(approval.used) > 0 && toScaledInteger(approval.refundValueUsd) > 0;
}

export function deriveTeamsFundingSummary(
  approvals: FundingApproval[]
): TeamFundingSummary {
  if (approvals.length === 0) {
    return {
      state: "no-approvals",
      claimableUsd: "0.00",
      refundableUsd: "0.00",
    };
  }

  const hasClaimableBalance = approvals.some(
    (approval) => toScaledInteger(approval.claimable) > 0
  );
  const hasUsedBalance = approvals.some((approval) => toScaledInteger(approval.used) > 0);
  const hasLateLiquidBalance = approvals.some(
    (approval) =>
      approval.status === "late-liquid" && toScaledInteger(approval.claimable) > 0
  );

  const claimableUsdCents = approvals.reduce((sum, approval) => {
    if (!stableFundingSymbols.has(approval.symbol)) {
      return sum;
    }

    return sum + toUsdCents(approval.claimable);
  }, 0);

  const refundableUsdCents = approvals.reduce(
    (sum, approval) => sum + toUsdCents(approval.refundValueUsd),
    0
  );

  return {
    state:
      !hasClaimableBalance
        ? "fully-used"
        : hasLateLiquidBalance
          ? "late-liquid-available"
          : hasUsedBalance
            ? "partially-claimed"
            : "has-claimable",
    claimableUsd: centsToUsdDecimalString(claimableUsdCents),
    refundableUsd: centsToUsdDecimalString(refundableUsdCents),
  };
}

export function applyMockTeamsFundingClaim(
  team: TeamRecord,
  { approvalId, amount, recipient }: ApplyMockFundingClaimInput,
  currentPeriod: number
): TeamRecord {
  const amountUnits = toScaledInteger(amount);

  if (amountUnits <= 0) {
    throw new Error("Claim amount must be greater than zero.");
  }

  let approvalMatched = false;
  const nextApprovals = team.fundingApprovals.map((approval) => {
    if (approval.id !== approvalId) {
      return approval;
    }

    approvalMatched = true;

    if (!isTeamsFundingApprovalClaimable(approval)) {
      throw new Error("Approval is not claimable in the current prototype state.");
    }

    const claimableUnits = toScaledInteger(approval.claimable);
    if (amountUnits > claimableUnits) {
      throw new Error("Claim amount exceeds the remaining balance.");
    }

    const nextClaimableUnits = claimableUnits - amountUnits;
    const nextUsedUnits = toScaledInteger(approval.used) + amountUnits;
    const claimPriceUsd = resolveTeamsFundingUnitPriceUsd(approval);
    const nextClaimedCostUsdCents = sumUsdByAmount(
      approval.claimedCostUsd,
      amount,
      claimPriceUsd
    );
    const nextRefundValueUsdCents =
      claimPriceUsd === null
        ? toUsdCents(approval.refundValueUsd)
        : sumUsdByAmount(approval.refundValueUsd, amount, claimPriceUsd);

    return {
      ...approval,
      used: scaledIntegerToDecimalString(nextUsedUnits),
      claimable: scaledIntegerToDecimalString(nextClaimableUnits),
      recipient,
      status: deriveFundingApprovalStatus(
        approval.approvedPeriod,
        nextUsedUnits,
        nextClaimableUnits,
        currentPeriod
      ),
      claimedCostUsd: centsToUsdDecimalString(nextClaimedCostUsdCents),
      refundValueUsd: centsToUsdDecimalString(nextRefundValueUsdCents),
      averageClaimPriceUsd:
        claimPriceUsd === null ? approval.averageClaimPriceUsd : claimPriceUsd.toFixed(2),
    };
  });

  if (!approvalMatched) {
    throw new Error(`Unknown funding approval: ${approvalId}`);
  }

  return {
    ...team,
    fundingApprovals: nextApprovals,
    fundingSummary: deriveTeamsFundingSummary(nextApprovals),
  };
}

export function applyMockTeamsFundingReturn(
  team: TeamRecord,
  { approvalId, amount, returnedBy, currentPeriod, createdAt }: ApplyMockFundingReturnInput
): TeamRecord {
  const amountUnits = toScaledInteger(amount);
  const originalApproval = team.fundingApprovals.find(
    (approval) => approval.id === approvalId
  );

  if (amountUnits <= 0) {
    throw new Error("Return amount must be greater than zero.");
  }

  if (!originalApproval) {
    throw new Error(`Unknown funding approval: ${approvalId}`);
  }

  const nextApprovals = team.fundingApprovals.map((approval) => {
    if (approval.id !== approvalId) {
      return approval;
    }

    if (!isTeamsFundingApprovalReturnable(approval)) {
      throw new Error("Approval has no refundable funding in this prototype state.");
    }

    const usedUnits = toScaledInteger(approval.used);
    if (amountUnits > usedUnits) {
      throw new Error("Return amount exceeds the used balance.");
    }

    const claimPriceUsd = resolveTeamsFundingUnitPriceUsd(approval);
    if (claimPriceUsd === null) {
      throw new Error("Refund estimate is unavailable for this approval.");
    }

    const refundableUsdCents = toUsdCents(approval.refundValueUsd);
    const returnValueUsdCents = calculateUsdValueCents(amount, claimPriceUsd);
    if (returnValueUsdCents > refundableUsdCents) {
      throw new Error("Return amount exceeds the refundable value.");
    }

    const nextUsedUnits = usedUnits - amountUnits;
    const nextClaimableUnits = toScaledInteger(approval.claimable) + amountUnits;
    const nextRefundValueUsdCents = refundableUsdCents - returnValueUsdCents;
    const nextClaimedCostUsdCents = Math.max(
      0,
      toUsdCents(approval.claimedCostUsd) - returnValueUsdCents
    );

    return {
      ...approval,
      used: scaledIntegerToDecimalString(nextUsedUnits),
      claimable: scaledIntegerToDecimalString(nextClaimableUnits),
      status: deriveFundingApprovalStatus(
        approval.approvedPeriod,
        nextUsedUnits,
        nextClaimableUnits,
        currentPeriod
      ),
      claimedCostUsd: centsToUsdDecimalString(nextClaimedCostUsdCents),
      refundValueUsd: centsToUsdDecimalString(nextRefundValueUsdCents),
    };
  });

  const claimPriceUsd = resolveTeamsFundingUnitPriceUsd(originalApproval);
  if (claimPriceUsd === null) {
    throw new Error("Refund estimate is unavailable for this approval.");
  }

  const nextReturnEntry: FundingReturnEntry = {
    id: createFundingReturnEntryId(team, currentPeriod),
    approvalId,
    period: currentPeriod,
    symbol: originalApproval.symbol,
    amount,
    refundValueUsd: centsToUsdDecimalString(calculateUsdValueCents(amount, claimPriceUsd)),
    returnedBy,
    createdAt: createdAt ?? Math.floor(Date.now() / 1000),
  };

  return {
    ...team,
    fundingApprovals: nextApprovals,
    fundingReturns: [nextReturnEntry, ...team.fundingReturns],
    fundingSummary: deriveTeamsFundingSummary(nextApprovals),
  };
}

function deriveFundingApprovalStatus(
  approvedPeriod: number,
  usedUnits: number,
  claimableUnits: number,
  currentPeriod: number
): FundingApprovalStatus {
  if (claimableUnits <= 0) {
    return "fully-used";
  }

  if (approvedPeriod > currentPeriod) {
    return "not-current-period";
  }

  if (approvedPeriod < currentPeriod) {
    return "late-liquid";
  }

  return usedUnits > 0 ? "partially-claimed" : "claimable-current-period";
}

export function resolveTeamsFundingUnitPriceUsd(
  approval: FundingApproval
): number | null {
  const explicitAverage = Number(approval.averageClaimPriceUsd);
  if (Number.isFinite(explicitAverage) && explicitAverage > 0) {
    return explicitAverage;
  }

  const usedUnits = toScaledInteger(approval.used);
  const claimedCostUsdCents = toUsdCents(approval.claimedCostUsd);
  if (usedUnits > 0 && claimedCostUsdCents > 0) {
    return claimedCostUsdCents / 100 / (usedUnits / DECIMAL_SCALE);
  }

  if (stableFundingSymbols.has(approval.symbol)) {
    return 1;
  }

  return null;
}

function createFundingReturnEntryId(team: TeamRecord, currentPeriod: number): string {
  const nextIndex =
    team.fundingReturns.filter((entry) => entry.period === currentPeriod).length + 1;

  return `return-${team.id}-${currentPeriod}-${nextIndex}`;
}

function sumUsdByAmount(
  currentUsdValue: UsdDecimalString,
  amount: DecimalString,
  unitPriceUsd: number | null
): number {
  const currentCents = toUsdCents(currentUsdValue);

  if (unitPriceUsd === null) {
    return currentCents;
  }

  return currentCents + calculateUsdValueCents(amount, unitPriceUsd);
}

function calculateUsdValueCents(amount: DecimalString, unitPriceUsd: number): number {
  return Math.round(Number(amount) * unitPriceUsd * 100);
}

function toScaledInteger(value: DecimalString): number {
  return Math.round(Number(value) * DECIMAL_SCALE);
}

function scaledIntegerToDecimalString(value: number): DecimalString {
  return (value / DECIMAL_SCALE).toFixed(6).replace(/\.?0+$/, "") || "0";
}

function toUsdCents(value: DecimalString | UsdDecimalString): number {
  return Math.round(Number(value) * 100);
}

function centsToUsdDecimalString(value: number): UsdDecimalString {
  return (value / 100).toFixed(2);
}
