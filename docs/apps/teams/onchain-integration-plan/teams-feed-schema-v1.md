# Teams Feed Schema (v1)

This is the consumer-owned contract for the `teams.json` feed produced by
`gov-apps-stats` and consumed by the `/teams` app.

## 1. Feed URL

Recommended frontend env key:

```text
NEXT_PUBLIC_TEAMS_DATA_URL
```

The feed should be independent from the shared stYFI/veYFI global stats payload.

## 2. General rules

- `version` must be `1`.
- `chainId` must be `1` for mainnet.
- `generatedAt` is unix seconds.
- `blockNumber` and `blockHash` describe the snapshot block.
- All token amounts, prices, shares, weights, and USD values are base-unit integer
  strings.
- Addresses are hex strings; frontend consumers normalize before comparing.
- Timestamps are unix seconds.
- Arrays are deterministically sorted.
- Unknown optional fields may be omitted or set to `null`.

## 3. Type shape

```ts
type Address = `0x${string}`;
type IntegerString = string;

type TeamsFeedV1 = {
  version: 1;
  chainId: 1;
  generatedAt: number;
  blockNumber: number;
  blockHash: string;
  deployment: TeamsDeployment;
  periods: TeamsPeriods;
  tokens: Record<Address, TeamsToken>;
  teams: TeamsTeam[];
  fundingApprovals: TeamsFundingApproval[];
  bonus: TeamsBonusState;
  revenueRecipient: TeamsRevenueRecipientState;
  accountant: TeamsAccountantState;
  events: TeamsEventSummary;
};

type TeamsDeployment = {
  budgetGenesis: number;
  deployBlock: number;
  teamRegistry: Address;
  teamImplementation: Address;
  teamAccountant: Address;
  revenueRecipient: Address;
  revenuePriceOracle: Address;
  fundingDistributor: Address;
  bonusDistributor: Address;
  bonusPriceOracle: Address;
  ybcBonusRecipient: Address;
  yfi: Address;
  multicall3: Address;
  source: {
    repo: "styfi";
    ref: string;
  };
};

type TeamsPeriods = {
  current: number;
  lengthSeconds: number;
  currentStartsAt: number;
  currentEndsAt: number;
  indexed: number[];
};

type TeamsToken = {
  address: Address;
  symbol: string;
  name: string | null;
  decimals: number;
  kind: "revenue" | "funding" | "bonus" | "unknown";
  priceOracle: Address | null;
  converter: Address | null;
};

type TeamsTeam = {
  index: number;
  address: Address;
  name: string;
  owner: Address;
  pendingOwner: Address | null;
  status: "active" | "retiring" | "retired" | "migrated" | "unknown";
  retirementPeriod: number | null;
  isRegisteredAtSnapshot: boolean;
  successor: Address | null;
  periods: TeamsTeamPeriod[];
  lifetime: TeamsFinancials;
  claimCursor: {
    nextBonusPeriod: number;
  };
  availableActions: {
    canDepositRevenue: boolean;
    canClaimFunding: boolean;
    canReturnFunding: boolean;
    canClaimBonus: boolean;
  };
};

type TeamsTeamPeriod = {
  period: number;
  startsAt: number;
  endsAt: number;
  financials: TeamsFinancials;
  revenueDeposits: TeamsRevenueDeposit[];
  fundingApprovalIds: number[];
  bonus: TeamsBonusPeriod | null;
};

type TeamsFinancials = {
  revenueUsd: IntegerString;
  costUsd: IntegerString;
  profitUsd: IntegerString;
  lossUsd: IntegerString;
};

type TeamsRevenueDeposit = {
  id: string;
  team: Address;
  period: number;
  token: Address;
  amount: IntegerString;
  revenueUsd: IntegerString;
  depositor: Address;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number | null;
};

type TeamsFundingApproval = {
  id: number;
  team: Address;
  period: number;
  token: Address;
  amount: IntegerString;
  used: IntegerString;
  claimable: IntegerString;
  durationSeconds: number;
  status: "pending" | "claimable" | "fully_claimed" | "expired" | "inactive_team";
  averageCostPriceUsd: IntegerString | null;
  claims: TeamsFundingClaim[];
  returns: TeamsFundingReturn[];
};

type TeamsFundingClaim = {
  id: string;
  approvalId: number;
  team: Address;
  period: number;
  token: Address;
  amount: IntegerString;
  costUsd: IntegerString;
  vest: Address | null;
  recipient: Address;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number | null;
};

type TeamsFundingReturn = {
  id: string;
  approvalId: number;
  team: Address;
  period: number;
  token: Address;
  amount: IntegerString;
  refundUsd: IntegerString;
  sender: Address;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number | null;
};

type TeamsBonusState = {
  token: Address;
  pendingPeriod: number;
  finalizedPeriods: TeamsBonusParameters[];
  claims: TeamsBonusClaim[];
};

type TeamsBonusParameters = {
  period: number;
  bonusFactorBps: number;
  ybcSplitBps: number;
  bonusPriceUsd: IntegerString;
};

type TeamsBonusPeriod = {
  period: number;
  status: "unfinalized" | "claimable" | "claimed" | "not_profitable" | "unavailable";
  claimableYfi: IntegerString;
  ybcAmountYfi: IntegerString;
  teamAmountYfi: IntegerString;
  parameters: TeamsBonusParameters | null;
};

type TeamsBonusClaim = {
  id: string;
  team: Address;
  period: number;
  amountYfi: IntegerString;
  ybcAmountYfi: IntegerString;
  recipient: Address;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number | null;
};

type TeamsRevenueRecipientState = {
  address: Address;
  killed: boolean;
  operator: Address | null;
  treasury: Address | null;
  rewardDistributor: Address | null;
  recoveryAuction: Address | null;
  tokenSplitBps: [number, number, number];
  lastBalance: IntegerString | null;
  sumBalance: IntegerString | null;
  used: [IntegerString, IntegerString, IntegerString] | null;
};

type TeamsAccountantState = {
  globalByPeriod: Array<{
    period: number;
    financials: TeamsFinancials;
  }>;
  lifetime: TeamsFinancials;
};

type TeamsEventSummary = {
  firstIndexedBlock: number;
  lastIndexedBlock: number;
  teamCount: number;
  revenueDepositCount: number;
  fundingApprovalCount: number;
  fundingClaimCount: number;
  fundingReturnCount: number;
  bonusClaimCount: number;
};
```

## 4. Required v1 behavior

The feed must be sufficient for the frontend to render a complete read-only Teams app
without connected-wallet historical indexing.

The frontend may add live wallet overlays for:

- connected wallet balances and allowances;
- whether the connected wallet is the current team owner;
- write simulation and transaction submission;
- post-write invalidation while waiting for the next feed refresh.

## 5. Producer notes

- `BonusDistributor.finalize_period()` does not emit a dedicated finalization event.
  Read `pending_period()` and `parameters(period)` from the contract.
- Use `TEAMS_DEPLOY_BLOCK` from `styfi/deployment.json` as the default historical scan
  start for Teams events.
- Discover `Team` proxy addresses from `TeamRegistry.AddTeam`, then subscribe to events
  on each team address.
- Discover accepted revenue/funding tokens from setter and usage events, then verify with
  `RevenueRecipient.oracles(token)`, `RevenueRecipient.converters(token)`, and
  `FundingDistributor.oracles(token)`.
- Derive `claimable` for funding approvals from `FundingDistributor.claimable(id)` at the
  snapshot block.
- Keep financial math in the producer or domain client, not in page components.

## 6. Example

See:

- `docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json`
