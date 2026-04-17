# WP8 — Onchain reads

## Objective

Add the read model for YBC after the debug-backed mock runtime and production-parity
cleanup are accepted.

## Scope

- define minimal ABIs for YBC reads
- implement a `lib/clients/ybc/onchain.ts` client
- wire read hooks and query keys
- keep disconnected and loading behavior coherent

## Non-goals

- writes
- production rollout

## Dependencies

- WP7

## Suggested files

- `lib/abis/*Ybc*.ts`
- `lib/clients/ybc/onchain.ts`
- `lib/hooks/useYbc.ts`
- `tests/unit/lib/clients/*ybc*`

## Acceptance criteria

- hero, members, proposals, and rewards read from fork-backed chain context
- weight maturity is derived correctly in the read model
- no mock-only assumptions leak into onchain mode
- read failures fall back safely

## UAT checkpoint

UAT-Y7: fork-backed read model validated.

## Prompts


### Implementer prompt for WP8

You are implementing `ybc` `WP8` — **Onchain reads**.

Objective:
Add the read model for YBC after the debug-backed mock runtime and
production-parity cleanup are accepted.

Scope:
- define minimal ABIs for YBC reads
- implement a `lib/clients/ybc/onchain.ts` client
- wire read hooks and query keys
- keep disconnected and loading behavior coherent

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- hero, members, proposals, and rewards read from fork-backed chain context
- weight maturity is derived correctly in the read model
- no mock-only assumptions leak into onchain mode
- read failures fall back safely



### Reviewer prompt for WP8

Review this PR only against `ybc` `WP8` — **Onchain reads**.

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



### Integrator prompt for WP8

Integrate `ybc` `WP8` — **Onchain reads** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
