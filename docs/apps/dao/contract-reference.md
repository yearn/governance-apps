# DAO Governance Contract Reference

Status: reviewed against stYFI governance commit
[`9395d5e`](https://github.com/yearn/stYFI/tree/9395d5e6fffdfe21fda32af94d32fca1a4f7840b).
The source PR remains open, so this document is a pinned integration reference,
not a claim that the contracts are deployed or final.

Rechecked on August 18, 2026: PR #5 remained open and its head was still
`9395d5e`.

Primary contracts:

- `contracts/governance/Voting.vy`
- `contracts/governance/Voter.vy`
- `contracts/governance/Executor.vy`
- `contracts/governance/WeightMeasure.vy`
- `contracts/governance/VoteBoostRewardDistributor.vy`

## 1. Time model

- Epoch length is 14 days.
- A proposal created in epoch `N` is assigned voting epoch `N + 1`.
- Voting opens at the configured `vote_start` offset within that epoch. The
  constructor default opens voting halfway through the epoch.
- An approved executable proposal can execute only in epoch `N + 2`, after the
  configured execution delay and before that epoch ends.
- Contract parameters are live configuration. The app must not hardcode launch
  values for vote length, execution delay, threshold, proposal weight, cooldown,
  guard mode, or role addresses.

All countdowns use chain time in live mode and deterministic mock time in mock
mode.

## 2. Proposal record

The stored proposal contains:

- proposer;
- voting epoch;
- `bytes32` IPFS value;
- execution script hash;
- snapshotted approval threshold;
- total and Yea voting weight;
- retracted, executed, flagged, and vetoed booleans.

The contract does not store the execution script or flag/veto reasons in the
proposal struct. The `Propose` event emits the full script. `Flag` and `Veto`
events emit their reasons.

Canonical application identity is:

```text
chain ID + Voting contract address + numeric proposal ID
```

The numeric ID alone is not stable across replacement Voting contracts.

## 3. Passing rule and quorum

A proposal passes when:

```text
total votes > 0
and
Yea weight / total weight >= the proposal's snapshotted threshold
```

There is no minimum turnout or quorum. The threshold is copied into the proposal
at creation, so later global threshold changes do not affect existing proposals.

## 4. Voting

Users submit Yea or Nay through `Voter`, not directly to `Voting`.

- The public Voter permits one user submission per proposal.
- The effective weight can decay near the end of the voting epoch.
- A zero effective weight reverts.
- A YBC member vote also updates blended YBC and delegated stYFIx aggregate votes.
- Each proposal vote counts toward vote-boost participation regardless of Yea or
  Nay direction.

The raw `Voting.vote` entry point can overwrite a vote, but only the configured
Voter may call it. The public app follows the one-vote rule enforced by `Voter`.

## 5. Veto behavior

Veto has two branches that the UI must keep distinct.

### Before any votes

- `vetoed` becomes true;
- `retracted` also becomes true;
- the retraction hook removes the proposal from participation accounting;
- later voting fails because retracted proposals cannot receive votes.

### After votes exist

- `vetoed` becomes true;
- `retracted` remains false;
- the retraction hook does not run;
- approval and execution are permanently disabled;
- remaining users can still vote during the voting window because `vote` rejects
  retracted proposals but does not reject vetoed proposals.

This branch preserves equal access to vote-boost participation after some users
have already voted. The mock suite and fork suite must include an explicit vote
after a post-vote veto, even though the pinned contract tests do not yet cover
that exact call sequence.

## 6. Proposal eligibility and shared cap

Proposal creation requires:

- weight at or above the live `propose_min_weight`;
- no match in the live proposal blacklist;
- the account's live cooldown to have elapsed.

The configured voting hook can also reject creation. In the pinned
`VoteBoostRewardDistributor`, one proposal increments the proposal count for six
reward epochs, starting with its voting epoch. Every affected epoch has a shared
limit of 64 proposals. Creation reverts if any of those six counts is already 64.
This is a system-wide rolling capacity rule, not a per-proposer allowance.

The authoring client must expose all six current counts and derive `canPropose`
from live hook state. The UI uses `Proposal capacity is full` as the primary
reason and may disclose the first full epoch.

## 7. Retraction and flagging

### Proposer retraction

The proposer may retract before or during the assigned voting epoch if:

- the proposal has no votes;
- it is not already retracted;
- it is not vetoed.

Retraction does not reset the proposer's cooldown.

### Operator flag

The operator may flag a malformed or spam proposal through its voting epoch only
while it has no votes. Flagging also retracts it and removes it from participation
accounting.

Flag and veto reasons are event data. Feed-backed history must retain them.

## 8. Status and display mapping

The contract's `status()` gives terminal booleans priority over time-derived
phases. Application actions must therefore be derived separately.

| Raw status | Default display | Notes |
| --- | --- | --- |
| `PROPOSED` | Discussion | Waiting for the vote window |
| `VOTING` | Voting | Yea/Nay available when account eligibility permits |
| `PASSED` | Approved | Executable proposals may be waiting for execution |
| `FAILED` | Rejected | Threshold was not met or no votes were cast |
| `EXECUTED` | Executed | Use `Approved` instead when the script is empty |
| `EXPIRED` | Expired | Approved executable proposal missed its execution epoch |
| `RETRACTED` | Retracted | No further vote or execution |
| `FLAGGED` | Flagged | Invalid or spam proposal; no further vote |
| `VETOED` | Vetoed | `canVote` may still be true after prior votes |
| `INVALID` | Not found | ID is outside the contract proposal range |

Never map raw status directly to button availability.

## 9. Signal proposals

An empty script has the fixed `keccak256("")` hash. A passed empty-script proposal
reports `PASSED` during the following epoch and later reports `EXECUTED` without
requiring an executable call.

User-facing behavior:

- type: `Signal`;
- final decision: `Approved`;
- supporting text: `No executable actions`;
- do not imply that protocol calls ran.

## 10. Execution scripts

The Executor script is a byte sequence of up to 64 calls and 2,048 bytes total.
Each call is:

```text
32-byte header + calldata
```

The header packs the 20-byte target in its high bytes and the calldata length in
its low 12 bytes. Calls execute in order and atomically. One revert fails the
whole execution. The Executor does not attach native ETH value.

Before proposal submission, the browser checks only:

- valid even-length hex;
- complete 32-byte headers;
- declared calldata fits in the remaining bytes;
- parsing ends exactly at the final byte;
- no more than 64 calls;
- no more than 2,048 bytes;
- the displayed script hash matches the entered bytes.

These checks prove structure, not safety. Semantic decoding and the stored
proposal-time simulation belong on the backend. Execution uses a fresh
current-state simulation.

## 11. Proposal-time simulation

The backend simulation is not a normal `Voting.execute` call at the proposal
block. That call would fail the proposal status and time gates before the voting
and execution epochs.

The producer must simulate the ordered script atomically against proposal-time
state using an execution-equivalent caller and context. It records:

- the simulation method and engine;
- state block number and hash;
- simulated timestamp;
- caller and any state or timestamp overrides;
- whether the complete ordered script succeeded atomically;
- revert or unavailable reason.

If the producer cannot establish an execution-equivalent context, the result is
`unavailable`, not `succeeded`. ABI decoding is independent: an unknown function
can still simulate, and a decoded function can still revert.

This stored result is historical analysis. Execution still requires a fresh
normal simulation through the current Voting contract and current state.

## 12. Events and feed ownership

`gov-apps-stats` must retain:

- `Propose`, including the exact script;
- `Vote`, with aggregate actors classified separately;
- `Retract`;
- `Flag`, including reason;
- `Veto`, including reason;
- `Execute`;
- canonical block, transaction, and log identity.

The producer verifies `keccak256(eventScript) == storedScriptHash`, fetches IPFS
content, decodes known calls, runs the proposal-time simulation, and publishes a
versioned feed. Browser code must not scan full historical logs.

## 13. IPFS convention

The contract stores only 32 bytes and does not specify the CID version, codec, or
hash function. Before live integration, the contract team must confirm the
encoding convention.

The application recommendation is:

- CIDv1;
- raw codec;
- SHA-256;
- Base32 display;
- one bounded canonical JSON block;
- store the 32-byte SHA-256 digest onchain.

Mock data carries both CID and digest. Live publication cannot ship until the
round trip from canonical bytes to CID, digest, and reconstructed CID is fixed by
test vectors and confirmed with the contract team.

## 14. Known integration checks

- The pinned contract requires a proposal cooldown of at least one day, while
  several pinned tests configure zero. Treat the branch test suite as moving.
- The open PR has no final deployment manifest in this repository.
- Role addresses, proposal parameters, execution guard mode, and the CID
  convention remain live-integration inputs, not mock blockers.
