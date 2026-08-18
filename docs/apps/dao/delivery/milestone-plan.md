# DAO Governance Milestone Plan

## M0: specification and tooling

Freeze accepted contract behavior, product requirements, mock data boundaries,
worktree support, agent prompts, and documentation precedence. Merge this baseline
into `agent/integration` before implementation branches are created.

## M1: mock foundation

Build the typed domain client, deterministic proposal fixtures, status/capability
derivation, raw script parser, three routes, and shared debug/test adapters.

Exit checks:

- domain logic has unit coverage;
- all routes render production-shaped loading and empty shells;
- every required state is reachable through the shared debug panel;
- standard checks and route smoke pass.

## M2: mock product and UX

Build the proposal list and detail, voting, retract/flag/veto/execute mock actions,
signal and executable authoring, failure states, responsive behavior, and full
mock E2E matrix.

Exit checks:

- post-veto participation voting is proved;
- raw-script authoring covers fixed parser vectors;
- no-quorum and signal copy is accepted;
- phone, tablet, desktop, keyboard, and focus reviews pass;
- user accepts the mock experience.

## M3: feed and backend analysis

Define the consumer schema, implement fixture-backed `gov-apps-stats` indexing,
IPFS retrieval, script retention, decoding, proposal-time simulation, and
validate its staging contract back in the frontend repository. Actual fork logs
are proved in M6.

Exit checks:

- event reducer is deterministic and reorg-aware;
- script hash and aggregate-vote classification are correct;
- IPFS and analysis failures are representable and retryable;
- a producer-generated staging object passes consumer semantic validation.

## M4: feed-backed reads

Replace production mock reads with the DAO feed and live wallet overlays. Present
content, decoding, and analysis provenance without making feed action labels
authoritative.

Exit checks:

- production mode does not instantiate mock state;
- history comes from the feed;
- current account capabilities come from live reads;
- saved producer-feed E2E passes.

## M5: publication and writes

Implement forum validation, canonical IPFS publication, pinning, proposer writes,
voting, retraction, moderation, script recovery, current simulation, and
execution through prepared domain transactions and `useTx`.

Exit checks:

- CID/digest test vectors are confirmed;
- every write is simulated and uses the shared pipeline;
- exact script and hash gates execution;
- wrong network, rejection, revert, and feed lag are covered.

## M6: fork proof

Create or attach a fork deployment, run the producer and frontend together, and
prove every lifecycle branch with recorded evidence.

Exit checks:

- signal and executable proposals complete;
- early and post-vote veto branches pass;
- decay, flag, retract, reject, approve, execute, revert, and expire pass;
- user accepts fork UAT.

## M7: controlled rollout

Validate shared-host and beta behavior, configure monitoring and rollback, then
expose `dao.yearn.fi` only after production approval. Update stYFI Snapshot links
as an explicit cutover step, not earlier.
