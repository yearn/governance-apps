# YIP-88: Functional Requirements

> Historical reference. This draft describes the stYFI and Snapshot-era
> governance design. It is not an implementation source for DAO Governance.
> The pinned governance contract reference and `docs/apps/dao` specifications
> take precedence for `/dao`.

**Normative Specification Draft**
Version 0.5 — 2025-11-20
Status: Draft
Authors: Pickles, Korin
Applies to: Parts I–III of the Reorg / Revenue / stYFI framework

---

## 1. Scope

This specification defines the normative functional and behavioural rules governing Yearn’s governance, staking, reward, revenue, budgeting, and incentive systems.
All capitalised keywords (**MUST**, **SHOULD**, **MAY**) follow [RFC 8174](https://datatracker.ietf.org/doc/html/rfc8174).

## 2. Epochs and Timing

1. The system **MUST** operate on a **14-day global epoch** aligned exactly with Curve’s epoch schedule, starting **Thursday 00:00:00 UTC** of every even Curve epoch.
2. All time-based mechanics — staking age, voting, rewards, and revenue windows — **MUST** reference this epoch clock.
3. Epoch categories **MUST** exist as:
   - **Governance Epochs** – proposal and voting cycles.
   - **Reward Epochs** – staking APR and distributions.
   - **Budget Periods** – team or one-off funding windows.
4. Governance epochs **MUST** span two weeks:
   - Proposals **MAY** be discussed during epoch _n_ and the first week of epoch _n + 1_.
   - Once epoch _n_ concludes, proposals **MUST** be frozen and remain uneditable during week one of _n + 1_, allowing one week of discussion before voting occurs in week two.
5. Budget periods for teams **MUST** last ≥ 14 days and ≤ 365 days, starting and ending on epoch boundaries.
6. There **MUST NOT** be any “grace periods” for revenue accounting.

## 3. Balances and Virtual Weights

1. Each user **MUST** be defined by three balance categories:
   - **stYFI** – YFI locked in the staking contract.
   - **veYFI** – YFI locked before the migration snapshot and still unexpired.
   - **LLYFI** – liquid-locker tokens staked in approved locker contracts.
2. All balances **MUST** reside in the **same address** on Ethereum mainnet to qualify for voting and earning calculations.
3. From these balances the system **MUST** derive two independent **virtual balances**:
   - **Voting Weight (VW)** – determines governance power.
   - **Earning Weight (EW)** – determines reward entitlement.
     Each is computed separately, using the relevant boosts, lock factors, and behaviour metrics defined herein.
4. stYFI **MUST** be freely transferable unless the holder is blacklisted.
5. veYFI and LLYFI balances **MUST** reside in the same address as stYFI to contribute to either VW or EW.
6. Snapshot weight **MUST** be taken at beginning of the epoch; effective weight = `min(current_weight, snapshot_weight)` to prevent transfer gaming.
7. stYFI transfers or unstake actions after vote-open **MUST NOT** increase vote weight.

## 4. Governance and Proposals

1. Proposal submission **MUST** require ≥ 1 unit of voting power.
2. There **IS NO QUORUM REQUIREMENT** in the system.
3. A proposal **MAY** be edited only in its submission epoch (_n_); no edits **MAY** occur in its voting epoch (_n + 1_).
4. DAO-ops **MAY** mark a proposal invalid if technically malformed or spam; otherwise it **MUST** proceed to vote by default.
5. Voting **MUST** accept Yes / No / Abstain (equally weighted for rewards).
6. Proposal passes if Yes > No.
7. Vote power in final 24 hours **MUST** decay linearly from 100 % → 0 %.
8. **Guardian (yChad)** **MAY** veto any proposal from creation until 72 h after passage.
   - If vetoed **before** voting opens, it **MUST NOT** count for voter-bucket credit.
   - If vetoed **after** voting opens, it **MUST** count for voter-bucket credit but **MUST NOT** be executable.
9. Valid veto reasons are limited to: **protocol integrity**, **solvency**, **security**, or **practical feasibility**.
10. Veto **MUST** emit a reason string from this list.
11. Blacklisting:
    - DAO-ops **MAY** nominate addresses; Guardian **MUST** execute or revoke.
    - Blacklisted addresses **MUST NOT** submit or edit proposals, submit Cost Centres, or transfer stYFI.
    - They **MAY** vote and unstake.
12. Blacklisting **SHOULD** be indefinite but **MAY** be reversed by governance.
13. Governance executor (Phase A) **MUST** be a multisig with ≥ 72 h timelock.

## 5. Voting Propagation

1. A user’s single vote **MUST** apply simultaneously to:
   - (i) their own balance,
   - (ii) the YBC locked portion they represent, and
   - (iii) the delegation vault share they represent.
2. YBC and delegation vault votes **MUST** update sequentially as members vote; the aggregate state **MUST** reflect the latest weighted composition of member votes.
3. For YBC and delegation vault votes, vote power **MUST NOT** decay in the final 24 hours; these addresses **MAY** be whitelisted to retain full weight throughout.
4. Even if only one YBC member votes, 100 % of YBC vote power **MUST** follow that choice until another member updates it.

## 6. Staking and Earning Weights

1. Staking ratio = 1 YFI → 1 stYFI.
2. Unstaking **MUST** trigger a 14-day linear cooldown with no yield or voting.
3. Initiating a new unstake **MUST** reset the timer.
4. Voting weight **MUST** accrue linearly with staking duration and snapshot at prior epoch end.
5. Earning weight **MUST** include boosts from veYFI, LLYFI, YBC membership, and prior voting activity.
6. There **MUST** be only one stYFI balance per user, based on the amount of YFI deposited into the staking contract.
7. veYFI and LLYFI **MUST** receive a **2× linearly decaying APR boost** relative to lock duration:
   - Full 4-year lock → 2× boost.
   - Zero lock → 1× boost.
   - Lock durations as per state of the Snapshot Block.
   - Decay **MUST** start when new yields begin to accrue in this system.
8. All yield from Liquid Lockers **MUST** be distributed to depositors proportionally to their deposits; vote power from those deposits **MUST** remain proportional to their underlying YFI only.

## 7. APR Boost and Reward Distribution

1. Rewards in epoch _N_ **MUST** be based on user behaviour in epoch _N−1_.
2. Reward asset **MUST** initially be `yvUSDS`.
3. If no valid proposals exist, 100 % of rewards **MUST** be distributed equally to all stakers.
4. To ensure non-voters receive 4X and full participants receive 10X (2.5× boost), if ≥ 1 valid proposal exists, rewards **MUST** be calculated per user as:

   ```

   total_reward = aX + (bX * Y / N)

   ```

   where

   - **a = 4**, **b = 6**,
   - **X** = user weight,
   - **Y** = number of proposals user voted on,
   - **N** = total number of proposals in epoch.

5. Reward calculations **MUST** occur per epoch but distribution **MUST** use a rolling 7-epoch collection and 7-epoch payout window.
6. DAO-ops **MUST** adjust each epoch’s payout to smooth distribution; if unadjusted, prior epoch’s amount **MUST** repeat.
7. Rewards **MUST** remain claimable indefinitely; however, a permissionless `reclaim()` **MAY** be called after 26 epochs (≈ 1 year) since eligibility, routing 90 % to new rewards and 10 % to Treasury, zeroing that user’s claim.
8. Reward formulas **MUST** depend only on verifiable on-chain data.

## 8. Revenue Recognition and Accounting

1. Revenue **MUST** be recognized when tokens arrive at the **Collector** contract.
2. Token value **MUST** be computed by the **Oracle** for that asset at receipt time.
3. Accepted tokens **MUST** include USDC, USDT, USDS, WETH, WBTC, and their `yVault-1` equivalents; others **MAY** be whitelisted.
4. There **MUST NOT** be any revenue grace window; revenues received after epoch close belong to the next epoch.
5. Oracle pricing **MUST** be used for P&L and bonus valuation.
6. DAO-ops **MUST** maintain canonical accounting on- or off-chain.

## 9. Budgets / Cost Centres and P&L

1. Every Budget Request (BR) **MUST** deploy or reference a **Cost Centre** contract via factory and be registered in the registry.
2. Each team **MUST** have ≤ 1 active Cost Centre.
3. Each BR **MUST** define:
   `title`, `team_id`, `duration`, `payment_type`, `amounts{token→amount}`, `payment_address`, `description`, `attachments`, `type_flag`.
4. `type_flag` **MUST** be mutable by DAO-ops or Guardian and has no on-chain effect.
5. Payment types: `lump_sum` or `stream`.
6. Budgets **MUST** start/end on epoch boundaries.
7. Governance **MUST** approve all BRs.
8. DAO-ops **MAY** pause a Cost Centre ≤ 7 days; Guardian **MAY** terminate (“kill”).
9. Paused streams **MUST** accrue and catch up on resume.
10. Profit for epoch _n_ **MUST** be:
    `team_profit = revenue[n] − budget_spend[n]`.
11. P&L **MUST** use Oracle valuations.
12. Bonuses **MUST NOT** affect Cost Centre P&L but **MUST** be recorded for reference.

## 10. Incentives and Performance Bonuses

1. Profit window **MUST** match reward epochs.
2. Global revenues **MUST** use an EMA smoothing with half-life = 7 epochs (α ≈ 0.099).
3. `revenue_growth_rate` **MUST** be capped to ±25 % by default, ±80 % maximum, configurable by DAO.
4. Formulas (MUST implement exactly):

```

team_profit = router_revenue − streamed_budget
team_bonus_amount = team_profit × bonus_cap
bonus_cap = 0–100 (default 50)
bonus_yfi_price = yfi_market_price × (1 − revenue_growth_rate)
bonus_yfi = team_bonus_amount / bonus_yfi_price

```

5. `revenue_growth_rate` **MUST** aggregate across all Cost Centres.
6. Bonus value **MUST NOT** exceed configured `bonus_cap`.
7. Distribution split **MUST** be configurable (0–100) and default to 67 % team / 33 % YBC (as stYFI).
8. Non-revenue bonuses **MUST** follow same split and YFI pricing logic, submitted as USD milestone requests to Guardian.
9. Bonuses **MUST** be discrete epoch payments (no streaming).

## 11. Yearn Builder’s Collective (YBC)

1. Membership **MUST** include Season 2 Vest recipients + any yChad signer opting in.
2. Each member **MUST** receive 0.01 stYFI bootstrap weight.
3. Pool seed **MUST NOT** exceed 200 stYFI.
4. All YFI in the pool **MUST** remain staked permanently.
5. Guardian **MAY** withdraw underlying YFI; members **MAY NOT**.
6. Member yield/vote weights **MUST** follow a 2-epoch ramp (0 % → 50 % → 100 %).
7. Proposing and voting rounds **MUST** be synchronized with stYFI governance cycles.
8. Whitelisting new members **MUST** require simple majority
9. There is **no quorum**.
10. Voting **MUST** be one-token-one-vote.
11. Transfers or cooldowns **MUST** void yield and vote weight immediately.
12. Expelled members **MUST** forfeit future yield and vote power.
13. Expulsion **MUST** require ≥ 66.7 % supermajority (excluding target).

## 12. Delegation Vault (stYFIx)

1. The Delegation Vault **MUST** conform to the ERC-4626 standard.
2. The vault **MUST** accept YFI deposits and mint `stYFIx`.
3. The vault **MUST** stake YFI into stYFI and delegate voting to YBC.
4. The vault **MUST NOT** hold direct governance vote weight.
5. Rewards **MUST** mirror the stYFI APR and be paid in stables with 0 % performance fee.
6. `stYFIx` **MAY** be deposited into v3 vaults for compounding.

## 13. Migration and Redemption

1. Snapshot block **MUST** be 23460759.
2. veYFI boost **MUST** map 2× (4-yr lock) → 1× (at expiry), decaying from stYFI launch.
3. Boost **MUST** apply to yield only.
4. Whitelisted lockers **MAY** include StakeDAO, Cove, 1UP.
5. Global redemption cap **MUST** ≤ 600 YFI.
6. Per-locker caps **MUST** be fixed proportionally to snapshot locked YFI and immutable.
7. Redemption fee **MUST** decay 10 % → 0.25 % over 4 years (epoch ticks).
8. Reverse swap (YFI → locker) **MUST** always be fee-free.
9. Facility **MUST** close ≤ 4 years or when locks expire.

## 14. Controls and Safeguards

1. Guardian and DAO-ops **MAY** pause streams/payouts ≤ 7 days (one-off); Guardian **MAY** terminate.
2. All pauses **MUST** emit public reason strings.
3. Core contracts (Splitters, Collectors, Oracles) **MUST** be immutable post-deployment.
4. Configurable parameters **MUST** be governance-controlled via timelock.

## 15. Reporting and Transparency

1. DAO-ops **MUST** maintain and publish canonical epoch reports (on- or off-chain) including:

- total protocol revenue (USD),
- per-CostCentre revenue/spend,
- reward APR, voter participation, boost multipliers.

2. All BRs **MUST** be published in standardized Cost Centre format (§9).
3. Any discretionary-fund top-up **MUST** include public spend report (epoch range, txids, purpose).
4. All financial data **SHOULD** be traceable on-chain via Oracle valuations.

## 16. Invariants

1. Each epoch **MUST** produce a deterministic, closed accounting state.
2. Revenues and budgets **MUST NOT** be reassigned post-finalization.
3. Reward and bonus calculations **MUST** rely solely on verifiable data.
4. Guardian veto and pause durations **MUST NOT** exceed defined limits.
5. Total stYFI supply **MUST EQUAL** YFI staked − YFI in cooldown.
6. All voting power **MUST** derive exclusively from balances held within the same address.

---

_End of Normative Specification v0.5_
