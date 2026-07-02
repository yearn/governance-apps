# WP9 — Feed-backed reads

## Objective

Replace the production Teams read model with the accepted `teams.json` feed while keeping
mocks available only for local/debug fallback.

## Scope

- add a typed schema/fetcher for `teams.json`
- implement a feed-backed `lib/clients/teams/onchain.ts` client
- wire read hooks and query keys
- add live wallet overlays for owner status, balances, allowances, and write readiness
- keep disconnected and loading behavior coherent

## Non-goals

- writes
- production rollout
- producer implementation in `gov-apps-stats`
- browser-side historical log indexing

## Dependencies

- WP8
- shared WP2 in `gov-apps-stats`
- shared WP3 consumer validation

## Suggested files

- `lib/schemas/teams-feed.ts`
- `lib/clients/teams/global.ts`
- `lib/clients/teams/onchain.ts`
- `lib/hooks/useTeams.ts`
- `tests/unit/lib/clients/*teams*`

## Acceptance criteria

- directory and workspace reads load from the accepted `teams.json` feed
- production mode does not instantiate mock-only Teams state
- query invalidation and refetch behavior are sane
- no mock-only assumptions leak into onchain mode
- read failures fall back safely
- wallet overlays do not block disconnected global rendering

## UAT checkpoint

UAT-T6: feed-backed read model validated.

## Implementation notes

- The non-mock Teams runtime now reads `NEXT_PUBLIC_TEAMS_DATA_URL` through the
  `/api/teams-data` same-origin proxy and validates the payload with
  `lib/schemas/teams-feed.ts`.
- `lib/clients/teams/onchain.ts` maps the feed into the accepted Teams page data shape
  for directory, workspace, revenue history, funding approvals, bonus state, lifecycle,
  and admin metadata.
- Feed mode keeps revenue, funding, and bonus write permissions disabled until WP10 and
  the fork-smoke runbook validate launch-scope writes.
- The mapper intentionally does not trust `team.availableActions` from the feed for
  production permissions. That block is tolerated as a v1 producer compatibility hint;
  write eligibility belongs to WP10's client-side wallet/write overlay.
- Workspace selection is local UI state in feed mode; local and E2E mock mode still use
  the debug-backed mock store and floating controls.
- The current production feed has not yet exercised live revenue, funding, return, or
  bonus-claim event rows; keep schema and mapper fixtures for those paths until onchain
  activity exists.

## Prompts


### Implementer prompt for WP9

You are implementing `teams` `WP9` — **Feed-backed reads**.

Objective:
Replace the production Teams read model with the accepted `teams.json` feed while
keeping mocks available only for local/debug fallback.

Scope:
- add a typed schema/fetcher for `teams.json`
- implement a feed-backed `lib/clients/teams/onchain.ts` client
- wire read hooks and query keys
- add live wallet overlays for owner status, balances, allowances, and write readiness
- keep disconnected and loading behavior coherent

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- do not scan historical logs in browser code
- update tests and docs if behavior changes

Definition of done:
- directory and workspace reads load from the accepted `teams.json` feed
- production mode does not instantiate mock-only Teams state
- query invalidation and refetch behavior are sane
- no mock-only assumptions leak into onchain mode
- read failures fall back safely
- wallet overlays do not block disconnected global rendering



### Reviewer prompt for WP9

Review this PR only against `teams` `WP9` — **Feed-backed reads**.

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
- browser code indexes historical Teams logs



### Integrator prompt for WP9

Integrate `teams` `WP9` — **Feed-backed reads** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
