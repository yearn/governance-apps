# WP0 — Route, naming, and shell baseline

## Objective

Establish the Team Finances route baseline, naming stance, and top-level shell for mock-first delivery.

## Scope

- document the canonical app name, slug, route key, and display label
- define the route/file layout
- define the top-level sections and default landing state
- confirm beta-host rollout stance and production gate

## Non-goals

- building onchain clients
- full mock data implementation

## Dependencies

- none

## Suggested files

- `docs/apps/teams/README.md`
- `docs/apps/teams/ui-spec.md`
- `docs/apps/teams/onchain-integration-plan/planning-spec.md`

## Acceptance criteria

- app name / slug is fixed as `teams` in docs
- route key is fixed as `/teams` in docs
- display label `Team Finances` is explicit in docs
- beta host `teams-beta.dao-ops.com` is explicit in docs
- production host `teams.yearn.fi` is explicit in docs
- production remains gated until live contract wiring and production approval
- shell and section map are approved
- no ambiguity remains about naming or rollout posture

## UAT checkpoint

UAT-T1 can begin once the shell and naming are approved.

## Prompts


### Implementer prompt for WP0

You are implementing `teams` `WP0` — **Route, naming, and shell baseline**.

Objective:
Establish the Team Finances route baseline, naming stance, and top-level shell for mock-first delivery.

Scope:
- document the canonical app name, slug, route key, and display label
- define the route/file layout
- define the top-level sections and default landing state
- confirm beta-host rollout stance and production gate

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- app name / slug is fixed as `teams` in docs
- route key is fixed as `/teams` in docs
- display label `Team Finances` is explicit in docs
- beta host `teams-beta.dao-ops.com` is explicit in docs
- production host `teams.yearn.fi` is explicit in docs
- production remains gated until live contract wiring and production approval
- shell and section map are approved
- no ambiguity remains about naming or rollout posture



### Reviewer prompt for WP0

Review this PR only against `teams` `WP0` — **Route, naming, and shell baseline**.

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



### Integrator prompt for WP0

Integrate `teams` `WP0` — **Route, naming, and shell baseline** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
