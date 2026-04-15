# WP2 — Directory and overview prototype

## Objective

Implement the static mock-first directory and overview workspace states.

## Scope

- render the team directory
- render overview cards for current-period and lifetime values
- support active / retiring / retired visual states
- support loading and empty states

## Non-goals

- interactive deposit or claim flows
- admin console depth

## Dependencies

- WP0
- WP1

## Suggested files

- `app/teams/page.tsx`
- `app/teams/TeamsPageClient.tsx`
- `app/teams/components/TeamsDirectory.tsx`
- `app/teams/components/TeamWorkspace.tsx`
- `app/teams/components/TeamOverviewCard.tsx`

## Acceptance criteria

- directory renders multiple teams cleanly
- overview distinguishes current period from lifetime
- retirement state is visible
- loading and empty states are present

## UAT checkpoint

UAT-T1: directory and overview accepted.

## Prompts


### Implementer prompt for WP2

You are implementing `teams` `WP2` — **Directory and overview prototype**.

Objective:
Implement the static mock-first directory and overview workspace states.

Scope:
- render the team directory
- render overview cards for current-period and lifetime values
- support active / retiring / retired visual states
- support loading and empty states

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- directory renders multiple teams cleanly
- overview distinguishes current period from lifetime
- retirement state is visible
- loading and empty states are present



### Reviewer prompt for WP2

Review this PR only against `teams` `WP2` — **Directory and overview prototype**.

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



### Integrator prompt for WP2

Integrate `teams` `WP2` — **Directory and overview prototype** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
