# DAO Governance User Stories

## Observers

### DAO-US-01: scan current proposals

As an observer, I want to see active, upcoming, and closed proposals without
connecting a wallet so I can understand current DAO decisions.

Acceptance:

- list status and timing are readable at a glance;
- filters run `Upcoming`, `Active`, then `Closed`, while a populated Active
  group remains the normal default;
- the selected group survives URL replacement, reload, detail navigation, and
  browser Back;
- detail breadcrumbs return to the exact source group and direct visits derive
  a safe group from proposal data;
- the whole row opens the proposal while nested address copy and explorer
  controls keep their own behavior;
- Yea/Nay percentages say `of votes cast`;
- signal and executable proposals are distinguishable;
- missing proposal content does not remove the onchain record.

### DAO-US-02: understand the decision rule

As an observer, I want to see the proposal's approval threshold and no-quorum
rule so I do not assume turnout affects validity.

Acceptance:

- the snapshotted threshold is shown;
- rules state that no minimum turnout is required;
- the explanation stays secondary to the proposal content and vote action.

### DAO-US-03: verify proposal provenance

As an observer, I want to distinguish immutable proposal content, forum
discussion, onchain facts, and backend analysis so I know what each source
proves.

Acceptance:

- immutable IPFS content and the live forum link are labeled separately;
- decoded actions identify verified and unknown calls;
- simulation results include their reference block;
- technical details expose transaction, contract, CID, digest, and script hash.

## Voters

### DAO-US-10: review my voting weight

As a voter, I want to see the weight that will count now so I can understand the
effect of voting late.

Acceptance:

- base and effective weight are visible when decay applies;
- the UI explains why the values differ;
- zero effective weight produces a specific blocked reason.

### DAO-US-11: vote Yea or Nay

As a voter, I want to choose a direction, review the exact proposal and weight,
and submit one vote through the shared transaction flow.

Acceptance:

- neither direction is preselected;
- confirmation repeats direction and effective weight;
- pending and indexed-pending states are distinct;
- duplicate voting is blocked by live state.

### DAO-US-12: preserve participation after veto

As a voter who has not yet voted, I want to vote on a proposal vetoed after at
least one vote so I receive the same participation opportunity as earlier
voters.

Acceptance:

- the page states that approval and execution are no longer possible;
- Yea and Nay remain available only during the voting window;
- the page calls the action participation voting;
- an early veto with no votes does not expose the action.

### DAO-US-13: act when content is unavailable

As a voter, I want the option to vote when IPFS or analysis is unavailable so a
frontend outage does not remove a protocol action.

Acceptance:

- the available onchain record still renders;
- the missing information is named;
- proceeding requires explicit confirmation;
- no warning claims that the proposal itself is invalid unless that fact is
  established onchain.

## Proposers

### DAO-US-20: create a signal proposal

As an eligible proposer, I want to link a forum discussion and publish an
immutable signal proposal with no executable calls.

Acceptance:

- the forum topic is validated and normalized;
- the final IPFS content is reviewed before signing;
- the review says two actions are required and publication alone does not
  create the proposal or open a wallet;
- Step 2 becomes available only after Step 1 succeeds, and publication failure
  never reveals the wallet action;
- the script is empty;
- the review says `No executable actions`.

### DAO-US-21: create an executable proposal

As a technical proposer, I want to paste the full Executor script so I can
submit calls prepared with external development tools.

Acceptance:

- the input accepts full hex script bytes;
- structural errors identify the first failing offset;
- the UI shows calls, bytes, targets, sizes, and script hash;
- a passing structural check never claims the script is safe;
- detailed decoding and simulation are expected after submission.
- wallet rejection or revert preserves the published content so Step 2 can be
  retried without republishing.

### DAO-US-22: understand why I cannot propose

As a potential proposer, I want a precise blocked reason so I can distinguish
weight, cooldown, blacklist, shared-capacity, wallet, and network failures.

Acceptance:

- the client supplies one primary blocked reason and relevant facts;
- the UI does not infer eligibility from a feed label;
- normal eligibility shows the expected voting epoch and affected six-epoch
  range without a capacity table or success notice;
- a full-capacity state names the exact epoch, `64 / 64`, the affected range,
  and the system-wide limit;
- cooldown remains visible after retraction or moderation.

### DAO-US-23: retract my proposal

As a proposal author, I want to retract my no-vote proposal while the contract
allows it.

Acceptance:

- only the author sees the normal action;
- proposals with votes cannot be retracted;
- confirmation explains that cooldown is unchanged;
- the result enters an indexed-pending state after confirmation.

## Executors and safety reviewers

### DAO-US-30: review executable actions

As a voter or executor, I want to see ordered decoded calls and raw data for
unknown calls so I can assess what execution will do.

Acceptance:

- order is preserved;
- known calls show function and arguments;
- unknown calls show address, selector, and calldata;
- proposer descriptions are not presented as verified decoding.

### DAO-US-31: execute with current evidence

As an eligible executor, I want the app to verify and simulate the exact script
against current state before I sign.

Acceptance:

- event script hash must match the stored hash;
- proposal-time and current simulation are shown separately;
- a failed current simulation blocks the normal execute path;
- the confirmation explains atomic execution.

## Operator and guardian

### DAO-US-40: flag malformed content

As the operator, I want to flag a malformed no-vote proposal with a reason before
voters interact with it.

Acceptance:

- the action appears only while contract conditions permit it;
- a bounded reason is required;
- confirmation explains that voting will be disabled and participation
  accounting removed.

### DAO-US-41: veto a proposal

As the guardian, I want to veto a proposal with a reason and understand the
effect of its current vote count.

Acceptance:

- confirmation distinguishes pre-vote and post-vote outcomes;
- execution is always disabled after veto;
- post-vote participation behavior is stated accurately;
- the reason remains available from indexed event history.

## QA and operations

### DAO-US-50: reproduce every lifecycle state

As a tester, I want shared debug controls and deterministic time so I can reach
each proposal phase and edge case without route-local prototype controls.

Acceptance:

- `+1 day`, `+7 days`, reset, personas, and DAO presets use the shared panel;
- the normal route remains production-shaped;
- the E2E bridge mutates the same mock store;
- reset and time travel continue to update all existing domains.

### DAO-US-51: roll out safely

As an operator, I want path-first validation, feature-gated host exposure, feed
health checks, and rollback steps so the DAO app can ship without changing the
forum or current Snapshot links early.

Acceptance:

- shared-host route is accepted before `dao.yearn.fi`;
- the unaccepted mock candidate can be reviewed at noncanonical,
  `noindex` `dao-beta.dao-ops.com` with clean nested paths;
- preproduction reads `NEXT_PUBLIC_ENABLE_DAO` from its protected environment,
  while production hardcodes the flag false;
- global mocks, E2E, and debug UI stay disabled; DAO controls require the
  independent shared debug gate;
- operators understand that the shared preprod flag is deployment-wide and
  that a custom domain is not access control without Cloudflare Access;
- feed, IPFS, decode, and simulation health are monitored;
- disabling the app does not lose indexed proposal data;
- Snapshot cutover occurs only in the final approved rollout package.
