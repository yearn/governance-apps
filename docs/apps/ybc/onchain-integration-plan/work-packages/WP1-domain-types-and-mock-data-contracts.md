# WP1 — Domain types and mock data contracts

## Objective

Define the YBC mock schema and example payloads used by design and mock-backed implementation.

## Scope

- finalize the mock schema v1
- provide example JSON covering observer, member, and operator states
- define proposal phase and timing fields
- document separate raw stake vs effective weight

## Non-goals

- building route components
- onchain reads/writes

## Dependencies

- WP0

## Suggested files

- `docs/apps/ybc/mock-data-schema-v1.md`
- `docs/apps/ybc/examples/mock-data.example.json`

## Acceptance criteria

- schema covers hero, roster, proposals, rewards, and admin
- example payload is sufficient for design and prototype work
- timing and weight fields are stable and unambiguous

## UAT checkpoint

UAT-Y1 can proceed with stable mock data contracts.

## Prompts


### Implementer prompt for WP1

You are implementing `ybc` `WP1` — **Domain types and mock data contracts**.

Objective:
Define the YBC mock schema and example payloads used by design and mock-backed implementation.

Scope:
- finalize the mock schema v1
- provide example JSON covering observer, member, and operator states
- define proposal phase and timing fields
- document separate raw stake vs effective weight

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- schema covers hero, roster, proposals, rewards, and admin
- example payload is sufficient for design and prototype work
- timing and weight fields are stable and unambiguous



### Reviewer prompt for WP1

Review this PR only against `ybc` `WP1` — **Domain types and mock data contracts**.

Check:
- scope matches the package and does not bleed into later WPs
- acceptance criteria are fully met
- state coverage is complete
- docs are updated
- tests reflect behavior changes

Block if:
- the implementation introduces out-of-scope product behavior
- critical route states are missing
- shared repo patterns are ignored without justification



### Integrator prompt for WP1

Integrate `ybc` `WP1` — **Domain types and mock data contracts** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
