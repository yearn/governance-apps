# WP3 — Revenue deposit prototype

## Objective

Implement the mock-backed revenue deposit flow, including conversion preview and credited USD value.

## Scope

- render token selector and amount input
- show conversion preview when a token is auto-converted
- show estimated accountant credit in USD
- render recent deposit history and success state

## Non-goals

- actual onchain writes
- historical price indexing

## Dependencies

- WP1
- WP2

## Suggested files

- `app/teams/components/RevenueDepositCard.tsx`
- `app/teams/messages.ts`
- `tests/components/*teams*`

## Acceptance criteria

- deposit flow communicates permissionless action clearly
- conversion preview is visually clear
- estimated credit and deposited amount are both shown
- success, validation, and empty history states are present

## UAT checkpoint

UAT-T2: deposit conversion preview accepted.

## Prompts


### Implementer prompt for WP3

You are implementing `teams` `WP3` — **Revenue deposit prototype**.

Objective:
Implement the mock-backed revenue deposit flow, including conversion preview and credited USD value.

Scope:
- render token selector and amount input
- show conversion preview when a token is auto-converted
- show estimated accountant credit in USD
- render recent deposit history and success state

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- deposit flow communicates permissionless action clearly
- conversion preview is visually clear
- estimated credit and deposited amount are both shown
- success, validation, and empty history states are present



### Reviewer prompt for WP3

Review this PR only against `teams` `WP3` — **Revenue deposit prototype**.

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



### Integrator prompt for WP3

Integrate `teams` `WP3` — **Revenue deposit prototype** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
