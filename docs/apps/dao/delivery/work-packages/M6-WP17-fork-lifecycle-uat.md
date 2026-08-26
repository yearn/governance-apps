# M6 WP17: Fork Lifecycle E2E and UAT

Branch: `agent/dao/m6/wp17`

## Objective

Prove that contracts, publication, indexing, decoding, simulation, reads, and
writes work together across every required lifecycle branch.

## Depends on

- M6 WP16 merged into `agent/integration`.
- Producer fork environment available.

## Required flows

- Create signal and executable proposals.
- Move from discussion into voting.
- Cast normal and late-decayed votes.
- Veto before any vote and confirm voting fails.
- Vote, veto, then cast a participation vote.
- Retract, flag, reject, approve, execute, fail execution, and expire.
- Show no-quorum passage with positive Yea weight above threshold.
- Show feed lag after writes and later reconciliation.
- Replay actual fork logs through the producer and validate the resulting feed
  in the frontend.
- Exercise missing IPFS, partial decode, and failed simulation fixtures where live
  reproduction is impractical.

## Acceptance criteria

- Every flow records transaction, block, feed snapshot, UI result, and expected
  contract state.
- No mock-only assumption masks a live integration gap.
- Post-veto participation is explicitly proved on the pinned contract revision.
- Live fork output closes every fixture-only gap recorded by M3 WP10.
- Execution uses exact script and fresh simulation.
- User reviews and accepts the fork UAT evidence.

## Validation

- `npm run typecheck`, `npm run lint`, `npm run test`.
- `npm run test:e2e`, `npm run test:e2e:full`, `npm run build`.
- Producer full checks and saved evidence.

## Review

Independent fork auditor, contract auditor, product UAT reviewer, and integrator.
Stop at the human gate before tagging M6 or starting rollout.
Returned changes become `M6-WP17A`, `M6-WP17B`, and so on from the latest
integration head, followed by a new review and user gate.
