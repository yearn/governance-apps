# `gov-apps-stats` Brief: Teams + YBC Feeds

Status: producer handoff contract
Consumer repo: `governance-apps`
Producer repo: `gov-apps-stats`
Contract/source repo: `styfi`

## 1. Objective

Publish two app-specific JSON feeds from `gov-apps-stats`:

- `teams.json`
- `ybc.json`

`governance-apps` consumes these feeds for historical and derived state that should not
be indexed in browser code.

## 2. Source of truth

Use the finalized deployment manifest and Vyper sources in `styfi` as the contract
source of truth.

Required source files:

- `deployment.json`
- `contracts/TeamRegistry.vy`
- `contracts/Team.vy`
- `contracts/TeamAccountant.vy`
- `contracts/RevenueRecipient.vy`
- `contracts/RevenuePriceOracle.vy`
- `contracts/FundingDistributor.vy`
- `contracts/BonusDistributor.vy`
- `contracts/BonusPriceOracle.vy`
- `contracts/ybc/YBC.vy`
- `contracts/ybc/YBCElection.vy`
- `contracts/ybc/YBCWeightAggregator.vy`
- `contracts/ybc/YBCRewardDistributor.vy`
- `contracts/ybc/YBCBonusRecipient.vy`

## 3. Deployed contract manifest

Import these addresses from `styfi/deployment.json`. Do not retype them in multiple
producer modules without a shared manifest helper.

| Key | Address / value |
| --- | --- |
| `GENESIS` | `1770249600` |
| `YFI` | `0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e` |
| `REWARD` | `0xBe53A109B494E5c9f97b9Cd39Fe969BE68BF6204` |
| `REWARD_DISTRIBUTOR` | `0xd31911a33a5577Be233Dc096F6F5a7e496fF5934` |
| `REWARD_CLAIMER` | `0xA82454009E01Ae697012a73cB232d85e61B05e50` |
| `STYFI` | `0x42b25284E8ae427D79da78b65DFFC232aAECc016` |
| `STAKING_MIDDLEWARE` | `0x24b267AA3946209ca19231d0f17110577be00A86` |
| `OLD_STAKING_MIDDLEWARE` | `0xc32bd1A70e831c43956Ff2f5F23f2Ee45a04C020` |
| `STYFIX` | `0x9C42461AA8422926e3AEF7B1C6e3743597149d79` |
| `VEYFI` | `0x90c1f9220d90d3966FbeE24045EDd73E1d588aD5` |
| `WEIGHT_AGGREGATOR` | `0x6973CF85d479b9253E13E71F377E8CD2c2dfECd7` |
| `YBC` | `0xd6AFd78C05f0d425F2b46359746dD44991dCB315` |
| `YBC_WEIGHT_AGGREGATOR` | `0xADB7228a85fCD24E3Cfc8C58E2d4b9F03E1468D9` |
| `YBC_REWARD_DISTRIBUTOR` | `0x53100f8979D3655a2E95465f583b0f4A11c8bbe1` |
| `YBC_ELECTION` | `0xe16608758c11322d407745927d2D033f1BFB206C` |
| `YBC_BONUS_RECIPIENT` | `0xf03a919a59f8381bE220511eCf788b15FB039e4C` |
| `BUDGET_GENESIS` | `1762992000` |
| `TEAM_REGISTRY` | `0x9da431b8A5b5962ebFF1d1876DdB0f336a372F29` |
| `TEAM_IMPLEMENTATION` | `0xa59B34c87f97Bdf95Ab3E532FD9b7D1Fcd23BF43` |
| `TEAM_ACCOUNTANT` | `0x1c221980AAb2E52Ccc02180E0c171Ca5E5ffDFD6` |
| `REVENUE_RECIPIENT` | `0x5B5AB518F532Ce260A5d2795E1eEc544FC159587` |
| `REVENUE_PRICE_ORACLE` | `0xC1f9b548afcBe850f2BEbA8a50E55d86f4ABaE2E` |
| `FUNDING_DISTRIBUTOR` | `0xbCc932e4750C3E465A7E54A06A34F9EdF8f6116b` |
| `BONUS_DISTRIBUTOR` | `0xA66002E9ab0BABf46882D0E0cd274f46CEb13116` |
| `BONUS_PRICE_ORACLE` | `0x7e417e19fe3f72798E1094E8dF185378370cb416` |
| `MULTICALL3` | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| `STYFI_DEPLOY_BLOCK` | `24377403` |
| `YBC_DEPLOY_BLOCK` | `25228044` |
| `TEAMS_DEPLOY_BLOCK` | `25244861` |

Liquid locker middleware values should also be imported from `LIQUID_LOCKERS.MIDDLEWARE`
if existing global/stYFI stats rely on middleware addresses.

## 4. Scan start policy

`deployment.json` now includes deployment block heights. Producer code should import these
values directly and use them as the default historical scan starts:

- Teams feed start block: `TEAMS_DEPLOY_BLOCK` (`25244861`);
- YBC feed start block: `YBC_DEPLOY_BLOCK` (`25228044`);
- shared stYFI/global feed deployment block, if needed by adjacent producer work:
  `STYFI_DEPLOY_BLOCK` (`24377403`).

The producer still must define and document:

- confirmation depth before publication;
- cursor storage location and recovery behavior;
- whether any feed needs to scan before its deploy block for migration/backfill reasons.

## 5. Common feed rules

Both feeds follow these rules:

- Teams publishes the complete v2 contract described below. YBC remains v1.
- `chainId` is `1`;
- `generatedAt` is unix seconds;
- `blockNumber` and `blockHash` identify the snapshot block;
- raw values are base-unit integer strings using the units declared by their app schema;
- addresses are hex strings; consumers will normalize for comparison;
- timestamps are unix seconds;
- arrays must be sorted deterministically;
- feed objects must be atomic per snapshot;
- retained payloads are rollback candidates only when they match the deployed consumer
  and the current onchain unit contract;
- invalid or partial snapshots must not overwrite the last good object.

Recommended sorting:

- Teams: active teams by registry index, retired teams after active teams by registry
  index, events by `(blockNumber, logIndex)`;
- YBC: members by current effective weight descending then address, proposals by id
  descending, votes by `(proposalId, blockNumber, logIndex)`.

## 6. Teams feed requirements

Schema document:

- `docs/apps/teams/onchain-integration-plan/teams-feed-schema-v1.md`

Required event sources:

- `TeamRegistry.AddTeam`
- `TeamRegistry.RetireTeam`
- `TeamRegistry.Deprecate`
- `TeamRegistry.MigrateTeam`
- `Team.PendingOwner`
- `Team.SetOwner`
- `Team.DepositRevenue`
- `Team.ClaimFunding`
- `Team.ReturnFunding`
- `TeamAccountant.AdjustRevenue`
- `TeamAccountant.AdjustCost`
- `RevenueRecipient.DepositRevenue`
- `RevenueRecipient.SetPriceOracle`
- `RevenueRecipient.SetConverter`
- `RevenueRecipient.Kill`
- `FundingDistributor.ApproveFunding`
- `FundingDistributor.ClaimFunding`
- `FundingDistributor.ReturnFunding`
- `FundingDistributor.SetPriceOracle`
- `BonusDistributor.ClaimBonus`
- bonus parameter setter events if emitted by the deployed contract

Required view calls:

- `TeamRegistry.period()`
- `TeamRegistry.num_teams()`
- `TeamRegistry.teams(index)`
- `TeamRegistry.team_retirements(team)`
- `TeamRegistry.is_team(team)`
- `TeamRegistry.successor()`
- `TeamRegistry.revenue_recipient()`
- `TeamRegistry.funding_distributor()`
- `Team.name()`
- `Team.owner()`
- `Team.pending_owner()`
- `TeamAccountant.team_revenues(team, period)`
- `TeamAccountant.team_costs(team, period)`
- `TeamAccountant.lifetime_team_revenues(team)`
- `TeamAccountant.lifetime_team_costs(team)`
- `TeamAccountant.global_revenues(period)`
- `TeamAccountant.global_costs(period)`
- `FundingDistributor.num_approvals()`
- `FundingDistributor.approvals(index)`
- `FundingDistributor.claimable(index)`
- `FundingDistributor.costs(team, period, token)`
- `FundingDistributor.oracles(token)` for discovered funding tokens
- `RevenueRecipient.oracles(token)` for discovered tokens
- `RevenueRecipient.converters(token)` for discovered tokens
- `RevenueRecipient.killed()`
- `RevenueRecipient.operator()`
- `RevenueRecipient.treasury()`
- `RevenueRecipient.reward_distributor()`
- `RevenueRecipient.recovery_auction()`
- `RevenueRecipient.last_balance()`
- `RevenueRecipient.sum_balance()`
- `RevenueRecipient.used(index)` for split buckets
- `RevenueRecipient.token_split(index)` for split configuration, if exposed by ABI
- `BonusDistributor.pending_period()`
- `BonusDistributor.pending_claims(team)`
- `BonusDistributor.parameters(period)`
- `BonusDistributor.bonus_token()`

Important Teams notes:

- `BonusDistributor.finalize_period()` does not emit a dedicated finalization event.
  The feed must read `pending_period()` and `parameters(period)` from chain.
- Accepted revenue/funding token lists are not available as arrays. Discover tokens from
  setter and usage events, then verify with view calls.
- Team-specific events are emitted by individual `Team` proxy addresses discovered from
  `TeamRegistry.AddTeam`.
- Funding claimability is period-sensitive and should be refreshed by view call, not
  inferred only from events.
- `team.availableActions` is a v1 compatibility hint only. It should not be expanded into
  wallet-specific permission logic in `gov-apps-stats`, and production frontend write
  CTAs must not trust it as authoritative. Emit raw protocol state instead; the consumer
  derives wallet/write eligibility from feed state, wallet state, current chain, and
  simulation.

### Teams v2 accounting and publication

The seeded TeamAccountant revenue and cost entries were corrected in
[transaction `0x72d8…4c53`](https://etherscan.io/tx/0x72d8633d89bb52c14566ed761b560105400fc16dfec2ae5c4ca6867fa6e14c53)
at block `25,633,144`. Every release candidate must use a canonical block at or after
that block.

Post-correction accountant values already use 18-decimal USD base units. The producer
**MUST NOT multiply them by `10^12` again**. Event reconstruction must apply both sides
of every adjustment and respect the `_increment` flag.

Teams v2 requires the full schema, not a version change alone. It includes:

```json
{
  "version": 2,
  "units": {
    "usd": {
      "symbol": "USD",
      "decimals": 18,
      "scope": "all-financial-and-event-usd"
    },
    "bonusToken": {
      "symbol": "YFI",
      "decimals": 18
    }
  }
}
```

The producer must publish every financial and event USD field at that scale, recompute
profit and loss from revenue and cost, and include `revenueRecipient.token` whenever
the recipient balance tuple is present. Token amounts and recipient balances continue
to use their token's own decimals. The complete constraints are in the Teams feed
schema.

Teams uses one stable object at `NEXT_PUBLIC_TEAMS_DATA_URL`. Browser examples reach it
through `/api/teams-data`. Do not add a v2 URL, route, or environment variable.

Cut over in this order:

1. Build and validate the exact v2 candidate without changing the stable object.
2. Deploy and verify the compatible frontend while the stable object still serves v1.
   V1 may supply nonfinancial display data during this step, but finance must fail
   closed.
3. Atomically replace the object at the same stable URL with the validated v2 payload.
4. Purge the upstream cache or wait its full 60-second window.
5. Verify v2 through `/api/teams-data`. App fetches and proxy responses use
   `Cache-Control: no-store`.

After cutover, a v1 build is a failed producer release and must not be published.
Consumer downgrade handling also fails finance closed, but it is not a rollback plan.

If a bad v2 is published, replace it with a fresh corrected and validated v2. If the
frontend must roll back, release a tested frontend/feed pair. If neither option is
safe, disable Teams. Never restore the unsafe v1 object or expose corrected 18-decimal
values to a consumer that assumes six decimals.

## 7. YBC feed requirements

Schema document:

- `docs/apps/ybc/onchain-integration-plan/ybc-feed-schema-v1.md`

Required event sources:

- `YBC.AddMember`
- `YBC.RemoveMember`
- `YBC.SetHooks`
- `YBC.SetOperator`
- `YBC.Call`
- `YBCElection.Propose`
- `YBCElection.Retract`
- `YBCElection.Vote`
- `YBCElection.Execute`
- `YBCElection.SetThresholds`
- `YBCElection.SetWeightAggregator`
- `YBCRewardDistributor.Claim`

Required view calls:

- `YBC.num_members()`
- `YBC.members(address)` for discovered accounts
- `YBC.operators(address)` for discovered accounts/operators
- `YBC.hooks()`
- `YBCElection.num_proposals()`
- `YBCElection.proposals(index)`
- `YBCElection.status(index)`
- `YBCElection.addition_threshold()`
- `YBCElection.expulsion_threshold()`
- `YBCWeightAggregator.staked(account)`
- `YBCWeightAggregator.weight(account)`
- `YBCWeightAggregator.supply()`
- `YBCWeightAggregator.packed_weights(account)` if maturity metadata is derived
- `YBCRewardDistributor.pending_rewards(account)` for current/discovered members
- `YBCRewardDistributor.reward_integral()`
- `YBCRewardDistributor.account_reward_integral(account)` if reward deltas are derived
- `YBCRewardDistributor.killed()`
- `YBCRewardDistributor.claim_from()`
- `YBCRewardDistributor.claimers(address)` for discovered claimers

Important YBC notes:

- The member list must be reconstructed from `AddMember` and `RemoveMember` events, then
  verified with `YBC.members(address)`.
- Proposal status must use the contract `status(index)` view for the snapshot block.
- Per-viewer vote eligibility should stay a frontend live overlay. The global feed
  should include vote history and proposal totals, not every possible `voted(address,id)`
  lookup.
- YBC reward claiming remains a shared reward-claimer flow. The feed should support
  display and handoff, not a new isolated claim engine.

## 8. Producer deliverables

For producer changes, deliver:

- deployment/config module with Teams/YBC addresses and imported deploy blocks;
- minimal ABIs or `alloy::sol!` interfaces for required events/view calls;
- feed reducer/indexer modules for Teams and YBC;
- atomic R2 publication for `teams.json` and `ybc.json`;
- persistent cursor state for both feeds;
- producer-side schema or snapshot tests;
- sample staging payloads linked in the PR notes;
- notes for any fields that cannot be produced exactly as requested.

## 9. Consumer verification deliverables

Before promotion, `governance-apps` verifies:

- JSON parses and matches the declared app schema and version;
- feed metadata is fresh and block-consistent;
- known deployed addresses match `styfi/deployment.json`;
- Teams directory has all registered teams;
- Teams funding and bonus objects are sufficient for the planned UI;
- Teams frontend action eligibility is derived from raw feed and wallet state, not from
  `team.availableActions`;
- YBC roster and proposal board are sufficient for the planned UI;
- missing optional fields degrade cleanly;
- payload size is acceptable for frontend fetch/cache behavior.

## 10. Out of scope for the producer

- frontend rendering;
- wallet-specific action eligibility and write readiness;
- browser routing or feature flags;
- exhaustive admin history unless needed for current display state;
- every historical token price if not needed for displayed accounting values;
- production write enablement.
