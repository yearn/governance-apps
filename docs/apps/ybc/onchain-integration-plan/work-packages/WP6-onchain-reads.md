# WP6 — Onchain reads

## Objective

Add the read model for YBC after the mock UX and data contracts are accepted.

## Scope

- define minimal ABIs for YBC reads
- implement a `lib/clients/ybc/onchain.ts` client
- wire read hooks and query keys
- keep disconnected and loading behavior coherent

## Non-goals

- writes
- production rollout

## Dependencies

- WP1
- WP2
- WP3
- WP4
- WP5

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


### Implementer prompt for WP6

You are implementing `ybc` `WP6` — **Onchain reads**.

Objective:
Add the read model for YBC after the mock UX and data contracts are accepted.

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



### Reviewer prompt for WP6

Review this PR only against `ybc` `WP6` — **Onchain reads**.

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

Integrate `ybc` `WP6` — **Onchain reads** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
