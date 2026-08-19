# DAO Governance Mock Data Schema v1

This schema defines the production-shaped data boundary for the deterministic
mock client. Names may change during implementation, but the trust boundaries and
state distinctions are required.

## 1. Proposal identity

```ts
type DaoProposalRef = {
  chainId: number;
  votingAddress: Address;
  proposalId: bigint;
};
```

Use a stable serialized key such as
`<chainId>:<lowercaseVotingAddress>:<proposalId>`. Never key cached history by
numeric ID alone.

## 2. Status and capability types

```ts
type DaoProtocolStatus =
  | "proposed"
  | "retracted"
  | "voting"
  | "passed"
  | "failed"
  | "executed"
  | "expired"
  | "invalid"
  | "flagged"
  | "vetoed";

type DaoDisplayStatus =
  | "discussion"
  | "voting"
  | "approved"
  | "rejected"
  | "executed"
  | "expired"
  | "retracted"
  | "flagged"
  | "vetoed"
  | "not_found";

type DaoVotePurpose = "decision" | "participation_only";
type DaoDisplayGroup = "active" | "upcoming" | "closed";

type DaoCapabilities = {
  canVote: boolean;
  votePurpose: DaoVotePurpose | null;
  voteBlockedReason: string | null;
  canRetract: boolean;
  retractBlockedReason: string | null;
  canFlag: boolean;
  flagBlockedReason: string | null;
  canVeto: boolean;
  vetoBlockedReason: string | null;
  canExecute: boolean;
  executeBlockedReason: string | null;
};
```

`protocolStatus` and `displayStatus` are facts for display. Capabilities are
separate facts. In particular, `protocolStatus: "vetoed"` may coexist with
`canVote: true`.

## 3. Proposal content

Recommended immutable content shape:

```ts
type DaoProposalContentV1 = {
  schema: "yearn.dao.proposal.v1";
  title: string;
  summary: string;
  specification: string;
  discussionUrl: string;
  proposalType: "signal" | "executable";
  createdBy: Address;
  createdAt: string;
  links: Array<{ label: string; url: string }>;
};
```

The final wire schema must set string bounds and URL rules before IPFS
publication. Consumers verify bytes and parse the declared version; they do not
re-serialize a parsed object to decide what the CID should be.

## 4. Script and analysis

```ts
type DaoScriptFrame = {
  index: number;
  offset: number;
  target: Address;
  calldata: Hex;
  calldataBytes: number;
  selector: Hex | null;
};

type DaoScriptCheck = {
  state: "empty" | "valid" | "invalid";
  script: string;
  scriptBytes: number | null;
  scriptHash: Hex | null;
  frames: DaoScriptFrame[];
  error: { code: string; message: string; offset: number | null } | null;
};

type DaoDecodedCall = DaoScriptFrame & {
  decodeStatus: "verified" | "unknown" | "failed";
  contractName: string | null;
  functionSignature: string | null;
  arguments: Array<{ name: string; type: string; value: string }>;
  abiSource: string | null;
};

type DaoSimulation = {
  state: "pending" | "succeeded" | "failed" | "unavailable";
  method: "atomic_script_at_state" | null;
  engine: string | null;
  blockNumber: bigint | null;
  blockHash: Hex | null;
  simulatedAt: string | null;
  stateTimestamp: number | null;
  timestampMode: "block" | "override" | null;
  timestampOverride: number | null;
  caller: Address | null;
  stateOverrides: string | null;
  error: string | null;
};

type DaoAnalysis = {
  state: "pending" | "complete" | "partial" | "failed" | "unavailable";
  generatedAt: string | null;
  registryVersion: string | null;
  calls: DaoDecodedCall[];
  proposalSimulation: DaoSimulation;
  error: string | null;
};
```

Raw author input remains a string until syntax validation succeeds. Invalid
characters and odd nibble counts do not describe a byte sequence, so
`scriptBytes` and `scriptHash` are `null` for those errors. Once the input is
valid even-length hex, both values are present even when a later framing,
size, call-count, or proposal-type check fails.

The frontend parser produces `DaoScriptCheck`. Backend decoding and proposal-time
simulation produce the decoded calls and stored simulation. Unknown decoding is
independent from simulation success. `unavailable` means the producer could not
establish an execution-equivalent context; `failed` means the atomic script ran
in that context and reverted.

A fresh execution preflight is wallet-specific and never belongs in the global
feed:

```ts
type DaoExecutionPreflight = {
  state: "idle" | "simulating" | "succeeded" | "failed";
  scriptHash: Hex;
  blockNumber: bigint | null;
  simulatedAt: string | null;
  error: string | null;
};
```

## 5. Event provenance

```ts
type DaoLogRef = {
  blockNumber: bigint;
  blockHash: Hex;
  transactionHash: Hex;
  transactionIndex: number;
  logIndex: number;
};

type DaoProposalEvent = {
  type: "propose" | "vote" | "retract" | "flag" | "veto" | "execute";
  log: DaoLogRef;
  actor: Address;
  voteActorKind: "human" | "ybc_aggregate" | "styfix_aggregate" | null;
  yeaBps: number | null;
  direction: "yea" | "nay" | null;
  weight: bigint | null;
  reason: string | null;
};
```

Every retained event carries canonical block, transaction, and log identity.
`yeaBps` retains the `Voting.Vote.yea` value from 0 through 10,000, including
blended YBC and stYFIx aggregate rewrites. `direction` is an optional derived
label for binary human votes only: 10,000 is Yea and 0 is Nay. Aggregate vote
actors are never counted as additional human participation.

## 6. Proposal view model

```ts
type DaoProposal = {
  ref: DaoProposalRef;
  proposer: Address;
  votingEpoch: bigint;
  createdAt: number;
  voteStartsAt: number;
  voteEndsAt: number;
  executionStartsAt: number | null;
  executionEndsAt: number | null;
  thresholdBps: number;
  totalWeight: bigint;
  yeaWeight: bigint;
  nayWeight: bigint;
  protocolStatus: DaoProtocolStatus;
  displayStatus: DaoDisplayStatus;
  displayGroup: DaoDisplayGroup;
  type: "signal" | "executable";
  content: {
    state: "available" | "unavailable" | "invalid";
    cid: string | null;
    digest: Hex;
    value: DaoProposalContentV1 | null;
    error: string | null;
  };
  discussion: {
    state: "verified" | "unverified" | "unavailable";
    url: string | null;
    title: string | null;
    categoryId: number | null;
    category: string | null;
    categorySlugPath: string[];
  };
  script: {
    bytes: Hex | null;
    hash: Hex;
    hashVerified: boolean | null;
  };
  analysis: DaoAnalysis;
  events: DaoProposalEvent[];
  moderation: {
    flagReason: string | null;
    vetoReason: string | null;
  };
};
```

Connected-wallet state is not part of the global proposal feed:

```ts
type DaoAccountProposalState = {
  address: Address;
  connected: boolean;
  correctChain: boolean;
  votingWeight: bigint;
  effectiveVotingWeight: bigint;
  decayBps: number;
  hasVoted: boolean;
  voteDirection: "yea" | "nay" | null;
  isProposer: boolean;
  isOperator: boolean;
  isGuardian: boolean;
  executionPreflight: DaoExecutionPreflight;
  capabilities: DaoCapabilities;
};

type DaoProposerState = {
  address: Address;
  connected: boolean;
  correctChain: boolean;
  canPropose: boolean;
  proposeBlockedReason: string | null;
  currentWeight: bigint;
  minimumWeight: bigint;
  blacklisted: boolean;
  lastProposedAt: number | null;
  nextEligibleAt: number;
  expectedVotingEpoch: bigint;
  affectedBoostEpochs: Array<{
    epoch: bigint;
    currentProposalCount: number;
    proposalLimit: 64;
  }>;
};
```

`canPropose` is false if any affected reward epoch is already at 64 proposals.
This is shared system capacity, not a per-account proposal count.

Confirmed mock writes use a live overlay until the corresponding event is
indexed:

```ts
type DaoActionType = "vote" | "retract" | "flag" | "veto" | "execute";

type DaoPendingAction = {
  action: DaoActionType;
  ref: DaoProposalRef;
  actor: Address;
  transactionHash: Hex;
  submittedAt: number;
  direction: "yea" | "nay" | null;
  effectiveVotingWeight: bigint | null;
  reason: string | null;
};

type DaoMockTransactionOutcome =
  | "success"
  | "user-rejected"
  | "revert"
  | "network-error";
```

`DaoPendingAction` is not canonical feed history. A confirmed vote updates
`hasVoted` and `voteDirection` only for the full serialized proposal reference
and normalized actor address, so the same wallet may vote on another proposal
and another wallet may vote on the same proposal. That one-vote overlay blocks
an exact duplicate immediately while proposal weights and events stay
unchanged. Indexing applies the pending record once, advances the canonical
block, and clears the pending action; the submitted-vote fact remains until a
fixture or app reset rebuilds the mock store. Every successful submission gets
a deterministic unique transaction hash, and the prepared result, pending
record, and indexed event retain that exact hash. Failed outcomes create no
pending action. Flag and veto reasons are trimmed, required, and limited to 256
UTF-8 bytes both when preparing and when calling the prepared transaction.

`createMockDaoClient` is an immutable fixture-snapshot reader and rejects all
five prepared-write methods with a stable read-only error. It must not imply
that a snapshot-only client can consume one-vote or lifecycle authorization.
Mock routes use `RuntimeMockDaoClient`, backed by the mutable store above, as the
only mock client that prepares and submits actions.

## 7. Domain invariants

- `totalWeight === yeaWeight + nayWeight` and no weight is negative.
- Threshold, decay, and vote-event Yea values stay between 0 and 10,000 basis
  points.
- `createdAt <= voteStartsAt < voteEndsAt`. When both execution times exist,
  `voteEndsAt <= executionStartsAt < executionEndsAt`.
- App type is derived from the event script: Signal has empty bytes and the
  empty-script hash; Executable has non-empty bytes. A conflicting IPFS
  `proposalType` is a content inconsistency, not the authoritative type.
- `hashVerified` is true only when retained script bytes hash to the stored hash.
- The six affected boost epochs start at `expectedVotingEpoch` and are
  consecutive.
- `invalid` and `not_found` are lookup results and never appear in feed history.
- Upcoming contains discussion-phase proposals. Active contains voting proposals
  and approved executable proposals that have not executed or expired. Closed
  contains terminal outcomes and approved signals.
- Verified forum status requires an allowed stable category ID. A matching
  display label alone is insufficient.

The exact canonical content vector is
[`examples/proposal-content.example.json`](examples/proposal-content.example.json).
Its trailing LF is part of the bytes used by the example digest and CID.

## 8. Feed envelope

The mock client should resemble the future feed:

```ts
type DaoFeedV1 = {
  schemaVersion: 1;
  chainId: number;
  generatedAt: string;
  canonicalBlock: { number: bigint; hash: Hex; timestamp: number };
  contracts: Array<{
    votingAddress: Address;
    voterAddress: Address;
    executorAddress: Address;
    deploymentBlock: bigint;
    active: boolean;
  }>;
  proposals: DaoProposal[];
};
```

When JSON is used, bigint values serialize as base-10 strings and adapters parse
them at the domain boundary. The v1 adapter accepts canonical unsigned decimal
strings only: `0` or a non-zero digit followed by digits. Signs, whitespace,
decimals, exponent notation, and leading zeroes are rejected.

## 9. Required deterministic fixtures

All proposal times are derived once from one mock genesis and the contract timing
helper. The mock epoch is 14 days, voting is assigned to creation epoch `N + 1`,
and the vote starts halfway through that voting epoch. Fixtures may supply a
historical execution-delay input to cover both waiting and open execution
states, but they do not hand-author voting epochs or output timestamps. Runtime
initialization, reset, fixture selection, and fact replacement never translate
those immutable proposal or content timestamps to wall-clock time. No-argument
initialization and reset start at `DAO_MOCK_NOW`; runtime time then moves across
the fixed proposal schedule to derive lifecycle state and capabilities.

The authoring eligibility fixture derives `expectedVotingEpoch` from the same
genesis and timing configuration. Store normalization recomputes that epoch and
the six consecutive affected boost-epoch labels whenever runtime time changes,
while retaining the fixture's proposal counts and limits. Equal voting windows
therefore always carry the same `votingEpoch`.

The mock store must provide at least:

| Fixture | Required distinction |
| --- | --- |
| Discussion | Created now, vote scheduled next epoch |
| Voting | Decision vote open |
| Late voting | Effective weight decayed |
| Approved signal | Display Approved despite eventual raw Executed |
| Approved executable | Waiting for execution window or delay |
| Executed | Hash-valid script and completed calls |
| Rejected | Some votes but below threshold |
| No votes | Rejected without quorum language |
| Expired | Passed script missed execution epoch |
| Retracted | Author retracted before votes |
| Flagged | Operator reason retained |
| Early veto | Vetoed and retracted; cannot vote |
| Post-vote veto | Vetoed, not retracted; participation vote open |
| Content unavailable | Onchain record and vote capability retained |
| Content invalid | Strong warning; exact error retained |
| Analysis pending | Content present, calls not yet decoded |
| Partial decode | Known and unknown calls together |
| Simulation failed | Structurally valid script with backend failure |
| Hash mismatch | Execution blocked |
| Direct proposal | No verified forum discussion |
| Guarded execution | Only operator can execute |
| Permissionless execution | Any eligible connected account can execute |
| Proposal capacity full | At least one of the six affected reward epochs is at 64 |

## 10. Mutable debug state

The DAO mock adapter must support:

- set persona;
- select proposal;
- set loading, empty, content, and analysis states;
- patch proposal booleans, votes, threshold, timing, and script state;
- set account weight and voted state;
- set guard mode and roles;
- choose success, wallet-rejection, revert, or network transaction outcomes;
- index or clear a confirmed pending action;
- set proposer blacklist, cooldown, minimum/current weight, and each affected
  epoch's proposal count;
- advance deterministic time;
- reset DAO state without breaking other domain resets.

Presets seed state. Tests and the debug panel must also mutate individual facts so
capability derivation is tested rather than bypassed.

The M1 runtime implements this boundary through a lazy mutable store and a
route-facing mock adapter. `window.__TEST__` exposes domain-prefixed async setters
for fixture and proposal selection, surface state, persona and independent roles,
content, lifecycle, veto, analysis, account, execution, authoring, votes,
threshold, terminal flags, timing, proposer eligibility, and each affected
epoch's capacity. It also exposes transaction outcome, pending-action indexing,
pending-action clearing, plus a read-only JSON-safe DAO evidence snapshot. Each
mutation waits for completion and then invalidates `daoKeys.all`; the evidence
read does not invalidate. Runtime time is distinct from feed provenance. The
canonical timestamp is quantized to a 12-second block slot: time changes within
the current slot preserve the complete block number, hash, and timestamp tuple,
while crossing a slot derives a new coherent tuple. Indexing advances the block
number and binds its hash to that number and canonical timestamp. The initial
fixture block uses the same hash derivation, so advancing and rewinding to an
exact slot restores the identical tuple. Route lifecycle copy uses runtime time;
the canonical timestamp remains snapshot provenance.

The shared `+1 day` and `+7 days` controls continue advancing the global mock
clock and every participating domain, but apply the selected delta to the DAO
store's own deterministic runtime baseline. Explicit bridge `setNow(timestamp)`
remains absolute. Shared DAO time changes also recompute proposer epoch labels
from the fixed genesis before invalidation, so status, capabilities, and
authoring eligibility use one clock.
Account roles apply only when the normalized queried address equals the
role-bearing fixture actor. Reset restores the success outcome and removes any
pending action.

## 11. Parser error catalogue

At minimum:

- `INVALID_HEX`
- `ODD_HEX_LENGTH`
- `SCRIPT_TOO_LARGE`
- `TRUNCATED_HEADER`
- `CALLDATA_OUT_OF_BOUNDS`
- `TOO_MANY_CALLS`
- `TRAILING_BYTES`
- `EMPTY_EXECUTABLE_SCRIPT`
- `NON_EMPTY_SIGNAL_SCRIPT`

Messages include the failing byte offset where one exists. Parser tests use
fixed vectors rather than only generated examples.

Error precedence and offsets are deterministic:

| Error | Rule | Offset |
| --- | --- | --- |
| `INVALID_HEX` | Missing `0x` prefix or a non-hex character | Invalid byte when known; otherwise `null` |
| `ODD_HEX_LENGTH` | The final nibble has no pair | Incomplete final byte |
| `TOO_MANY_CALLS` | A structurally reachable 65th header exists | Start of the 65th header |
| `SCRIPT_TOO_LARGE` | A script with at most 64 reachable calls exceeds 2,048 bytes | First byte beyond the limit |
| `TRUNCATED_HEADER` | The first header contains fewer than 32 bytes | Start of the incomplete header |
| `CALLDATA_OUT_OF_BOUNDS` | Declared calldata exceeds the remaining bytes | Start of the declared calldata |
| `TRAILING_BYTES` | A complete call is followed by fewer than 32 bytes | First trailing byte |
| `EMPTY_EXECUTABLE_SCRIPT` | Executable type uses `0x` | `0` |
| `NON_EMPTY_SIGNAL_SCRIPT` | Signal type uses one or more structurally valid calls | `0` |

Call-count validation precedes the total-byte limit so both contract limits are
independently diagnosable: 65 empty 32-byte headers already occupy 2,080 bytes.
All other inputs over 2,048 bytes report `SCRIPT_TOO_LARGE` before ordinary
framing errors. Structural validation proves only framing; it never labels a
script safe or verified.
