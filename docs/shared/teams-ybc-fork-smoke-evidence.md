# Teams + YBC Fork Smoke Evidence

Status: passed with recorded launch fixes
Started: 2026-07-06

This file records fork-smoke evidence, launch findings, and explicit deferrals for the
Teams/YBC production-readiness pass.

## Environment

- App URL: `http://127.0.0.1:3000`
- Fork RPC: `http://127.0.0.1:8546`
- Chain ID: `1`
- Test wallet: `0x6AFD01e79e4B52bbE61fF48D0fDe036b73141686`
- Teams feed: `https://data.dao-ops.com/prod/teams.json`
- YBC feed: `https://data.dao-ops.com/prod/ybc.json`

## Teams

### Revenue Deposit

Status: passed; transaction hashes not captured

Evidence:

- Test wallet seeded with `100 USDC` and `1000 ETH` on the fork.
- Approval transaction completed through the UI.
- `Team.deposit_revenue` transaction completed through the UI.
- Transaction hashes were not captured during the walkthrough. Rerun this narrow smoke
  step only if strict receipt capture is required before preprod.

Findings:

- The revenue deposit form preselected `1,000 USDC`, which exceeded the test wallet's
  seeded balance and caused the first attempted transaction to revert.
- Resolution: fixed before preprod. The revenue amount field now starts empty in live
  mode, shows connected wallet balance, exposes `Max`, and blocks over-balance
  submissions before approval/deposit.

### Funding Claim

Status: passed

Fork setup:

- Team: DAO-ops (`0x462aa97c4670602f63133e2b08327031c132e5b0`)
- Fork owner transferred to test wallet:
  `0x6AFD01e79e4B52bbE61fF48D0fDe036b73141686`
- FundingDistributor funded with `100 USDC`.
- Current-period approval created:
  - approval id: `0`
  - period: `2`
  - token: USDC (`0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`)
  - amount: `10 USDC`
  - claimable: `10 USDC`
- Fixture:
  `http://127.0.0.1:3000/fork-fixtures/teams-funding.json`

Setup transactions:

- USDC transfer to FundingDistributor:
  `0xec6409ad4955e910739d456ec2150ddcbc38e8b6f623ee5172f25afb5626751e`
- Funding approval:
  `0x891492b558eb53327ffefaa9bf6ba4bebd68fb63da32811e3386a52dae59297e`

Claim evidence:

- Claimed amount: `5 USDC`
- Claim transaction:
  `0x69fbe761b06f4a13e30b7b1741759bcf785e148c510d27200753913a49c1e0b6`
- Fork approval state after claim:
  - used: `5 USDC`
  - remaining claimable: `5 USDC`
- Test wallet USDC balance after claim: `55 USDC`

Finding fixed during smoke:

- Feed-backed returnability was using prior return events as `refundValueUsd`, which hid
  valid return actions after a claim. The mapper now derives refundable value from
  claimed cost net of returns.
- Focused test: `npm run test -- tests/unit/lib/clients/teams.onchain.test.ts`
  passed.

### Funding Return

Status: passed

Fixture state:

- `public/fork-fixtures/teams-funding.json` reflects the successful `5 USDC` claim.
- Approval id `0` now has `5 USDC` used and `5 USDC` remaining claimable.
- The expected refundable value is `5 USD`.

Return evidence:

- Returned amount: `5 USDC`
- Return transaction:
  `0xc3d58f26f3af8d218252cccf373e415004b10704291a3dc8988c5527a856acb8`
- Fork approval state after return:
  - used: `5 USDC`
  - remaining claimable: `5 USDC`
  - refundable cost amount: `0 USDC`
- Test wallet USDC balance after return: `50 USDC`

Finding fixed after smoke:

- The real `FundingDistributor.refund` path reduces cost/refundable amount but does not
  decrement approval `used` or reopen `claimable`. The mock helper now preserves
  `used` and `claimable` on return and only reduces refundable/claimed-cost accounting.

### Bonus Claim

Status: deferred

Reason:

- Current production/fork Teams state does not expose a clean claimable bonus case.
- The app still renders bonus state from the feed, but no synthetic bonus claim was
  added to this fork pass because the launch gate already validates the shared
  transaction path through revenue deposit, funding claim, and funding return.

Follow-up:

- Test bonus claim when a real finalized claimable period exists, or create a narrow
  fixture only if bonus claim becomes a launch-critical path before such state exists.

### Wrong-Network Guard

Status: passed

Evidence:

- User switched the wallet away from the local mainnet fork and checked `/teams` and
  `/ybc`.
- Write actions were disabled / guarded while off mainnet.
- Switching back to the local fork recovered the apps.

## YBC

### Member Setup

Status: passed

Fork setup:

- YBC: `0xd6AFd78C05f0d425F2b46359746dD44991dCB315`
- Test wallet: `0x6AFD01e79e4B52bbE61fF48D0fDe036b73141686`
- Test wallet member status after setup: `true`
- Test wallet operator status after setup: `true`
- YBC member count after setup: `23`

Setup transactions:

- Set test wallet as YBC operator:
  `0xb61b81d44d767b15bd42287a6658bd5fdb46231113b5763d2217117c0bdfd88e`
- Add test wallet as YBC member:
  `0xe322023b44002dbc96935d7da1f6e00134270911b25be32d6952ea1af6914bd5`

### Proposal Creation

Status: passed

Evidence:

- Add-member proposal:
  - proposal id: `0`
  - target: `0x9bcE204d401B325450E7Bdb3c83759093eB309fB`
  - proposal epoch: `11`
  - transaction:
    `0x646ef46395437a3b5d7e53751ae8c2419d83cdaf5f9d877faab5cacaf849dae3`
- Remove-member proposal:
  - proposal id: `1`
  - target: `0x1d70E9414B639286665dF4794ff5C7ea538B4Eac`
  - proposal epoch: `11`
  - transaction:
    `0x6092f7178ca032328651c4136c24010a6da94294b3d834e9f89bbce4628d8635`

Expected limitation:

- Newly created fork proposals will not appear in the proposal list while the UI reads
  live `ybc.json`, because the R2 feed does not update from fork writes.

Finding:

- The proposal creation control should be split into clearer add/remove tabs. Switching
  between add and remove should clear the address input so the previous mode's target
  does not remain visible.
- Resolution: fixed before preprod. The proposal form now uses add/remove tabs and
  resets target, validation error, and proposal transaction error state on mode switch.

Fixture note:

- `public/fork-fixtures/ybc-proposals.json` is the committed final post-execute
  snapshot.
- During smoke testing, the local `fork-fixtures/ybc-proposals.json` URL was
  overwritten at each lifecycle checkpoint. The step-specific fixture bullets below
  describe those transient walkthrough snapshots, not the final checked-in file.

### Proposal Retract

Status: passed

Transient fixture state:

- `http://127.0.0.1:3000/fork-fixtures/ybc-proposals.json`
- Includes test wallet as an active member/operator.
- Includes proposal `YBC-0` in discussion state, proposed by the test wallet, so it
  should be retractable before proposal epoch `11`.
- Includes proposal `YBC-1` in discussion state for later lifecycle testing.

Evidence:

- `YBC-0` retract transaction:
  `0x2447a2c14ad90b1dbb422aeae7628317162b044d992be574ae817be54d76a964`
- Fork status after retract:
  - `YBC-0`: retracted (`status = 2`)
  - `YBC-1`: proposed (`status = 1`)

### Proposal Voting

Status: passed

Fork setup:

- Test wallet received YBC voting weight through the deployed hook path on the fork:
  - impersonated upstream staking middleware:
    `0x24b267AA3946209ca19231d0f17110577be00A86`
  - called upstream `WeightAggregator.on_stake` for the test wallet with `10` units
    of stake
  - setup transaction:
    `0x27e7173b39c792924bda2f222705485c39eba297abfc52a3892536405986179f`
- Fork time travelled to proposal epoch `11`, voting window timestamp `1784163600`.
- Fork status after setup:
  - test wallet upstream staked: `10`
  - test wallet live YBC weight: `2.5`
  - `YBC-0`: retracted (`status = 2`)
  - `YBC-1`: voting (`status = 4`)
  - test wallet has not voted on `YBC-1`

Transient fixture state:

- `http://127.0.0.1:3000/fork-fixtures/ybc-proposals.json`
- Updated to epoch `11` and marks:
  - `YBC-0` as retracted
  - `YBC-1` as voting
  - test wallet with `10` raw staked and `2.5` effective voting weight

Evidence:

- `YBC-1` yea vote transaction:
  `0xbbeaf18179fca3fdcc16b3123ff912f86f383865f229a5fa607d5cdcf26b32e3`
- Vote event:
  - account: `0x6AFD01e79e4B52bbE61fF48D0fDe036b73141686`
  - proposal id: `1`
  - weight: `2.5`
  - yea: `true`
- Fork proposal state after vote:
  - votes: `2.5`
  - yea: `2.5`
  - nay: `0`
  - test wallet voted: `true`
  - current status in epoch `11`: voting (`status = 4`)
  - would pass after epoch advance: `true`

### Proposal Execute

Status: passed

Fork setup:

- Fork time travelled to proposal epoch `12`, execution window timestamp
  `1784764800`.
- Fork status after setup:
  - `YBC-0`: retracted (`status = 2`)
  - `YBC-1`: passed (`status = 8`)
  - `YBC-1` executed: `false`
  - test wallet has already voted on `YBC-1`

Transient pre-execute fixture state:

- `http://127.0.0.1:3000/fork-fixtures/ybc-proposals.json`
- Updated to epoch `12` and marks:
  - `YBC-0` as retracted
  - `YBC-1` as passed / awaiting execution
  - `YBC-1` with `2.5` total votes, all yea

Evidence:

- `YBC-1` execute transaction:
  `0x782dc19446354a11ca1187ab89e8bbad258e51d98ffd67f71dc4dfe17ec73d93`
- Execute event:
  - executor: `0x6AFD01e79e4B52bbE61fF48D0fDe036b73141686`
  - proposal id: `1`
- Membership event:
  - removed member: `0x1d70E9414B639286665dF4794ff5C7ea538B4Eac`
- Fork state after execute:
  - `YBC-1`: executed (`status = 32`)
  - `YBC-1` executed flag: `true`
  - removed member active status: `false`
  - YBC member count: `22`

Committed fixture snapshot:

- `public/fork-fixtures/ybc-proposals.json` now records the final post-execute state:
  `YBC-0` retracted, `YBC-1` executed, removed member inactive, and member count `22`.
