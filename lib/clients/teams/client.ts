import { formatUnits, parseUnits } from "viem";
import { formatUtcDate } from "@/lib/date";
import {
  formatDecimalAmount,
  formatPercent,
  UNAVAILABLE_VALUE,
} from "@/lib/format";
import type {
  BasisPoints,
  DecimalString,
  FundingApproval,
  FundingApprovalStatus,
  FundingReturnEntry,
  RevenueOption,
  RawTokenAmountString,
  TeamFinancials,
  TeamFundingSummary,
  TeamId,
  TeamRecord,
  TeamsMockDataV1,
  TeamsMockExampleScenariosV1,
  TeamsMockScenario,
  TeamsMockScenarioId,
  TeamsAddress,
  TeamsDepositReadiness,
  TeamsViewerContext,
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
  getPageState(): Promise<{
    presetId: TeamsMockScenarioId;
    data: TeamsMockDataV1;
    isLoading: boolean;
    isEmpty: boolean;
    currentTimeSeconds: number;
    periodBase: number;
    periodAnchorTimeSeconds: number;
    timeTravelDays: number;
  }>;
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

export function getTeamsDepositReadiness(
  team: TeamRecord,
  viewer: TeamsViewerContext | null,
  liveMode: boolean
): TeamsDepositReadiness {
  if (viewer?.actionStateTrusted === false) {
    return { state: "untrusted", canSubmit: false };
  }

  if (
    team.readOnlyReason !== null ||
    team.status !== "active" ||
    viewer?.canDepositRevenue === false
  ) {
    return { state: "restricted", canSubmit: false };
  }

  if (team.revenueOptions.length === 0) {
    return { state: "unsupported", canSubmit: false };
  }

  if (!liveMode) {
    return { state: "ready", canSubmit: true };
  }

  if (!viewer?.address || viewer.walletStatus === "disconnected") {
    return { state: "disconnected", canSubmit: false };
  }

  if (viewer.walletStatus === "switch-mainnet") {
    return { state: "switch-mainnet", canSubmit: false };
  }

  return { state: "ready", canSubmit: true };
}

export function deriveTeamsViewerForTeam(
  viewer: TeamsViewerContext,
  team: TeamRecord,
  currentPeriod: number | null = null
): TeamsViewerContext {
  const normalizedAddress = viewer.address?.toLowerCase() ?? null;
  const walletStatus =
    viewer.walletStatus ??
    (normalizedAddress === null ? "disconnected" : "mainnet");
  const isMainnetAccount =
    normalizedAddress !== null && walletStatus === "mainnet";
  const actionStateTrusted = viewer.actionStateTrusted !== false;
  const isTeamOwner =
    normalizedAddress !== null &&
    normalizedAddress === team.owner.toLowerCase();
  const canReceiveRevenue =
    actionStateTrusted &&
    team.readOnlyReason === null &&
    team.status === "active" &&
    viewer.revenueDepositsEnabled !== false;

  return {
    ...viewer,
    walletStatus,
    canDepositRevenue: canReceiveRevenue,
    canClaimFunding:
      actionStateTrusted &&
      isMainnetAccount &&
      isTeamOwner &&
      currentPeriod !== null &&
      team.fundingApprovals.some((approval) =>
        isTeamsFundingApprovalClaimable(approval, currentPeriod)
      ),
    canReturnFunding:
      actionStateTrusted &&
      isMainnetAccount &&
      currentPeriod !== null &&
      team.fundingApprovals.some((approval) =>
        isTeamsFundingApprovalReturnable(approval, currentPeriod)
      ),
    canClaimBonus:
      actionStateTrusted &&
      isMainnetAccount &&
      isTeamOwner &&
      team.bonus.status === "claimable" &&
      isPositiveRawTokenAmount(team.bonus.totalClaimableRaw),
  };
}

export function formatTeamsUsd(
  value: UsdDecimalString,
  maximumFractionDigits = 0
): string {
  const formatted = formatTeamsDecimal(value, maximumFractionDigits);
  const minimumFractionDigits =
    maximumFractionDigits > 0 ? Math.min(2, maximumFractionDigits) : 0;
  return `$${padDecimalFraction(formatted, minimumFractionDigits)}`;
}

export function formatTeamsDecimal(
  value: DecimalString,
  maximumFractionDigits = 2
): string {
  const formatted = formatDecimalAmount(
    value,
    Math.max(0, Math.min(18, maximumFractionDigits))
  );
  return formatted === UNAVAILABLE_VALUE ||
    formatted.startsWith("<") ||
    formatted.startsWith(">-")
    ? "0"
    : formatted;
}

export function formatTeamsTokenAmount(
  value: DecimalString,
  symbol?: string,
  maximumFractionDigits = symbol ? 2 : 4
): string {
  const compactAmount = formatDecimalAmount(value, maximumFractionDigits);
  const amount =
    symbol && maximumFractionDigits === 2 && compactAmount.startsWith("<")
      ? formatDecimalAmount(value, 4)
      : compactAmount;
  return symbol ? `${amount} ${symbol}` : amount;
}

export function formatTeamsAmount(
  value: DecimalString,
  maximumFractionDigits = 4
): string {
  return formatDecimalAmount(value, maximumFractionDigits);
}

export function formatTeamsPercentFromBps(
  value: BasisPoints,
  maximumFractionDigits = 0
): string {
  return formatPercent(value / 10_000, maximumFractionDigits);
}

export function formatTeamsDate(value: UnixTimestampSeconds | null | undefined) {
  if (typeof value !== "number") return null;
  return formatUtcDate(value);
}

export function estimateRevenueCreditUsd(
  option: RevenueOption,
  amount: DecimalString
): UsdDecimalString | null {
  if (!option.previewAmount || !option.estimatedCreditUsd) return null;

  const input = parseUnsignedDecimal(amount);
  const quotedAmount = parseUnsignedDecimal(option.previewAmount);
  const quotedCredit = parseUnsignedDecimal(option.estimatedCreditUsd);
  if (
    !input ||
    !quotedAmount ||
    quotedAmount.raw <= 0n ||
    !quotedCredit ||
    input.raw <= 0n
  ) {
    return null;
  }

  const numerator =
    input.raw *
    quotedCredit.raw *
    10n ** BigInt(quotedAmount.scale + 2);
  const denominator =
    quotedAmount.raw *
    10n ** BigInt(input.scale + quotedCredit.scale);
  return centsToDecimalString(divideRounded(numerator, denominator));
}

export function getFinancialNetState(financials: TeamFinancials) {
  if (isPositiveTeamsDecimal(financials.lossUsd)) {
    return {
      label: "Loss",
      value: financials.lossUsd,
      tone: "loss" as const,
    };
  }

  if (isPositiveTeamsDecimal(financials.profitUsd)) {
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

export function addTeamsDecimalStrings(
  values: readonly DecimalString[]
): DecimalString {
  const parsed = values.map(parseSignedDecimal);
  if (parsed.some((value) => value === null)) return "0";

  const resolved = parsed.filter(
    (value): value is NonNullable<typeof value> => value !== null
  );
  const scale = resolved.reduce(
    (maximum, value) => Math.max(maximum, value.scale),
    0
  );
  const total = resolved.reduce(
    (sum, value) =>
      sum +
      (value.negative ? -value.raw : value.raw) *
        10n ** BigInt(scale - value.scale),
    0n
  );
  return scaledBigIntToDecimalString(total, scale);
}

export function isPositiveTeamsDecimal(value: DecimalString): boolean {
  const parsed = parseUnsignedDecimal(value);
  return parsed !== null && parsed.raw > 0n;
}

export function multiplyTeamsDecimalsToFixed(
  left: DecimalString,
  right: DecimalString,
  fractionDigits: number
): DecimalString | null {
  const leftValue = parseUnsignedDecimal(left);
  const rightValue = parseUnsignedDecimal(right);
  if (!leftValue || !rightValue) return null;

  const outputScale = Math.max(0, Math.min(18, fractionDigits));
  const product = leftValue.raw * rightValue.raw;
  const productScale = leftValue.scale + rightValue.scale;
  const scaled =
    productScale > outputScale
      ? divideRounded(product, 10n ** BigInt(productScale - outputScale))
      : product * 10n ** BigInt(outputScale - productScale);

  return scaledBigIntToFixedDecimalString(scaled, outputScale);
}

export function divideTeamsDecimalToRawUnits(
  numerator: DecimalString,
  denominator: DecimalString,
  outputDecimals: number
): bigint | null {
  const numeratorValue = parseUnsignedDecimal(numerator);
  const denominatorValue = parseUnsignedDecimal(denominator);
  if (
    !numeratorValue ||
    !denominatorValue ||
    numeratorValue.raw <= 0n ||
    denominatorValue.raw <= 0n ||
    outputDecimals < 0 ||
    outputDecimals > 36
  ) {
    return null;
  }

  const exponent =
    outputDecimals + denominatorValue.scale - numeratorValue.scale;
  const scaledNumerator =
    exponent >= 0
      ? numeratorValue.raw * 10n ** BigInt(exponent)
      : numeratorValue.raw;
  const scaledDenominator =
    exponent >= 0
      ? denominatorValue.raw
      : denominatorValue.raw * 10n ** BigInt(-exponent);

  return scaledNumerator / scaledDenominator;
}

export function getTeamsDecimalPercentage(
  numerator: DecimalString,
  denominator: DecimalString
): number {
  const numeratorValue = parseUnsignedDecimal(numerator);
  const denominatorValue = parseUnsignedDecimal(denominator);
  if (!numeratorValue || !denominatorValue || denominatorValue.raw <= 0n) {
    return 0;
  }

  const scaledNumerator =
    numeratorValue.raw *
    10n ** BigInt(denominatorValue.scale) *
    10_000n;
  const scaledDenominator =
    denominatorValue.raw * 10n ** BigInt(numeratorValue.scale);
  const hundredths = divideRounded(scaledNumerator, scaledDenominator);
  return Number(hundredths > 10_000n ? 10_000n : hundredths) / 100;
}

export function isPositiveRawTokenAmount(
  value: RawTokenAmountString
): boolean {
  return (
    typeof value === "string" &&
    /^(0|[1-9]\d*)$/.test(value) &&
    BigInt(value) > 0n
  );
}

export function parseTeamsTokenAmountRaw(
  value: DecimalString,
  decimals: number
): bigint | null {
  try {
    const amount = parseUnits(value, decimals);
    return amount >= 0n ? amount : null;
  } catch {
    return null;
  }
}

export function parsePositiveTeamsTokenAmountRaw(
  value: DecimalString,
  decimals: number
): bigint | null {
  const amount = parseTeamsTokenAmountRaw(value, decimals);
  return amount !== null && amount > 0n ? amount : null;
}

export function formatTeamsRawTokenAmount(
  value: RawTokenAmountString,
  decimals: number
): DecimalString {
  return formatUnits(BigInt(value), decimals);
}

export function getTeamsFundingReturnableRaw(
  approval: FundingApproval
): bigint {
  return isPositiveRawTokenAmount(approval.returnableRaw)
    ? BigInt(approval.returnableRaw)
    : 0n;
}

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

export function isTeamsFundingApprovalClaimable(
  approval: FundingApproval,
  currentPeriod: number
): boolean {
  return (
    approval.approvedPeriod === currentPeriod &&
    isPositiveRawTokenAmount(approval.claimableRaw) &&
    (approval.status === "claimable-current-period" ||
      approval.status === "partially-claimed")
  );
}

export function isTeamsFundingApprovalReturnable(
  approval: FundingApproval,
  currentPeriod: number
): boolean {
  return (
    approval.approvedPeriod === currentPeriod &&
    isPositiveRawTokenAmount(approval.returnableRaw)
  );
}

export function deriveTeamsFundingSummary(
  approvals: FundingApproval[],
  currentPeriod: number
): TeamFundingSummary {
  if (approvals.length === 0) {
    return {
      state: "no-approvals",
      claimableUsd: null,
      refundableUsd: "0.00",
    };
  }

  const currentClaimableApprovals = approvals.filter((approval) =>
    isTeamsFundingApprovalClaimable(approval, currentPeriod)
  );
  const hasClaimableBalance = currentClaimableApprovals.length > 0;
  const hasUsedBalance = currentClaimableApprovals.some((approval) =>
    isPositiveRawTokenAmount(approval.usedRaw)
  );
  const hasExpiredAllocation = approvals.some(
    (approval) =>
      approval.status === "expired" &&
      BigInt(approval.amountRaw) > BigInt(approval.usedRaw)
  );
  const hasCurrentUnavailableAllocation = approvals.some(
    (approval) =>
      approval.status === "current-unavailable" &&
      approval.approvedPeriod === currentPeriod &&
      BigInt(approval.amountRaw) > BigInt(approval.usedRaw)
  );
  const approvalsWithReturns = approvals.filter((approval) =>
    approval.approvedPeriod === currentPeriod &&
    isPositiveRawTokenAmount(approval.returnableRaw)
  );
  const refundableUsd =
    approvalsWithReturns.length === 0
      ? ("0.00" as UsdDecimalString)
      : approvalsWithReturns.every(
            (approval) => approval.refundValueUsd !== null
          )
        ? (toFixedTeamsDecimal(
            addTeamsDecimalStrings(
              approvalsWithReturns.map(
                (approval) => approval.refundValueUsd ?? "0"
              )
            ),
            2
          ) as UsdDecimalString)
        : null;

  return {
    state:
      !hasClaimableBalance
        ? hasCurrentUnavailableAllocation
          ? "current-unavailable"
          : hasExpiredAllocation
            ? "has-expired"
            : "fully-used"
        : hasExpiredAllocation
          ? "has-expired"
          : hasUsedBalance
            ? "partially-claimed"
            : "has-claimable",
    claimableUsd: null,
    refundableUsd,
  };
}

export function applyMockTeamsFundingClaim(
  team: TeamRecord,
  { approvalId, amount, recipient }: ApplyMockFundingClaimInput,
  currentPeriod: number
): TeamRecord {
  if (!isPositiveTeamsDecimal(amount)) {
    throw new Error("Claim amount must be greater than zero.");
  }

  let approvalMatched = false;
  const updatedApprovals = team.fundingApprovals.map((approval) => {
    if (approval.id !== approvalId) {
      return approval;
    }

    approvalMatched = true;

    if (!isTeamsFundingApprovalClaimable(approval, currentPeriod)) {
      throw new Error("Only a current-period approval can be claimed.");
    }

    const amountRaw = parseTeamsTokenAmountRaw(amount, approval.decimals);
    if (amountRaw === null || amountRaw <= 0n) {
      throw new Error("Claim amount must be greater than zero.");
    }
    if (amountRaw > BigInt(approval.claimableRaw)) {
      throw new Error("Claim amount exceeds the remaining balance.");
    }

    const nextClaimableRaw = BigInt(approval.claimableRaw) - amountRaw;
    const nextUsedRaw = BigInt(approval.usedRaw) + amountRaw;
    const nextClaimedRaw = BigInt(approval.claimedRaw) + amountRaw;
    const nextReturnableRaw =
      nextClaimedRaw > BigInt(approval.returnedRaw)
        ? nextClaimedRaw - BigInt(approval.returnedRaw)
        : 0n;
    const nextClaimable = formatTeamsRawTokenAmount(
      nextClaimableRaw.toString(),
      approval.decimals
    );
    const nextUsed = formatTeamsRawTokenAmount(
      nextUsedRaw.toString(),
      approval.decimals
    );
    const claimPriceUsd = resolveTeamsFundingUnitPriceDecimalUsd(approval);
    const nextClaimedCostUsd =
      claimPriceUsd === null
        ? null
        : sumUsdByRawAmount(
            approval.claimedCostUsd,
            amountRaw,
            approval.decimals,
            claimPriceUsd
          );
    const nextRefundValueUsd =
      claimPriceUsd === null
        ? null
        : sumUsdByRawAmount(
            approval.refundValueUsd,
            amountRaw,
            approval.decimals,
            claimPriceUsd
          );

    return {
      ...approval,
      usedRaw: nextUsedRaw.toString(),
      claimableRaw: nextClaimableRaw.toString(),
      claimedRaw: nextClaimedRaw.toString(),
      returnableRaw: nextReturnableRaw.toString(),
      used: nextUsed,
      claimable: nextClaimable,
      recipient,
      status: deriveFundingApprovalStatus(
        approval.approvedPeriod,
        nextUsedRaw,
        nextClaimableRaw,
        currentPeriod
      ),
      claimedCostUsd: nextClaimedCostUsd,
      refundValueUsd: nextRefundValueUsd,
      averageClaimPriceUsd:
        claimPriceUsd === null ? approval.averageClaimPriceUsd : claimPriceUsd,
    };
  });

  if (!approvalMatched) {
    throw new Error(`Unknown funding approval: ${approvalId}`);
  }
  const claimedApproval = updatedApprovals.find(
    (approval) => approval.id === approvalId
  )!;
  const nextApprovals = normalizeFundingReturnBucket(
    updatedApprovals,
    claimedApproval.approvedPeriod,
    claimedApproval.tokenAddress
  );

  return {
    ...team,
    fundingApprovals: nextApprovals,
    fundingSummary: deriveTeamsFundingSummary(nextApprovals, currentPeriod),
  };
}

export function applyMockTeamsFundingReturn(
  team: TeamRecord,
  { approvalId, amount, returnedBy, currentPeriod, createdAt }: ApplyMockFundingReturnInput
): TeamRecord {
  const originalApproval = team.fundingApprovals.find(
    (approval) => approval.id === approvalId
  );
  if (!originalApproval) {
    throw new Error(`Unknown funding approval: ${approvalId}`);
  }

  const amountRaw = parseTeamsTokenAmountRaw(amount, originalApproval.decimals);
  if (amountRaw === null || amountRaw <= 0n) {
    throw new Error("Return amount must be greater than zero.");
  }

  const bucketApprovals = team.fundingApprovals.filter(
    (approval) =>
      approval.approvedPeriod === originalApproval.approvedPeriod &&
      approval.tokenAddress.toLowerCase() ===
        originalApproval.tokenAddress.toLowerCase()
  );
  const returnSelector = bucketApprovals.reduce((selected, approval) =>
    approval.idx < selected.idx ? approval : selected
  );
  const aggregateClaimedRaw = bucketApprovals.reduce(
    (sum, approval) => sum + BigInt(approval.claimedRaw),
    0n
  );
  const aggregateReturnedRaw = bucketApprovals.reduce(
    (sum, approval) => sum + BigInt(approval.returnedRaw),
    0n
  );
  const aggregateReturnableRaw =
    aggregateClaimedRaw > aggregateReturnedRaw
      ? aggregateClaimedRaw - aggregateReturnedRaw
      : 0n;
  if (
    originalApproval.approvedPeriod !== currentPeriod ||
    originalApproval.id !== returnSelector.id ||
    aggregateReturnableRaw === 0n
  ) {
    throw new Error("Approval has no refundable funding in this prototype state.");
  }
  if (amountRaw > aggregateReturnableRaw) {
    throw new Error("Return amount exceeds the outstanding token balance.");
  }

  const updatedApprovals = team.fundingApprovals.map((approval) => {
    if (approval.id !== approvalId) {
      return approval;
    }

    const claimPriceUsd = resolveTeamsFundingUnitPriceDecimalUsd(approval);
    const returnValueUsd =
      claimPriceUsd === null
        ? null
        : calculateUsdValueFromRaw(
            amountRaw,
            approval.decimals,
            claimPriceUsd
          );
    const nextReturnedRaw = BigInt(approval.returnedRaw) + amountRaw;
    const nextRefundValueUsd =
      returnValueUsd === null || approval.refundValueUsd === null
        ? approval.refundValueUsd
        : subtractUnsignedTeamsDecimals(
            approval.refundValueUsd,
            returnValueUsd
          );
    const nextClaimedCostUsd =
      returnValueUsd === null || approval.claimedCostUsd === null
        ? approval.claimedCostUsd
        : subtractUnsignedTeamsDecimals(
            approval.claimedCostUsd,
            returnValueUsd
          );

    return {
      ...approval,
      returnedRaw: nextReturnedRaw.toString(),
      claimedCostUsd:
        nextClaimedCostUsd === null
          ? null
          : toFixedTeamsDecimal(nextClaimedCostUsd, 2),
      refundValueUsd:
        nextRefundValueUsd === null
          ? null
          : toFixedTeamsDecimal(nextRefundValueUsd, 2),
    };
  });
  const nextApprovals = normalizeFundingReturnBucket(
    updatedApprovals,
    originalApproval.approvedPeriod,
    originalApproval.tokenAddress
  );

  const claimPriceUsd = resolveTeamsFundingUnitPriceDecimalUsd(originalApproval);

  const nextReturnEntry: FundingReturnEntry = {
    id: createFundingReturnEntryId(team, currentPeriod),
    approvalId,
    approvalIdx: originalApproval.idx,
    period: currentPeriod,
    symbol: originalApproval.symbol,
    decimals: originalApproval.decimals,
    amountRaw: amountRaw.toString(),
    amount: formatTeamsRawTokenAmount(
      amountRaw.toString(),
      originalApproval.decimals
    ),
    refundValueUsd:
      claimPriceUsd === null
        ? null
        : calculateUsdValueFromRaw(
            amountRaw,
            originalApproval.decimals,
            claimPriceUsd
          ),
    returnedBy,
    createdAt: createdAt ?? Math.floor(Date.now() / 1000),
  };

  return {
    ...team,
    fundingApprovals: nextApprovals,
    fundingReturns: [nextReturnEntry, ...team.fundingReturns],
    fundingSummary: deriveTeamsFundingSummary(nextApprovals, currentPeriod),
  };
}

function normalizeFundingReturnBucket(
  approvals: FundingApproval[],
  approvedPeriod: number,
  tokenAddress: TeamsAddress
): FundingApproval[] {
  const bucket = approvals.filter(
    (approval) =>
      approval.approvedPeriod === approvedPeriod &&
      approval.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
  );
  if (bucket.length === 0) return approvals;
  const selector = bucket.reduce((selected, approval) =>
    approval.idx < selected.idx ? approval : selected
  );
  const claimedRaw = bucket.reduce(
    (sum, approval) => sum + BigInt(approval.claimedRaw),
    0n
  );
  const returnedRaw = bucket.reduce(
    (sum, approval) => sum + BigInt(approval.returnedRaw),
    0n
  );
  const returnableRaw =
    claimedRaw > returnedRaw ? claimedRaw - returnedRaw : 0n;
  const hasCompleteClaimedCost = bucket.every(
    (approval) => approval.claimedCostUsd !== null
  );
  const hasCompleteRefundValue = bucket.every(
    (approval) => approval.refundValueUsd !== null
  );
  const claimedCostUsd = hasCompleteClaimedCost
    ? (toFixedTeamsDecimal(
        addTeamsDecimalStrings(
          bucket.map((approval) => approval.claimedCostUsd ?? "0")
        ),
        2
      ) as UsdDecimalString)
    : null;
  const refundValueUsd = hasCompleteRefundValue
    ? (toFixedTeamsDecimal(
        addTeamsDecimalStrings(
          bucket.map((approval) => approval.refundValueUsd ?? "0")
        ),
        2
      ) as UsdDecimalString)
    : null;

  return approvals.map((approval) => {
    if (
      approval.approvedPeriod !== approvedPeriod ||
      approval.tokenAddress.toLowerCase() !== tokenAddress.toLowerCase()
    ) {
      return approval;
    }
    return {
      ...approval,
      returnableRaw:
        approval.id === selector.id ? returnableRaw.toString() : "0",
      claimedCostUsd:
        approval.id === selector.id ? claimedCostUsd : claimedCostUsd && "0.00",
      refundValueUsd:
        approval.id === selector.id ? refundValueUsd : refundValueUsd && "0.00",
    };
  });
}

function deriveFundingApprovalStatus(
  approvedPeriod: number,
  usedRaw: bigint,
  claimableRaw: bigint,
  currentPeriod: number
): FundingApprovalStatus {
  if (claimableRaw <= 0n) {
    return "fully-used";
  }

  if (approvedPeriod > currentPeriod) {
    return "scheduled";
  }

  if (approvedPeriod < currentPeriod) {
    return "expired";
  }

  return usedRaw > 0n
    ? "partially-claimed"
    : "claimable-current-period";
}

export function resolveTeamsFundingUnitPriceDecimalUsd(
  approval: FundingApproval
): UsdDecimalString | null {
  if (
    approval.averageClaimPriceUsd &&
    isPositiveTeamsDecimal(approval.averageClaimPriceUsd)
  ) {
    return approval.averageClaimPriceUsd;
  }

  if (
    approval.claimedCostUsd === null ||
    !isPositiveTeamsDecimal(approval.claimedCostUsd) ||
    !isPositiveRawTokenAmount(approval.returnableRaw)
  ) {
    return null;
  }

  return divideTeamsDecimalStrings(
    approval.claimedCostUsd,
    formatUnits(BigInt(approval.returnableRaw), approval.decimals),
    18
  );
}

function createFundingReturnEntryId(team: TeamRecord, currentPeriod: number): string {
  const nextIndex =
    team.fundingReturns.filter((entry) => entry.period === currentPeriod).length + 1;

  return `return-${team.id}-${currentPeriod}-${nextIndex}`;
}

function sumUsdByRawAmount(
  currentUsdValue: UsdDecimalString | null,
  amountRaw: bigint,
  decimals: number,
  unitPriceUsd: UsdDecimalString | null
): UsdDecimalString | null {
  if (unitPriceUsd === null) {
    return currentUsdValue;
  }

  return toFixedTeamsDecimal(
    addTeamsDecimalStrings([
      currentUsdValue ?? "0",
      calculateUsdValueFromRaw(amountRaw, decimals, unitPriceUsd),
    ]),
    2
  ) as UsdDecimalString;
}

function calculateUsdValueFromRaw(
  amountRaw: bigint,
  decimals: number,
  unitPriceUsd: UsdDecimalString
): UsdDecimalString {
  return (
    multiplyTeamsDecimalsToFixed(
      formatUnits(amountRaw, decimals),
      unitPriceUsd,
      2
    ) ?? "0.00"
  ) as UsdDecimalString;
}

function divideTeamsDecimalStrings(
  numerator: DecimalString,
  denominator: DecimalString,
  fractionDigits: number
): DecimalString | null {
  const numeratorValue = parseUnsignedDecimal(numerator);
  const denominatorValue = parseUnsignedDecimal(denominator);
  if (!numeratorValue || !denominatorValue || denominatorValue.raw <= 0n) {
    return null;
  }

  const outputScale = Math.max(0, Math.min(18, fractionDigits));
  const scaledNumerator =
    numeratorValue.raw *
    10n ** BigInt(denominatorValue.scale + outputScale);
  const scaledDenominator =
    denominatorValue.raw * 10n ** BigInt(numeratorValue.scale);
  return scaledBigIntToDecimalString(
    divideRounded(scaledNumerator, scaledDenominator),
    outputScale
  );
}

function subtractUnsignedTeamsDecimals(
  left: DecimalString,
  right: DecimalString
): DecimalString | null {
  const aligned = alignUnsignedTeamsDecimals(left, right);
  if (!aligned || aligned.right > aligned.left) return null;
  return scaledBigIntToDecimalString(
    aligned.left - aligned.right,
    aligned.scale
  );
}

function alignUnsignedTeamsDecimals(
  left: DecimalString,
  right: DecimalString
): { left: bigint; right: bigint; scale: number } | null {
  const leftValue = parseUnsignedDecimal(left);
  const rightValue = parseUnsignedDecimal(right);
  if (!leftValue || !rightValue) return null;

  const scale = Math.max(leftValue.scale, rightValue.scale);
  return {
    left: leftValue.raw * 10n ** BigInt(scale - leftValue.scale),
    right: rightValue.raw * 10n ** BigInt(scale - rightValue.scale),
    scale,
  };
}

function toFixedTeamsDecimal(
  value: DecimalString,
  fractionDigits: number
): DecimalString {
  return multiplyTeamsDecimalsToFixed(value, "1", fractionDigits) ?? "0";
}

type ParsedDecimal = {
  raw: bigint;
  scale: number;
  negative: boolean;
};

function parseSignedDecimal(value: string): ParsedDecimal | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;

  const fraction = match[3] ?? "";
  return {
    raw: BigInt(`${match[2]}${fraction}`),
    scale: fraction.length,
    negative: match[1] === "-",
  };
}

function parseUnsignedDecimal(value: string) {
  const parsed = parseSignedDecimal(value);
  return parsed && !parsed.negative ? parsed : null;
}

function divideRounded(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n) return 0n;
  return (numerator + denominator / 2n) / denominator;
}

function padDecimalFraction(value: string, minimumFractionDigits: number) {
  if (minimumFractionDigits <= 0) return value;

  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(minimumFractionDigits, "0")}`;
}

function centsToDecimalString(cents: bigint): UsdDecimalString {
  const padded = cents.toString().padStart(3, "0");
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}

function scaledBigIntToDecimalString(
  value: bigint,
  scale: number
): DecimalString {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  if (scale === 0) return `${negative ? "-" : ""}${absolute}`;

  const padded = absolute.toString().padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale) || "0";
  const fraction = padded.slice(-scale).replace(/0+$/, "");
  const normalized = fraction ? `${whole}.${fraction}` : whole;
  return `${negative && absolute > 0n ? "-" : ""}${normalized}`;
}

function scaledBigIntToFixedDecimalString(
  value: bigint,
  scale: number
): DecimalString {
  if (scale === 0) return value.toString();

  const padded = value.toString().padStart(scale + 1, "0");
  return `${padded.slice(0, -scale) || "0"}.${padded.slice(-scale)}`;
}
