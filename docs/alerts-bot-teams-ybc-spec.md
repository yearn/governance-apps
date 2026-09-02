# Teams and YBC Telegram alerts

Status: implemented, disabled by default for staged rollout.

This document is the review contract for the Teams and YBC alert bots. It lists
the messages, data rules, runtime behavior, and exclusions that tests should
enforce.

## Channels and runtime

Teams and YBC use separate Telegram chats and separate durable state:

| Domain | Chat secret | Enable flag | Durable object | Replay start |
|---|---|---|---|---:|
| Teams | `TEAMS_TELEGRAM_CHAT_ID` | `ALERTS_TEAMS_ENABLED` | `alerts:teams:v1` | `25,244,861` |
| YBC | `YBC_TELEGRAM_CHAT_ID` | `ALERTS_YBC_ENABLED` | `alerts:ybc:v1` | `25,228,044` |

Both flags default to `false`. Enabling one domain does not enable the other.
The shared Worker applies the same six-confirmation default, cursor checks,
receipt-based deduplication, message cap, Telegram backoff, and adaptive RPC
range reduction used by the existing alert domains.

Every message uses Telegram HTML and stays below 4,096 characters. On-chain
alerts link to their transaction, block, and UTC event time. Stake- and
configuration-driven voting-power alerts keep their causal transaction. Only
epoch-boundary voting-power alerts use a block-only footer.

## Shared data rules

- Read state at the confirmed event block with an EIP-1898 canonical block-hash
  reference.
- Reject removed logs, malformed log metadata, logs whose block hash differs
  from the canonical block at that height, invalid addresses, bad event
  encodings, missing or ambiguous companion logs, and companion values that do
  not match.
- Use the event log index for ordering. Use a stable synthetic ID for a derived
  block-level metric.
- Escape contract-supplied strings before adding them to Telegram HTML.
- Read token symbols and decimals at the event block. If metadata cannot be
  read, show the token address and base-unit value.
- Show a product link only when the linked page has useful current state. The
  chain transaction remains the source for the historical event.

## Teams alerts

The Teams scanner follows the deployed Team Registry, Team, Team Accountant,
Revenue Recipient, Funding Distributor, Bonus Distributor, and YBC Bonus
Recipient contracts. It discovers Team proxy addresses from `AddTeam` and
stores the address and registry index for later scans.

| ID | Alert | Required evidence and message data | Product link |
|---|---|---|---|
| T1 | Team added | Registry `AddTeam`; team name, proxy, index, owner, and current budget period | Team overview |
| T2 | Team retirement scheduled | Registry `RetireTeam`; team name, current period, retirement period, retirement date, and last active period | Team lifecycle |
| T3 | Teams registry deprecated | Registry `Deprecate`; old registry, successor, and registered team count | Teams directory |
| T4 | Team migrated | Registry `MigrateTeam` plus the same transaction's matching Team `Migrate`; team name and old/new registry | Team lifecycle |
| T5 | Team ownership transfer started | Team `PendingOwner`; team name, current owner, and pending owner | Team lifecycle |
| T6 | Team ownership transferred | Team `SetOwner`; team name and owner before/after | Team lifecycle |
| T7 | Team revenue deposited | Team `DepositRevenue`, matching Revenue Recipient `DepositRevenue`, and matching Accountant revenue increment; token amount, USD credit, depositor, period, and period revenue/cost/result after | Team revenue |
| T8 | Team funding approved | Funding Distributor `ApproveFunding`; approval ID, team, token amount, period, vest duration, and the budget-period claim window | Team funding |
| T9 | Team funding claimed | Matching Team and Funding Distributor `ClaimFunding` plus matching Accountant cost increment; approval, token amount, USD cost, recipient, delivery route, and approval remaining | Team funding |
| T10 | Team funding returned | Matching Team and Funding Distributor `ReturnFunding` plus matching Accountant cost decrement; approval, token amount, USD refund, sender, and used amount after | Team funding |
| T11 | Team bonus claimed | One or more Bonus Distributor `ClaimBonus` logs for one team in one transaction; matching YBC Bonus Recipient deposit when the YBC share is nonzero; periods, gross YFI, team share, YBC share, and recipient | Team bonus history |
| T12 | Team revenue accounting adjusted | Accountant `AdjustRevenue` not consumed by T7; operator, sign, USD amount, period, and revenue/cost/result after | Team overview |
| T13 | Team cost accounting adjusted | Accountant `AdjustCost` not consumed by T9 or T10; operator, sign, USD amount, period, and revenue/cost/result after | Team overview |
| T14 | Revenue sent to stYFI rewards | Revenue Recipient `ToRewards`; token amount, reward epoch, and rewards-bucket use after | None |
| T15 | Revenue sent to treasury | Revenue Recipient `ToTreasury`; token amount, treasury address, and treasury-bucket use after | None |
| T16 | Revenue sent to yETH recovery | Revenue Recipient `ToRecovery`; token amount, recovery auction, auction-started state, and recovery-bucket use after | None |

T11 alone receives the `WHALE MOVE` marker when its gross bonus is at least 40
YFI. The scanner combines consecutive-period bonus logs from one claim into one
message. A multicall with claims for several teams produces one T11 per team and
pairs each claim run with its own following YBC deposit.

T1 verifies all three registry relationships at the event block:
`Team.registry()`, `TeamRegistry.teams(index)`, and
`TeamRegistry.is_team(team)`. T7 is suppressed when both token amount and USD
revenue are zero. T11 is suppressed when its aggregate gross and YBC share are
both zero. T12 and T13 are suppressed when the adjustment is zero. Suppression
does not relax companion validation.

## YBC alerts

The YBC scanner follows the deployed YBC, YBC Election, vote-weight
aggregator, Reward Distributor, Bonus Recipient, and Bonus Distributor. It
stores the current member set, the unique voters seen for each proposal, the
last collective voting power, and the last epoch.

| ID | Alert | Required evidence and message data | Product link |
|---|---|---|---|
| B1 | Proposal opened | Election `Propose` plus the event-block proposal record; ID, add/remove type, target, proposer, voting window, and proposal threshold | Exact proposal |
| B2 | Proposal retracted | Election `Retract` plus the proposal record and transaction sender; ID, type, target, and retractor | Exact proposal |
| B3 | Vote cast | Election `Vote` plus the proposal record and current voter weight; yea/nay, voter, recorded weight, yea/total weight cast, threshold status, unique voters, and eligible members | Exact proposal |
| B4 | Proposal executed | Election `Execute` plus matching YBC `Call` and member add/remove logs; final cast result, executor, member change, collective voting power after, and active-member count | Exact proposal |
| B5 | Member added outside an election execution | Matching YBC `Call` and `AddMember` without `Execute`; operator, collective voting power before/after, and active-member count | Members |
| B6 | Member removed outside an election execution | Matching YBC `Call` and `RemoveMember` without `Execute`; operator, collective voting power before/after, and active-member count | Members |
| B7 | Rewards claimed | Reward Distributor `Claim`; member, reward-token amount, and shared claim route | Rewards |
| B8 | YBC team bonus received | YBC Bonus Recipient `Deposit` plus matching Bonus Distributor claim logs; staked YFI, source team, and periods | Rewards |
| B9 | Vote thresholds changed | Election `SetThresholds`; addition and expulsion thresholds before/after plus transaction sender | None |
| B10 | YBC operator changed | YBC `SetOperator`; operator, enabled/removed state, and transaction sender | None |
| B11 | Membership hooks changed | YBC `SetHooks`; hook address before/after and transaction sender | None |
| B12 | Reward distribution stopped | Reward Distributor `Kill`; transaction sender, stopped accrual, and confirmation that earned claims remain claimable | None |
| B13 | Unrecognized YBC operator call | YBC `Call` that is neither an election member change nor the known reward-claim call; operator, target, and function selector | None |
| B14 | Collective voting power changed | Sum of the active members' current Election weight before/after a member stake change, epoch boundary, or weight-aggregator change | YBC overview |

### Vote math

B3 and B4 use the proposal's `yea` and `votes` fields. A proposal passes when
at least one unit of weight was cast and:

`yea * 10,000 >= votes * proposal threshold`

There is no separate quorum in these alerts. B3 shows the exact weight recorded
by the `Vote` event. Vote logs are replayed in log order from the proposal's
pre-block totals, and the replayed final totals must equal the proposal record
at the end of the block. This prevents a later vote in the same block from
appearing in an earlier vote's message. During the final-day decay window, the
undecayed weight is reconstructed from the event weight and the contract's
timestamp formula, so a later same-block weight change cannot alter the alert.
The collective total in B4 and B14 is context; it never changes the pass test.

B14 sums `weight(member)` from the Election's current weight aggregator for all
active YBC members. It emits only when that sum changes. Member-add and
member-remove blocks do not also emit B14 because B4, B5, or B6 already shows
the change. A stake or aggregator transaction supplies B14's transaction
footer; an epoch checkpoint has no single transaction and uses a block footer.

A multicall that claims bonuses for several teams produces one B8 per paired
YBC deposit. Each B8 contains only that source team's positive YBC-share periods.

## Product links and YBC UI

Teams messages use `https://teams.yearn.fi/` with a team address and the useful
section. Proposal messages use
`https://ybc.yearn.fi/?proposal=<numeric-id>#proposals`. Other YBC messages link
to the overview, members, or rewards section when useful.

The YBC overview shows one headline value: **Total collective voting power**.
It sums active members only and does not split that value into internal and
delegated buckets. Member views keep raw stake, effective weight, target weight,
and maturity.

The proposal query parameter accepts decimal IDs only. A valid ID opens the
matching card, scrolls it into view, and adds a visible focus ring. The behavior
works for active and terminal proposals. An unknown or malformed ID is removed
from the URL without dropping other query parameters, and the location falls
back to `#proposals` even when the incoming hash is missing or points elsewhere.

## Canonical deployment and ABI inputs

`lib/deployment.json` is the single address and deployment-height authority for
the Teams and YBC clients and alert Worker. The Worker consumes those values
through the domain deployment modules; it does not keep a second address list.

The minimal replay ABI lives in `lib/abis/ProductAlerts.ts`. Its protocol
signatures are verified against yearn/stYFI commit
`054e3e391f0fe4cd41c68b1a97263cb3234faee1`:

- `contracts/TeamRegistry.vy`, `Team.vy`, `TeamAccountant.vy`,
  `RevenueRecipient.vy`, `FundingDistributor.vy`, and `BonusDistributor.vy`
- `contracts/ybc/YBC.vy`, `YBCElection.vy`, `YBCWeightAggregator.vy`,
  `YBCBonusRecipient.vy`, and `YBCRewardDistributor.vy`

ERC-20 `symbol()` and `decimals()` are the sole non-protocol ABI exception.

## Failure diagnostics

Scanner failures do not advance the cursor. Controlled logs retain a bounded,
validated reason plus the contract, block number, transaction hash, and event
name when known. Provider bodies, RPC URLs, Telegram credentials, and arbitrary
exception text remain redacted.

## Exclusions

- No Snapshot API, Snapshot proposal, or Snapshot vote data.
- No alert for individual member voting-power changes.
- No stYFIx delegation-gain or delegation-loss alert.
- No quorum calculated from collective voting power.
- No cross-posting between the Teams and YBC chats.
- No production rollout from this change alone. Operators must set each chat
  secret and enable flag after replay and pre-production checks.

## Verification checklist

- [x] Each of T1–T16 has an exact checked-in HTML golden and stable event ID.
- [x] Each of B1–B14 has an exact checked-in HTML golden and stable event ID.
- [x] Companion-log failures stop the range without advancing the cursor.
- [x] Vote messages use ordered cast weight, not collective power, for pass/fail.
- [x] B14 emits only for a nonzero change in the collective total.
- [x] Teams and YBC receipts, cursors, state, flags, and chat IDs stay separate.
- [x] Product links point to the matching team, proposal, or useful section.
- [x] Telegram messages fit the 4,096-character limit and contain valid HTML.
- [x] The YBC page has one active-member collective metric and safe proposal links.
- [x] Typecheck, lint, unit tests, and both end-to-end suites pass on the final diff.
- [ ] Private historical replay is reviewed and accepted before either flag is enabled.
