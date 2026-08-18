# M3 WP10: Producer Staging Contract Validation

Branch: `agent/dao/m3/wp10`

## Objective

Validate producer-generated staging output against the consumer schema and mock
assumptions before production read wiring. This proves the producer/consumer
contract, not a deployed governance lifecycle.

## Depends on

- M3 WP8 merged in `governance-apps`.
- M3 WP9 staging object published from fixture-backed `gov-apps-stats`.

## Scope

- Save a public or sanitized producer-generated fixture for tests.
- Validate schema, canonical metadata, contract identity, script hashes, content,
  moderation, vote actors, decoding, simulation, freshness, and payload size.
- Record fixture provenance and every behavior that still needs live fork proof.
- Make backward-compatible schema fixes if needed.

## Non-goals

- No claim that generated events prove deployed contract behavior.
- No production feed client.
- No incompatible schema change without producer agreement.
- No live wallet overlay.

## Acceptance criteria

- Producer records render through the domain adapter without mock-only fields.
- Proposal identity survives more than one Voting contract generation.
- Script and content failures produce the documented UI states.
- Simulation provenance matches WP8 and distinguishes failure from unavailable.
- A validation report names known gaps, owners, producer merge SHA, staging
  artifact, and the flows deferred to M6.

## Validation

- Fixture parsing and semantic mapping tests.
- Freshness, payload-size, and canonical-block checks.
- Standard repository checks.

## Review

Consumer verifier, schema auditor, and producer representative. Tag M3 only
after both repositories accept the staging contract.
