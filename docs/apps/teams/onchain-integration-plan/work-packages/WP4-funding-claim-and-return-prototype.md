# WP4 — Funding claim and return prototype

## Objective

Implement the mock-backed funding approval table and claim/return flows.

## Scope

- render approvals with current status
- show claimable amount, used amount, and recipient
- show stream-backed vs late-liquid status
- support mock claim and return interactions

## Non-goals

- stream-claim management outside the initial claim
- full admin approval creation UX

## Dependencies

- WP1
- WP2

## Suggested files

- `app/teams/components/FundingApprovalsTable.tsx`
- `app/teams/messages.ts`
- `tests/components/*teams*`

## Acceptance criteria

- approval rows communicate period-scoped claimability clearly
- late-liquid and streaming states are distinguishable
- return funding flow is represented separately from claim
- validation and success states are present

## UAT checkpoint

UAT-T3: funding claim statuses accepted.

## Prompts


### Implementer prompt for WP4

You are implementing `teams` `WP4` — **Funding claim and return prototype**.

Objective:
Implement the mock-backed funding approval table and claim/return flows.

Scope:
- render approvals with current status
- show claimable amount, used amount, and recipient
- show stream-backed vs late-liquid status
- support mock claim and return interactions

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- approval rows communicate period-scoped claimability clearly
- late-liquid and streaming states are distinguishable
- return funding flow is represented separately from claim
- validation and success states are present



### Reviewer prompt for WP4

Review this PR only against `teams` `WP4` — **Funding claim and return prototype**.

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



### Integrator prompt for WP4

Integrate `teams` `WP4` — **Funding claim and return prototype** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
