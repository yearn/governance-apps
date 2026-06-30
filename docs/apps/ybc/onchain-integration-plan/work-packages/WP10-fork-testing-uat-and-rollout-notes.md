# WP10 — Fork testing, UAT, and rollout notes

## Objective

Document and validate targeted fork testing, feed freshness checks, UAT checkpoints, and
rollout guidance for YBC.

## Scope

- finalize the fork runbook
- verify staging/production `ybc.json` freshness checks
- record UAT checklist and evidence expectations
- record beta-host, preprod, and production-gate rollout stance
- document rollback and smoke-test expectations

## Non-goals

- shipping production immediately
- unbounded operations documentation

## Dependencies

- WP8 feed-backed reads
- WP9 launch-scope writes

## Suggested files

- `docs/apps/ybc/onchain-integration-plan/fork-runbook.md`
- `docs/shared/release-checklist-template.md`

## Acceptance criteria

- fork runbook is executable by a new developer
- feed freshness and rollback checks are documented
- UAT checklist is explicit
- rollout posture is documented
- remaining blockers are captured

## UAT checkpoint

UAT-Y9: preprod readiness reviewed.

## Prompts


### Implementer prompt for WP10

You are implementing `ybc` `WP10` — **Fork testing, UAT, and rollout notes**.

Objective:
Document and validate targeted fork testing, feed freshness checks, UAT checkpoints, and
rollout guidance for YBC.

Scope:
- finalize the fork runbook
- verify staging/production `ybc.json` freshness checks
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
- feed freshness and rollback checks are documented
- UAT checklist is explicit
- rollout posture is documented
- remaining blockers are captured



### Reviewer prompt for WP10

Review this PR only against `ybc` `WP10` — **Fork testing, UAT, and rollout notes**.

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



### Integrator prompt for WP10

Integrate `ybc` `WP10` — **Fork testing, UAT, and rollout notes** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
