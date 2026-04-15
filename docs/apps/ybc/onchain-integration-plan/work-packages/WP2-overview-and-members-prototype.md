# WP2 — Overview and members prototype

## Objective

Implement the static mock-first hero and members roster.

## Scope

- render collective influence hero
- render raw stake, effective weight, target weight, and maturity
- support observer, member, and loading states
- show delegated vs internal influence clearly

## Non-goals

- proposal actions
- admin operator depth

## Dependencies

- WP0
- WP1

## Suggested files

- `app/ybc/page.tsx`
- `app/ybc/YbcPageClient.tsx`
- `app/ybc/components/YbcHero.tsx`
- `app/ybc/components/MembersTable.tsx`

## Acceptance criteria

- hero clearly separates internal and delegated influence
- members table clearly separates raw and effective weight
- maturity state is visualized
- loading and empty states are present

## UAT checkpoint

UAT-Y1 and UAT-Y4: hero and weight maturity accepted.

## Prompts


### Implementer prompt for WP2

You are implementing `ybc` `WP2` — **Overview and members prototype**.

Objective:
Implement the static mock-first hero and members roster.

Scope:
- render collective influence hero
- render raw stake, effective weight, target weight, and maturity
- support observer, member, and loading states
- show delegated vs internal influence clearly

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- hero clearly separates internal and delegated influence
- members table clearly separates raw and effective weight
- maturity state is visualized
- loading and empty states are present



### Reviewer prompt for WP2

Review this PR only against `ybc` `WP2` — **Overview and members prototype**.

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

Integrate `ybc` `WP2` — **Overview and members prototype** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
