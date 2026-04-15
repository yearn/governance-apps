# WP6 — Admin console prototype

## Objective

Implement the mock-backed admin / ops console structure.

## Scope

- render registry, revenue ops, funding ops, and bonus ops groups
- show whitelisted tokens and bucket usage
- show approval and finalization summaries
- support mock admin-only visibility

## Non-goals

- full low-level setter coverage
- production-ready permissions system

## Dependencies

- WP1
- WP2
- WP3
- WP4
- WP5

## Suggested files

- `app/teams/components/AdminConsole.tsx`
- `app/teams/messages.ts`

## Acceptance criteria

- admin information architecture is coherent
- bucket usage and key ops data are visible
- the admin view is distinct from the default user workspace
- mock persona gating is clear

## UAT checkpoint

UAT-T5: admin information architecture accepted.

## Prompts


### Implementer prompt for WP6

You are implementing `teams` `WP6` — **Admin console prototype**.

Objective:
Implement the mock-backed admin / ops console structure.

Scope:
- render registry, revenue ops, funding ops, and bonus ops groups
- show whitelisted tokens and bucket usage
- show approval and finalization summaries
- support mock admin-only visibility

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- admin information architecture is coherent
- bucket usage and key ops data are visible
- the admin view is distinct from the default user workspace
- mock persona gating is clear



### Reviewer prompt for WP6

Review this PR only against `teams` `WP6` — **Admin console prototype**.

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



### Integrator prompt for WP6

Integrate `teams` `WP6` — **Admin console prototype** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
