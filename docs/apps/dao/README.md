# DAO Governance

Status: M2 mock product assembled; the WP7B revision is awaiting explicit user
acceptance.

`DAO Governance` is the proposal, voting, and execution-review app for Yearn's
onchain governance contracts.

## Canonical identity

- Display name: `DAO Governance`
- Shared-host route: `/dao`
- Proposal detail: `/dao/proposals/[id]`
- Proposal creation: `/dao/propose`
- Internal preproduction review host: `dao-beta.dao-ops.com` (unlisted,
  `noindex`, and noncanonical)
- Planned production host: `dao.yearn.fi`
- Forum: `gov.yearn.fi`, shown as the discussion site rather than the app name

## Source-of-truth order

Read these sources in order when implementing or reviewing:

1. [`contract-reference.md`](contract-reference.md) and the pinned contract commit
2. [`functional-requirements.md`](functional-requirements.md)
3. [`user-stories.md`](user-stories.md)
4. [`ui-spec.md`](ui-spec.md)
5. [`mock-data-schema-v1.md`](mock-data-schema-v1.md)
6. the active package under [`delivery/work-packages`](delivery/work-packages)
7. shared repository rules in `AGENTS.md` and `docs/shared`

If the open contract branch changes, update the contract reference and affected
requirements before changing application behavior. Do not silently treat a new
contract revision as equivalent.

## Product decisions

- Governance has no quorum. The UI says `of votes cast` and explains the rule in
  restrained supporting copy.
- A veto before the first vote prevents voting and removes the proposal from
  participation accounting.
- A veto after votes exist prevents approval and execution but leaves Yea/Nay
  voting open for participation credit during the voting window.
- Empty-script proposals are `Signal` proposals. A passed signal displays
  `Approved` and `No executable actions`, even when the raw contract status later
  reports `EXECUTED`.
- `yearn.dao.proposal.v1` contains one exact Markdown source and a bounded asset
  manifest. Title and summary are parsed results, not duplicate stored fields.
  The canonical JSON ends with one LF; its SHA-256 digest is the onchain value.
- Immutable images render as no-load attachment cards. Relative targets are
  authenticated manifest lookups, direct targets are exact raw CIDs, and both
  open the suffix-free trusted gateway URL only after user activation.
- Executable proposal authoring accepts the full Executor script as hex. The
  browser checks structure and limits only.
- `gov-apps-stats` owns IPFS retrieval, event history, decoding, and the stored
  proposal-time simulation. The frontend renders that analysis.
- Lifecycle status, vote result, moderation, and execution are separate facts.
  Event time comes from the block producer, verified sources are structured
  HTTPS records, and proposal rules are proposal-owned snapshots.
- Proposal identity is decoded from one matching successful `Propose` receipt.
  A transaction link appears as soon as its hash is known; proposal links wait
  for receipt-derived identity and retain it while indexing catches up.
- Execution requires the exact event script, hash verification, and a fresh
  current-state simulation.
- The app is mock-first. Feed and onchain work starts only after mock UX review.
- The guarded preproduction review remains mock-backed and is not production
  approval. A custom domain does not make the host access-controlled; operators
  must add Cloudflare Access separately if authenticated access is required.

## Documentation map

- Contract behavior: [`contract-reference.md`](contract-reference.md)
- Functional scope: [`functional-requirements.md`](functional-requirements.md)
- User outcomes: [`user-stories.md`](user-stories.md)
- Layout and copy: [`ui-spec.md`](ui-spec.md)
- Mock/domain data: [`mock-data-schema-v1.md`](mock-data-schema-v1.md)
- Delivery and agent workflow: [`delivery/README.md`](delivery/README.md)
- Delivery ledger: [`delivery/status.md`](delivery/status.md)
- Sol Ultra kickoff: [`delivery/kickoff-prompt.md`](delivery/kickoff-prompt.md)

## Current gate

M2 WP7B is the current product gate. The revised mock UX may be reviewed on the
shared `/dao` path or guarded preproduction host, but it remains unaccepted.
Do not begin M3, backend feeds, real forum validation, IPFS publication, onchain
reads/writes, or public production rollout until the user explicitly accepts it.
