# WP1 — Domain types and mock data contracts

## Objective

Define the Teams mock schema and example payloads used by design and mock-backed implementation.

## Scope

- finalize the mock schema v1
- provide example JSON covering key scenarios
- define status enums for funding and bonus states
- document precision and timestamp rules

## Non-goals

- building route components
- onchain reads/writes

## Dependencies

- WP0

## Suggested files

- `docs/apps/teams/mock-data-schema-v1.md`
- `docs/apps/teams/examples/mock-data.example.json`

## Acceptance criteria

- schema covers directory, workspace, funding, bonus, and admin states
- example payload is sufficient for design and prototype work
- status names are stable and unambiguous

## UAT checkpoint

UAT-T1 can proceed with stable mock data contracts.

## Prompts


### Implementer prompt for WP1

You are implementing `teams` `WP1` — **Domain types and mock data contracts**.

Objective:
Define the Teams mock schema and example payloads used by design and mock-backed implementation.

Scope:
- finalize the mock schema v1
- provide example JSON covering key scenarios
- define status enums for funding and bonus states
- document precision and timestamp rules

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- schema covers directory, workspace, funding, bonus, and admin states
- example payload is sufficient for design and prototype work
- status names are stable and unambiguous



### Reviewer prompt for WP1

Review this PR only against `teams` `WP1` — **Domain types and mock data contracts**.

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

Integrate `teams` `WP1` — **Domain types and mock data contracts** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
