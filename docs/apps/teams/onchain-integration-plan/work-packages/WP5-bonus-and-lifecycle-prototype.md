# WP5 — Bonus and lifecycle prototype

## Objective

Implement the mock-backed bonus surface and lifecycle/ownership section.

## Scope

- show total claimable bonus
- show bonus-by-period detail
- hide complex math in details or tooltip states
- show owner, pending owner, retirement, and migration state

## Non-goals

- full bonus admin parameter editor
- ownership write actions

## Dependencies

- WP1
- WP2

## Suggested files

- `app/teams/components/BonusCard.tsx`
- `app/teams/components/TeamLifecycleCard.tsx`
- `app/teams/messages.ts`

## Acceptance criteria

- bonus main UI is simple and action-oriented
- detail math is available without dominating the page
- lifecycle state is understandable at a glance
- no copy implies bonus is claimed through the Team proxy

## UAT checkpoint

UAT-T4: bonus and lifecycle presentation accepted.

## Prompts


### Implementer prompt for WP5

You are implementing `teams` `WP5` — **Bonus and lifecycle prototype**.

Objective:
Implement the mock-backed bonus surface and lifecycle/ownership section.

Scope:
- show total claimable bonus
- show bonus-by-period detail
- hide complex math in details or tooltip states
- show owner, pending owner, retirement, and migration state

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- bonus main UI is simple and action-oriented
- detail math is available without dominating the page
- lifecycle state is understandable at a glance
- no copy implies bonus is claimed through the Team proxy



### Reviewer prompt for WP5

Review this PR only against `teams` `WP5` — **Bonus and lifecycle prototype**.

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



### Integrator prompt for WP5

Integrate `teams` `WP5` — **Bonus and lifecycle prototype** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
