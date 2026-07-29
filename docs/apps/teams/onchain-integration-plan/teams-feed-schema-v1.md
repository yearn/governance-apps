# Teams Feed Schema (v1 compatibility and v2 units)

This is the consumer-owned contract for the `teams.json` feed produced by
`gov-apps-stats` and consumed by the `/teams` app.

## 1. Feed URL

Frontend env key:

```text
NEXT_PUBLIC_TEAMS_DATA_URL
```

This is the one stable Teams feed URL. Browser examples use `/api/teams-data`; there is
no versioned public endpoint.

## 2. General rules

- `version: 1` is accepted only for transition compatibility.
- `version: 2` requires the exact `units` block shown below.
- `chainId` must be `1` for mainnet.
- `generatedAt` is unix seconds.
- `blockNumber` and `blockHash` describe the snapshot block.
- A v2 `blockNumber` must be at or after corrected accounting block `25,633,144`.
- Raw amounts are unsigned integer strings no larger than `uint256`.
- Every v2 financial and event USD field uses 18-decimal base units.
- Revenue-recipient balances use their declared token's decimals, not USD decimals.
- Addresses and hashes are non-zero hex values. Optional addresses use `null`.
- Timestamps are unix seconds no greater than `4_294_967_295`.
- Arrays are deterministically sorted.
- Unknown optional fields may be omitted or set to `null`.

The consumer allows at most a 2 MiB response and a 10-second fetch-plus-body read.
Limits are 256 tokens, 512 teams, 1,024 periods per bounded period collection, and
4,096 approvals or events per bounded event collection. Team names are limited to 128
characters, token symbols to 32, token names and source refs to 128, and event ids to
160.

## 3. Type shape

```ts
type Address = `0x${string}`;
type IntegerString = string;

type TeamsFeed = {
  version: 1 | 2;
  units?: TeamsFeedUnits;
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

type TeamsFeedUnits = {
  usd: {
    symbol: "USD";
    decimals: 18;
    scope: "all-financial-and-event-usd";
  };
  bonusToken: {
    symbol: "YFI";
    decimals: 18;
  };
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
  // Compatibility hint only. Production consumers must derive connected-wallet action
  // eligibility from raw feed state, wallet state, and write simulation.
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
  token?: Address;
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

## 4. Version behavior

The feed must be sufficient for the frontend to render a complete read-only Teams app
without connected-wallet historical indexing.

`availableActions` is retained for compatibility with the current producer shape,
but it is not an authoritative permission model. `gov-apps-stats` should not spend extra
work deriving wallet-specific write eligibility for this field. Production consumers must
derive CTA availability client side from the raw feed state, connected wallet, current
chain, balances/allowances where relevant, and write simulation.

The frontend may add live wallet overlays for:

- connected wallet balances and allowances;
- whether the connected wallet is the current team owner;
- whether the raw feed state plus wallet state makes a launch write eligible;
- write simulation and transaction submission;
- post-write invalidation while waiting for the next feed refresh.

The frontend never infers USD units from value size. V1 remains usable for identity,
lifecycle, token amounts, and nonfinancial display, but all financial values are
unavailable. V2 makes financial values eligible only when it supplies the exact unit
metadata above and passes the full schema and canonical snapshot checks.

For v2, every financial object must conserve revenue and cost:

```text
profit = max(revenue - cost, 0)
loss = max(cost - revenue, 0)
```

## 5. Producer notes

- Keep addresses, ids, indices, event ids, and transaction-log coordinates unique in
  their scopes. All team, period, token, approval, and event references must resolve.
- V2 must include a complete revenue-recipient balance group: `token`, `lastBalance`,
  `sumBalance`, and `used` are either all present or all absent. Legacy v1 may omit the
  token only for an all-zero tuple.
- Token splits total exactly 10,000 basis points.
- Funding returns cannot exceed recorded claim units for the same team, period, and
  token.
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

This file is a synthetic schema and test fixture. Its addresses, block metadata, and
amounts are not production data and it must never be published as a release candidate.
