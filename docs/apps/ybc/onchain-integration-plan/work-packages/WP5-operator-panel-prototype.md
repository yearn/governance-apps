# WP5 — Operator panel prototype

## Objective

Implement the mock-backed operator/admin panel within MVP scope.

## Scope

- render operator list, thresholds, and hooks visibility
- render add/remove member affordances
- support mock operator persona gating
- keep arbitrary-call behavior out of the UI

## Non-goals

- generic arbitrary-call builder
- full protocol-wide admin tooling

## Dependencies

- WP1
- WP2
- WP3

## Suggested files

- `app/ybc/components/OperatorPanel.tsx`
- `app/ybc/messages.ts`

## Acceptance criteria

- operator panel stays within MVP scope
- threshold and hook state are visible
- member override affordances are understandable
- operator gating is clear

## UAT checkpoint

UAT-Y6: operator panel accepted.

## Prompts


### Implementer prompt for WP5

You are implementing `ybc` `WP5` — **Operator panel prototype**.

Objective:
Implement the mock-backed operator/admin panel within MVP scope.

Scope:
- render operator list, thresholds, and hooks visibility
- render add/remove member affordances
- support mock operator persona gating
- keep arbitrary-call behavior out of the UI

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- operator panel stays within MVP scope
- threshold and hook state are visible
- member override affordances are understandable
- operator gating is clear



### Reviewer prompt for WP5

Review this PR only against `ybc` `WP5` — **Operator panel prototype**.

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

Integrate `ybc` `WP5` — **Operator panel prototype** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
