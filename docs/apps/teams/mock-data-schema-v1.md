# Team Finances Mock Data Schema v1

Purpose: a stable mock data contract for design, prototypes, and mock-backed implementation.

## Type shape

```ts
type TeamsMockDataV1 = {
  version: 1;
  generatedAt: number;
  currentPeriod: number;
  totals: {
    globalRevenueUsd: string;
    globalCostUsd: string;
    globalProfitUsd: string;
    globalLossUsd: string;
  };
  teams: TeamRecord[];
  admin?: TeamsAdminRecord;
};

type TeamRecord = {
  id: string;
  name: string;
  address: string;
  owner: string;
  pendingOwner: string | null;
  status: "active" | "retiring" | "retired";
  currentPeriod: {
    revenueUsd: string;
    costUsd: string;
    profitUsd: string;
    lossUsd: string;
  };
  lifetime: {
    revenueUsd: string;
    costUsd: string;
    profitUsd: string;
    lossUsd: string;
  };
  revenueOptions: RevenueOption[];
  revenueHistory: RevenueHistoryEntry[];
  fundingApprovals: FundingApproval[];
  bonus: TeamBonusState;
};

type RevenueOption = {
  symbol: string;
  tokenAddress: string;
  decimals: number;
  isConvertible: boolean;
  convertToSymbol?: string;
  oraclePriceUsd: string;
  estimatedCreditUsd: string;
};

type RevenueHistoryEntry = {
  id: string;
  period: number;
  symbol: string;
  amount: string;
  creditedUsd: string;
  convertedToSymbol?: string;
  depositedBy: string;
  createdAt: number;
};

type FundingApproval = {
  id: string;
  idx: number;
  approvedPeriod: number;
  symbol: string;
  tokenAddress: string;
  totalApproved: string;
  used: string;
  claimable: string;
  streamDurationDays: number;
  status:
    | "claimable"
    | "partial"
    | "streaming"
    | "late-liquid"
    | "not-current-period"
    | "fully-used";
  recipient: string | null;
  claimedCostUsd: string;
  refundValueUsd?: string;
  averageClaimPriceUsd?: string;
};

type TeamBonusState = {
  tokenSymbol: "YFI";
  totalClaimable: string;
  periods: BonusPeriod[];
};

type BonusPeriod = {
  period: number;
  finalized: boolean;
  claimed: boolean;
  profitUsd: string;
  spotPriceUsd: string;
  adjustedPriceUsd: string;
  growthFactorBps: number;
  ybcSplitBps: number;
  claimableYfi: string;
};

type TeamsAdminRecord = {
  registryStatus: "active" | "deprecated";
  rewardsBucket: BucketRecord;
  treasuryBucket: BucketRecord;
  recoveryBucket: BucketRecord;
  whitelistedRevenueTokens: string[];
};

type BucketRecord = {
  budget: string;
  used: string;
  remaining: string;
};
```

## Rules

- token amounts are strings to preserve precision
- USD values are strings in decimal presentation for mocks
- all timestamps are unix seconds
- funding approvals are period-scoped and can change status over time
- bonus periods can exist before they are finalized, but claimable amounts should remain `"0"` until finalized
