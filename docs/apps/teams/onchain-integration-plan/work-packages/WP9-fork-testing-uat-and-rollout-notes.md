# WP9 — Fork testing, UAT, and rollout notes

## Objective

Document and validate fork testing, UAT checkpoints, and rollout guidance for Team Finances.

## Scope

- finalize the fork runbook
- record UAT checklist and evidence expectations
- record beta-host, preprod, and production-gate rollout stance
- document rollback and smoke-test expectations

## Non-goals

- shipping production immediately
- unbounded operations documentation

## Dependencies

- WP7
- WP8

## Suggested files

- `docs/apps/teams/onchain-integration-plan/fork-runbook.md`
- `docs/shared/release-checklist-template.md`

## Acceptance criteria

- fork runbook is executable by a new developer
- UAT checklist is explicit
- rollout posture is documented
- remaining blockers are captured

## UAT checkpoint

UAT-T8: preprod readiness reviewed.

## Prompts


### Implementer prompt for WP9

You are implementing `teams` `WP9` — **Fork testing, UAT, and rollout notes**.

Objective:
Document and validate fork testing, UAT checkpoints, and rollout guidance for Team Finances.

Scope:
- finalize the fork runbook
- record UAT checklist and evidence expectations
- record beta-host, preprod, and production-gate rollout stance
- document rollback and smoke-test expectations

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- fork runbook is executable by a new developer
- UAT checklist is explicit
- rollout posture is documented
- remaining blockers are captured



### Reviewer prompt for WP9

Review this PR only against `teams` `WP9` — **Fork testing, UAT, and rollout notes**.

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



### Integrator prompt for WP9

Integrate `teams` `WP9` — **Fork testing, UAT, and rollout notes** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
