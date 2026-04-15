# WP7 — Onchain writes

## Objective

Add write preparation and execution for in-scope YBC actions.

## Scope

- prepare and execute propose addition / expulsion
- prepare and execute retract
- prepare and execute vote yea / nay
- prepare and execute execute-proposal
- prepare scoped operator add/remove member flows if included

## Non-goals

- generic arbitrary-call UI
- full governance tooling outside the scoped flows

## Dependencies

- WP6

## Suggested files

- `lib/clients/ybc/onchain.ts`
- `lib/hooks/useYbc.ts`
- `tests/integration/hooks/*ybc*`

## Acceptance criteria

- writes simulate before submit where the repo pattern expects it
- proposal lifecycle writes keep state consistent after mutation
- success and failure states are coherent
- wrong-network behavior is blocked cleanly

## UAT checkpoint

UAT-Y8: fork-backed write paths validated.

## Prompts


### Implementer prompt for WP7

You are implementing `ybc` `WP7` — **Onchain writes**.

Objective:
Add write preparation and execution for in-scope YBC actions.

Scope:
- prepare and execute propose addition / expulsion
- prepare and execute retract
- prepare and execute vote yea / nay
- prepare and execute execute-proposal
- prepare scoped operator add/remove member flows if included

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- writes simulate before submit where the repo pattern expects it
- proposal lifecycle writes keep state consistent after mutation
- success and failure states are coherent
- wrong-network behavior is blocked cleanly



### Reviewer prompt for WP7

Review this PR only against `ybc` `WP7` — **Onchain writes**.

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



### Integrator prompt for WP7

Integrate `ybc` `WP7` — **Onchain writes** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
