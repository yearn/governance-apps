# DAO Governance Functional Requirements

## 1. Goal

DAO Governance lets users find Yearn proposals, review their immutable content
and onchain actions, vote, create proposals, and perform permitted lifecycle
actions without hiding the contract's timing or trust boundaries.

The first accepted product is deterministic and mock-backed. Backend feeds,
onchain clients, fork proof, and production rollout follow in separate
milestones.

## 2. Roles

- Observer: browses proposals without a wallet.
- Voter: reviews current weight and submits one Yea or Nay vote.
- Proposer: meets the live weight, cooldown, and blacklist rules and creates a
  signal or executable proposal.
- Proposal author: retracts their own no-vote proposal when the contract permits.
- Execution caller: submits an approved script when execution is permissionless
  or the account is the guarded operator.
- Operator: flags a malformed no-vote proposal and may execute when guard mode
  requires it.
- Guardian: vetoes a proposal before execution.

A wallet can have more than one role. The UI derives permissions from live facts;
it does not grant authority based on labels from the feed.

## 3. Launch scope

### Included

- proposal directory and filtering;
- proposal detail, immutable content, forum discussion, vote totals, timeline,
  threshold, and technical metadata;
- wallet voting weight and effective late-vote weight;
- one Yea or Nay vote through the configured Voter;
- post-veto participation voting when the contract still accepts it;
- signal and executable proposal creation;
- full Executor-script hex input with structural browser checks;
- proposer retraction;
- execution review and execution when eligible;
- flag and veto reason display;
- role-gated flag and veto controls in mock and fork coverage;
- IPFS, decode, analysis, simulation, and feed failure states;
- shared debug controls and deterministic time travel;
- path-first and feature-gated rollout.

### Not included in the first production scope

- comments or discussion hosted in the app;
- automatic creation of a forum topic;
- a generic ABI transaction builder;
- an importable execution-bundle format;
- arbitrary proposer-supplied ABIs treated as verified;
- changing a submitted vote through the public Voter;
- historical Snapshot proposal ingestion;
- vote-boost claiming, which belongs to the existing reward flow;
- automatic execution;
- automatic network switching.

## 4. Proposal discovery

### DAO-FR-001: public list

`/dao` renders proposal history without requiring a wallet. Each list item shows:

- title and numeric ID;
- signal or executable type;
- display status;
- proposal author;
- vote timing or terminal time;
- Yea/Nay percentages of votes cast;
- a quiet indication when a proposal has executable actions;
- verified discussion availability or its absence.

### DAO-FR-002: filters

The list supports at least `Active`, `Upcoming`, and `Closed`. Filtering uses
domain-provided display groups, not duplicate status math in the component.

### DAO-FR-003: stable identity

Internal identity always includes chain ID and Voting contract address. Routes
may use the numeric ID while one active contract is unambiguous, but clients,
queries, feeds, and analytics must not.

### DAO-FR-004: unavailable content

Missing or invalid IPFS content does not hide the onchain proposal. The list and
detail page render the available onchain record and identify the content failure.

## 5. Proposal detail

### DAO-FR-010: proposal record

The detail page separates:

- immutable proposal content;
- live or indexed onchain state;
- connected-wallet state;
- backend decoding and simulation analysis;
- unverified proposer descriptions.

### DAO-FR-011: lifecycle

The page shows discussion, voting, decision, execution, and terminal timing as
applicable. It must represent retracted, flagged, vetoed, rejected, expired, and
executed outcomes without forcing them into a single happy-path timeline.

### DAO-FR-012: threshold and no quorum

Vote percentages use `of votes cast`. Proposal rules say `No minimum turnout is
required`. The detail page shows the proposal's snapshotted approval threshold,
not the current global threshold.

### DAO-FR-013: signal display

A passed empty-script proposal displays:

- type `Signal`;
- status `Approved`;
- `No executable actions`.

The technical disclosure may show the raw contract status.

### DAO-FR-014: analysis provenance

Decoded actions show whether their address and ABI source is verified. Unknown
calls remain visible as target, selector, calldata, and size. A proposal-time
simulation shows its reference block and never claims to guarantee execution.

## 6. Voting

### DAO-FR-020: eligibility

The client supplies `canVote` and a reason when false. The UI does not infer
eligibility from display status alone.

### DAO-FR-021: weight

Before confirmation, show the estimated effective weight for the current time.
When late-vote decay applies, show the original weight, effective weight, and a
short explanation. Dynamic weight and countdown values use tabular numerals.

### DAO-FR-022: direction

The user explicitly chooses Yea or Nay. The app never defaults a vote direction
and never replaces the two choices with a directionless participation button.

### DAO-FR-023: one vote

After a successful public-Voter submission, the account cannot vote again on the
proposal. Feed lag may show a pending indexed state, but the live voted read is
authoritative for blocking a duplicate submission.

### DAO-FR-024: post-veto participation

If the proposal was vetoed after votes existed and the voting window remains
open, the page keeps Yea and Nay available and says:

> This proposal has been vetoed and cannot be approved or executed. You may
> still vote to record your participation.

If it was vetoed before the first vote, voting is unavailable.

### DAO-FR-025: content failure

Voting remains available when the protocol permits it even if content or
analysis is unavailable. The app requires an explicit confirmation that the
full proposal could not be reviewed.

## 7. Proposal creation

### DAO-FR-029: author eligibility

The client supplies `canPropose`, one primary blocked reason, current and minimum
weight, blacklist state, last proposal time, next eligible time, expected voting
epoch, and the current proposal count for each of the six affected reward
epochs. Proposal capacity is shared across all authors and is full if any
affected epoch already contains 64 proposals.

Wallet and network failures take priority, followed by blacklist, weight,
cooldown, and shared capacity. The review may show every relevant fact even when
one primary reason controls the action.

### DAO-FR-030: forum discussion

The app requires a public `gov.yearn.fi` topic in the configured forum
`Proposals` category. A same-origin server endpoint validates and normalizes the
topic. Eligibility uses stable category IDs, not display labels. Descendants are
accepted only when their IDs are explicitly configured.
Minimum topic age and poll rules remain informational until an updated DAO policy
defines them.

Direct-contract proposals that bypass this rule still appear in history with
`No verified forum discussion`.

### DAO-FR-031: immutable content

The author supplies title, summary, specification, discussion URL, and declared
proposal type. The published IPFS document is the immutable voting snapshot;
the linked forum may continue changing.

### DAO-FR-032: signal

Choosing `Signal` submits an empty execution script. The review step states that
the proposal contains no executable actions.

### DAO-FR-033: executable script input

Choosing `Executable` reveals one multiline input for the full hex-encoded
Executor script. The app does not require a secondary bundle format.

### DAO-FR-034: browser script checks

Before submission, the browser validates hex syntax, framing, declared lengths,
call count, total bytes, and script hash. It shows call targets and calldata
sizes. A successful result says `Script structure is valid`; it never says
`Safe` or `Verified`.

### DAO-FR-035: final review

The final confirmation shows:

- normalized forum topic;
- exact immutable proposal content;
- proposal type;
- exact script and hash;
- call count and byte count;
- current proposer weight and cooldown eligibility;
- expected voting epoch;
- publication and transaction steps.

### DAO-FR-036: backend analysis

After the proposal event is indexed, the detail page may show `Analysis pending`,
then the stored decode and proposal-time simulation. A proposal submission does
not wait for semantic backend analysis unless a later product decision adds a
preflight endpoint keyed by script hash.

### DAO-FR-037: proposal-time simulation semantics

The backend simulates the complete ordered script atomically against
proposal-time state using an execution-equivalent caller and context. It does
not treat a time-gated `Voting.execute` call at the proposal block as useful
evidence. The result records the method, engine, block number and hash, simulated
timestamp, caller, state or time overrides, atomic result, and failure reason.

Unknown ABI decoding does not force simulation failure. If an
execution-equivalent context cannot be established, analysis is `Unavailable`
rather than successful.

## 8. Lifecycle actions

### DAO-FR-040: retract

Show retraction only to the proposer when the client reports it is permitted.
Explain that a proposal with votes cannot be retracted and that retraction does
not reset the proposal cooldown.

### DAO-FR-041: flag

The operator may flag only when the client reports it is permitted. The form
requires a reason within the contract limit. Flagging is presented as invalid or
spam moderation, not an ordinary vote outcome.

### DAO-FR-042: veto

The guardian may veto only when the client reports it is permitted. The form
requires a reason. The confirmation explains whether the proposal has votes and
whether participation voting will remain open.

### DAO-FR-043: execute

An executable proposal enables execution only when:

- the execution epoch and delay permit it;
- the proposal passed and is not vetoed, retracted, or executed;
- the account satisfies guard mode;
- the exact event script is available;
- its hash matches the stored script hash;
- a fresh current-state simulation succeeds.

The transaction uses the shared `useTx` pipeline. One call failure reverts the
whole script.

## 9. Content and execution failure policy

| Condition | Voting | Execution |
| --- | --- | --- |
| Content and script verified | Normal | Normal when eligible |
| IPFS unavailable | Allowed with warning | Allowed only with exact hash-valid event script |
| Content schema or digest invalid | Allowed with strong warning | Same exact-script rule |
| Event script unavailable | Allowed | Unavailable because the transaction cannot be built |
| Script hash mismatch | Allowed with warning | Blocked |
| Post-vote veto | Participation vote while open | Blocked |
| Pre-vote veto | Blocked by contract | Blocked |

The UI never submits a mismatched script. It does not turn a gateway outage into
a voting veto.

## 10. Data and trust boundaries

- `gov-apps-stats` owns historical logs, IPFS retrieval, script retention,
  decoding, proposal-time simulation, and the global feed.
- The frontend owns schema validation, presentation, live wallet overlays,
  capability derivation from current reads, transaction preparation, and a fresh
  execution simulation.
- The UI does not own protocol math.
- Feed-provided action labels are hints, not wallet authorization.
- Backend decoding uses a maintained address/ABI registry. Proposer metadata may
  add descriptions but cannot establish verified decoding.

## 11. Runtime and rollout

- Mock mode uses deterministic state, shared time controls, reset, and typed test
  bridge methods.
- Production mode never instantiates DAO mock state.
- `/dao` ships on shared hosts before subdomain exposure.
- Production requires an explicit `NEXT_PUBLIC_ENABLE_DAO`-style feature gate,
  subject to the naming conventions present when the rollout package starts.
- Snapshot-era stYFI links remain unchanged until the production cutover package.

## 12. Quality requirements

- All controls are keyboard accessible and have at least a 40 by 40 pixel hit
  area, with 44 pixels used where practical.
- Status is never communicated by color alone.
- Headings balance cleanly; body copy avoids orphaned words where supported.
- Timers and changing weights use tabular numerals.
- Mobile layouts preserve readable scripts, addresses, and vote controls without
  horizontal page overflow.
- No component calls raw wagmi writes.
- Tests cover every capability/status mismatch, especially vetoed-but-votable.
