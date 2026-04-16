export type TeamsMockExampleScenariosV1 = {
  version: 1;
  generatedAt: UnixTimestampSeconds;
  scenarios: TeamsMockScenario[];
};

export type TeamsMockScenario = {
  id: TeamsMockScenarioId;
  label: string;
  data: TeamsMockDataV1;
};

export type TeamsMockScenarioId =
  | "directory-observer"
  | "team-owner-funding"
  | "bonus-available"
  | "finance-operator-revenue"
  | "retired-read-only"
  | "operator-admin";

export type TeamsMockDataV1 = {
  version: 1;
  generatedAt: UnixTimestampSeconds;
  currentPeriod: PeriodNumber;
  viewer: TeamsViewerContext;
  selectedTeamId: TeamId | null;
  totals: TeamsTotals;
  teams: TeamRecord[];
  admin?: TeamsAdminRecord;
};

export type UnixTimestampSeconds = number;
export type PeriodNumber = number;
export type TeamId = string;
export type TeamsAddress = string;
export type DecimalString = string;
export type UsdDecimalString = string;
export type BasisPoints = number;

export type TeamsViewerContext = {
  role: TeamsViewerRole;
  address: TeamsAddress | null;
  teamId: TeamId | null;
  canDepositRevenue: boolean;
  canClaimFunding: boolean;
  canReturnFunding: boolean;
  canClaimBonus: boolean;
  canUseAdmin: boolean;
};

export type TeamsViewerRole =
  | "observer"
  | "team-owner"
  | "finance-operator"
  | "operator-admin";

export type TeamsTotals = {
  currentPeriod: TeamFinancials;
  lifetime: TeamFinancials;
  activeTeamCount: number;
  retiringTeamCount: number;
  retiredTeamCount: number;
};

export type TeamRecord = {
  id: TeamId;
  name: string;
  address: TeamsAddress;
  owner: TeamsAddress;
  pendingOwner: TeamsAddress | null;
  status: TeamLifecycleStatus;
  readOnlyReason: TeamReadOnlyReason | null;
  currentPeriod: TeamFinancials;
  lifetime: TeamFinancials;
  lifecycle: TeamLifecycleState;
  revenueOptions: RevenueOption[];
  revenueHistory: RevenueHistoryEntry[];
  fundingSummary: TeamFundingSummary;
  fundingApprovals: FundingApproval[];
  fundingReturns: FundingReturnEntry[];
  bonus: TeamBonusState;
};

export type TeamLifecycleStatus = "active" | "retiring" | "retired";
export type TeamReadOnlyReason = "retired" | "successor-active";

export type TeamFinancials = {
  revenueUsd: UsdDecimalString;
  costUsd: UsdDecimalString;
  profitUsd: UsdDecimalString;
  lossUsd: UsdDecimalString;
};

export type TeamLifecycleState = {
  migrationReadiness: TeamMigrationReadiness;
  successorTeamId: TeamId | null;
  retirementAnnouncedAt: UnixTimestampSeconds | null;
  retirementEffectivePeriod: PeriodNumber | null;
};

export type TeamMigrationReadiness =
  | "not-needed"
  | "pending"
  | "ready"
  | "completed";

export type RevenueOption = {
  symbol: string;
  tokenAddress: TeamsAddress;
  decimals: number;
  isConvertible: boolean;
  convertToSymbol: string | null;
  oraclePriceUsd: UsdDecimalString;
  previewAmount: DecimalString;
  estimatedCreditUsd: UsdDecimalString;
};

export type RevenueHistoryEntry = {
  id: string;
  period: PeriodNumber;
  symbol: string;
  amount: DecimalString;
  creditedUsd: UsdDecimalString;
  convertedToSymbol: string | null;
  depositedBy: TeamsAddress;
  createdAt: UnixTimestampSeconds;
};

export type TeamFundingSummary = {
  state: TeamFundingSummaryState;
  claimableUsd: UsdDecimalString;
  refundableUsd: UsdDecimalString;
};

export type TeamFundingSummaryState =
  | "no-approvals"
  | "has-claimable"
  | "partially-claimed"
  | "late-liquid-available"
  | "fully-used";

export type FundingApproval = {
  id: string;
  idx: number;
  approvedPeriod: PeriodNumber;
  symbol: string;
  tokenAddress: TeamsAddress;
  totalApproved: DecimalString;
  used: DecimalString;
  claimable: DecimalString;
  streamDurationDays: number;
  status: FundingApprovalStatus;
  recipient: TeamsAddress | null;
  claimedCostUsd: UsdDecimalString;
  refundValueUsd: UsdDecimalString;
  averageClaimPriceUsd: UsdDecimalString | null;
};

export type FundingApprovalStatus =
  | "claimable-current-period"
  | "partially-claimed"
  | "late-liquid"
  | "not-current-period"
  | "fully-used";

export type FundingReturnEntry = {
  id: string;
  approvalId: string;
  period: PeriodNumber;
  symbol: string;
  amount: DecimalString;
  refundValueUsd: UsdDecimalString;
  returnedBy: TeamsAddress;
  createdAt: UnixTimestampSeconds;
};

export type TeamBonusState = {
  tokenSymbol: "YFI";
  status: TeamBonusStatus;
  totalClaimable: DecimalString;
  includedPeriodCount: number;
  periods: BonusPeriod[];
};

export type TeamBonusStatus =
  | "none"
  | "pending-finalization"
  | "claimable"
  | "claimed";

export type BonusPeriod = {
  period: PeriodNumber;
  status: BonusPeriodStatus;
  finalized: boolean;
  claimed: boolean;
  profitUsd: UsdDecimalString;
  spotPriceUsd: UsdDecimalString;
  adjustedPriceUsd: UsdDecimalString;
  growthFactorBps: BasisPoints;
  ybcSplitBps: BasisPoints;
  claimableYfi: DecimalString;
};

export type BonusPeriodStatus =
  | "pending-finalization"
  | "finalized-claimable"
  | "finalized-zero"
  | "claimed";

export type TeamsAdminRecord = {
  registryStatus: TeamsRegistryStatus;
  periodFinalizationStatus: PeriodFinalizationStatus;
  rewardsBucket: BucketRecord;
  treasuryBucket: BucketRecord;
  recoveryBucket: BucketRecord;
  whitelistedRevenueTokens: RevenueTokenAdminRecord[];
  fundingQueue: AdminFundingQueueEntry[];
  bonusQueue: AdminBonusQueueEntry[];
};

export type TeamsRegistryStatus = "active" | "paused" | "deprecated";
export type PeriodFinalizationStatus = "open" | "ready" | "finalized";

export type BucketRecord = {
  budget: UsdDecimalString;
  used: UsdDecimalString;
  remaining: UsdDecimalString;
  status: BucketStatus;
};

export type BucketStatus = "healthy" | "watch" | "limit-reached";

export type RevenueTokenAdminRecord = {
  symbol: string;
  tokenAddress: TeamsAddress;
  oracle: TeamsAddress;
  converter: TeamsAddress | null;
  status: RevenueTokenAdminStatus;
};

export type RevenueTokenAdminStatus = "active" | "paused";

export type AdminFundingQueueEntry = {
  approvalId: string;
  teamId: TeamId;
  status: FundingApprovalStatus;
  requiresOperatorAttention: boolean;
};

export type AdminBonusQueueEntry = {
  teamId: TeamId;
  period: PeriodNumber;
  status: BonusPeriodStatus;
  requiresFinalization: boolean;
};
