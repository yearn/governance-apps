# YBC Feed Schema (v1)

This is the consumer-owned contract for the `ybc.json` feed produced by
`gov-apps-stats` and consumed by the `/ybc` app.

## 1. Feed URL

Recommended frontend env key:

```text
NEXT_PUBLIC_YBC_DATA_URL
```

The feed should be independent from the shared stYFI/veYFI global stats payload.

## 2. General rules

- `version` must be `1`.
- `chainId` must be `1` for mainnet.
- `generatedAt` is unix seconds.
- `blockNumber` and `blockHash` describe the snapshot block.
- All token amounts, prices, shares, weights, rewards, and vote weights are base-unit
  integer strings.
- Addresses are hex strings; frontend consumers normalize before comparing.
- Timestamps are unix seconds.
- Proposal status must be read from `YBCElection.status(id)` at the snapshot block.
- Per-viewer action eligibility is a frontend live overlay, not a global feed
  responsibility.

## 3. Type shape

```ts
type Address = `0x${string}`;
type IntegerString = string;

type YbcFeedV1 = {
  version: 1;
  chainId: 1;
  generatedAt: number;
  blockNumber: number;
  blockHash: string;
  deployment: YbcDeployment;
  epoch: YbcEpoch;
  config: YbcConfig;
  members: YbcMember[];
  proposals: YbcProposal[];
  votes: YbcVote[];
  rewards: YbcRewardsState;
  events: YbcEventSummary;
};

type YbcDeployment = {
  genesis: number;
  deployBlock: number;
  ybc: Address;
  ybcElection: Address;
  ybcWeightAggregator: Address;
  ybcRewardDistributor: Address;
  ybcBonusRecipient: Address;
  upstreamWeightAggregator: Address;
  rewardToken: Address;
  rewardClaimer: Address;
  multicall3: Address;
  source: {
    repo: "styfi";
    ref: string;
  };
};

type YbcEpoch = {
  current: number;
  lengthSeconds: number;
  voteLengthSeconds: number;
  decayLengthSeconds: number;
  currentStartsAt: number;
  currentEndsAt: number;
  votingStartsAt: number;
  votingEndsAt: number;
};

type YbcConfig = {
  additionThresholdBps: number;
  expulsionThresholdBps: number;
  hooks: Address | null;
  operators: Address[];
  rewardClaimers: Address[];
  rewardDistributorKilled: boolean;
  rewardClaimFrom: Address | null;
};

type YbcMember = {
  address: Address;
  status: "active" | "removed";
  addedAt: number | null;
  removedAt: number | null;
  upstreamStaked: IntegerString;
  effectiveWeight: IntegerString;
  weightMaturityBps: number;
  maturesAt: number | null;
  pendingRewards: IntegerString;
};

type YbcProposal = {
  id: number;
  account: Address;
  proposer: Address;
  epoch: number;
  addition: boolean;
  thresholdBps: number;
  votes: IntegerString;
  yea: IntegerString;
  nay: IntegerString;
  status: YbcProposalStatus;
  retracted: boolean;
  executed: boolean;
  proposedAt: number | null;
  votingStartsAt: number;
  votingEndsAt: number;
  executableStartsAt: number;
  expiresAt: number;
};

type YbcProposalStatus =
  | "proposed"
  | "voting"
  | "passed"
  | "failed"
  | "expired"
  | "executed"
  | "retracted"
  | "unknown";

type YbcVote = {
  id: string;
  proposalId: number;
  voter: Address;
  weight: IntegerString;
  yea: boolean;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number | null;
};

type YbcRewardsState = {
  token: Address;
  distributor: Address;
  rewardIntegral: IntegerString | null;
  totalPendingRewards: IntegerString;
  claims: YbcRewardClaim[];
};

type YbcRewardClaim = {
  id: string;
  account: Address;
  rewards: IntegerString;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number | null;
};

type YbcEventSummary = {
  firstIndexedBlock: number;
  lastIndexedBlock: number;
  activeMemberCount: number;
  removedMemberCount: number;
  proposalCount: number;
  voteCount: number;
  rewardClaimCount: number;
};
```

## 4. Required v1 behavior

The feed must be sufficient for the frontend to render a complete read-only YBC app
without connected-wallet historical indexing.

The frontend may add live wallet overlays for:

- whether the connected wallet is a current member;
- whether the connected wallet has already voted on a proposal;
- connected wallet proposal/write eligibility;
- write simulation and transaction submission;
- post-write invalidation while waiting for the next feed refresh.

## 5. Producer notes

- Reconstruct member history from `YBC.AddMember` and `YBC.RemoveMember`, then verify
  current membership with `YBC.members(account)`.
- Use `YBC_DEPLOY_BLOCK` from `styfi/deployment.json` as the default historical scan
  start for YBC events.
- Read proposal status from `YBCElection.status(id)` at the snapshot block. Do not rely
  only on local timestamp derivation for status.
- Include vote history from `YBCElection.Vote`, but do not attempt every possible
  `voted(address, id)` lookup globally.
- Read weights from `YBCWeightAggregator.staked(account)` and
  `YBCWeightAggregator.weight(account)` at the snapshot block.
- If exact maturity timing is expensive, `weightMaturityBps` and `maturesAt` may be
  derived best-effort from packed weight state. If unavailable, set `maturesAt` to `null`
  and keep `weightMaturityBps` based on `effectiveWeight / upstreamStaked`.
- Rewards are display and handoff data. Claim execution remains owned by the shared
  reward claim path.

## 6. Example

See:

- `docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json`
