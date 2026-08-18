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
  script: Hex;
  scriptBytes: number;
  scriptHash: Hex;
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
  direction: "yea" | "nay" | null;
  weight: bigint | null;
  reason: string | null;
};
```

Every retained event carries canonical block, transaction, and log identity.
Aggregate vote actors are never counted as additional human participation.

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

## 7. Domain invariants

- `totalWeight === yeaWeight + nayWeight` and no weight is negative.
- Threshold and decay values stay between 0 and 10,000 basis points.
- `createdAt <= voteStartsAt < voteEndsAt`. When both execution times exist,
  `voteEndsAt <= executionStartsAt < executionEndsAt`.
- App type is derived from the event script: Signal has empty bytes and the
  empty-script hash; Executable has non-empty bytes. A conflicting IPFS
  `proposalType` is a content inconsistency, not the authoritative type.
- `hashVerified` is true only when retained script bytes hash to the stored hash.
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
them at the domain boundary.

## 9. Required deterministic fixtures

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
- set proposer blacklist, cooldown, minimum/current weight, and each affected
  epoch's proposal count;
- advance deterministic time;
- reset DAO state without breaking other domain resets.

Presets seed state. Tests and the debug panel must also mutate individual facts so
capability derivation is tested rather than bypassed.

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
