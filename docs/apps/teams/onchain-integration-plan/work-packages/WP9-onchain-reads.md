# WP9 — Onchain reads

## Objective

Add the read model for Teams after the debug-backed mock runtime and production-parity
cleanup are accepted.

## Scope

- define minimal ABIs for teams-related reads
- implement a `lib/clients/teams/onchain.ts` client
- wire read hooks and query keys
- keep disconnected and loading behavior coherent

## Non-goals

- writes
- production rollout

## Dependencies

- WP8

## Suggested files

- `lib/abis/*Teams*.ts`
- `lib/clients/teams/onchain.ts`
- `lib/hooks/useTeams.ts`
- `tests/unit/lib/clients/*teams*`

## Acceptance criteria

- directory and workspace reads load from fork-backed chain context
- query invalidation and refetch behavior are sane
- no mock-only assumptions leak into onchain mode
- read failures fall back safely

## UAT checkpoint

UAT-T6: fork-backed read model validated.

## Prompts


### Implementer prompt for WP9

You are implementing `teams` `WP9` — **Onchain reads**.

Objective:
Add the read model for Teams after the debug-backed mock runtime and
production-parity cleanup are accepted.

Scope:
- define minimal ABIs for teams-related reads
- implement a `lib/clients/teams/onchain.ts` client
- wire read hooks and query keys
- keep disconnected and loading behavior coherent

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- directory and workspace reads load from fork-backed chain context
- query invalidation and refetch behavior are sane
- no mock-only assumptions leak into onchain mode
- read failures fall back safely



### Reviewer prompt for WP9

Review this PR only against `teams` `WP9` — **Onchain reads**.

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

Integrate `teams` `WP9` — **Onchain reads** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
