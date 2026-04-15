# WP8 — Onchain writes

## Objective

Add write preparation and execution for in-scope Team Finances actions.

## Scope

- prepare and execute revenue deposit
- prepare and execute funding claim
- prepare and execute funding return
- prepare and execute bonus claim

## Non-goals

- out-of-scope vest management
- every possible admin setter

## Dependencies

- WP7

## Suggested files

- `lib/clients/teams/onchain.ts`
- `lib/hooks/useTeams.ts`
- `tests/integration/hooks/*teams*`

## Acceptance criteria

- writes simulate before submit where the repo pattern expects it
- success and failure states are coherent
- query invalidation keeps the workspace consistent after writes
- wrong-network behavior is blocked cleanly

## UAT checkpoint

UAT-T7: fork-backed write paths validated.

## Prompts


### Implementer prompt for WP8

You are implementing `teams` `WP8` — **Onchain writes**.

Objective:
Add write preparation and execution for in-scope Team Finances actions.

Scope:
- prepare and execute revenue deposit
- prepare and execute funding claim
- prepare and execute funding return
- prepare and execute bonus claim

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- writes simulate before submit where the repo pattern expects it
- success and failure states are coherent
- query invalidation keeps the workspace consistent after writes
- wrong-network behavior is blocked cleanly



### Reviewer prompt for WP8

Review this PR only against `teams` `WP8` — **Onchain writes**.

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



### Integrator prompt for WP8

Integrate `teams` `WP8` — **Onchain writes** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
