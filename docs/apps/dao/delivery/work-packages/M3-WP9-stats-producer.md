# M3 WP9: `gov-apps-stats` Producer

Repository: `gov-apps-stats`
Suggested branch: `agent/dao/m3/wp9`

## Objective

Implement deterministic governance indexing, IPFS retrieval, verified decoding,
stored proposal-time simulation, and staging feed publication.

## Depends on

- M3 WP8 accepted and available to the producer repository.
- Pinned ABI, generated or recorded event fixtures, and the completed producer
  handoff.
- Versioned CID fixture vectors. Live content readiness still requires the
  contract team's final convention.

## Scope

- Reorg-aware event reducer exercised from a fixture deployment block.
- Cursor persistence, restart idempotence, and confirmation depth.
- Exact `Propose` script retention and stored hash verification.
- IPFS reconstruction, fetch, parse, retention, and retry.
- Maintained address/ABI registry; unknown selector output.
- Atomic proposal-time script simulation using the caller, context, block,
  timestamp treatment, and provenance fixed by WP8.
- Aggregate actor classification and versioned atomic feed publication.

## Non-goals

- No frontend code.
- No user-wallet eligibility.
- No execution-time simulation; that must be fresh.
- No trust in proposer-supplied ABIs as verified sources.

## Acceptance criteria

- Restarts do not skip or duplicate events.
- Reorged logs disappear before publication.
- Partial builds never replace the last good object.
- IPFS or simulation failures do not drop the onchain proposal.
- Decode and simulation provenance is explicit.
- Fixture-backed output is not presented as proof against deployed contracts.
- Staging output conforms to WP8.

## Validation

Use the producer repository's full checks plus fixtures for reducer order, reorg,
restart, hash mismatch, IPFS outage, invalid content, unknown calls, aggregate
votes, failed simulation, and publication failure.

## Review

Producer reviewer, feed auditor, contract decoder/simulation auditor, and that
repository's integrator. Merge only into the producer integration lane.
