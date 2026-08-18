# DAO Governance

Status: discovery accepted; mock implementation is next.

`DAO Governance` is the proposal, voting, and execution-review app for Yearn's
onchain governance contracts.

## Canonical identity

- Display name: `DAO Governance`
- Shared-host route: `/dao`
- Proposal detail: `/dao/proposals/[id]`
- Proposal creation: `/dao/propose`
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
- Executable proposal authoring accepts the full Executor script as hex. The
  browser checks structure and limits only.
- `gov-apps-stats` owns IPFS retrieval, event history, decoding, and the stored
  proposal-time simulation. The frontend renders that analysis.
- Execution requires the exact event script, hash verification, and a fresh
  current-state simulation.
- The app is mock-first. Feed and onchain work starts only after mock UX review.

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

The next session begins at M1, the deterministic mock foundation. It may proceed
through the M2 mock product, then must stop for user review before starting the
feed, backend, or onchain milestones.
