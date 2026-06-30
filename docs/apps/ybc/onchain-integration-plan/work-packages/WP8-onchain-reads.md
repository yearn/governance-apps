# WP8 — Feed-backed reads

## Objective

Replace the production YBC read model with the accepted `ybc.json` feed while keeping
mocks available only for local/debug fallback.

## Scope

- add a typed schema/fetcher for `ybc.json`
- implement a feed-backed `lib/clients/ybc/onchain.ts` client
- wire read hooks and query keys
- add live wallet overlays for member status, voted status, and write readiness
- keep disconnected and loading behavior coherent

## Non-goals

- writes
- production rollout
- producer implementation in `gov-apps-stats`
- browser-side historical log indexing

## Dependencies

- WP7
- shared WP2 in `gov-apps-stats`
- shared WP3 consumer validation

## Suggested files

- `lib/schemas/ybc-feed.ts`
- `lib/clients/ybc/global.ts`
- `lib/clients/ybc/onchain.ts`
- `lib/hooks/useYbc.ts`
- `tests/unit/lib/clients/*ybc*`

## Acceptance criteria

- hero, members, proposals, and rewards read from the accepted `ybc.json` feed
- production mode does not instantiate mock-only YBC state
- weight maturity is rendered from feed fields with safe fallbacks
- no mock-only assumptions leak into onchain mode
- read failures fall back safely
- wallet overlays do not block disconnected global rendering

## UAT checkpoint

UAT-Y7: feed-backed read model validated.

## Prompts


### Implementer prompt for WP8

You are implementing `ybc` `WP8` — **Feed-backed reads**.

Objective:
Replace the production YBC read model with the accepted `ybc.json` feed while keeping
mocks available only for local/debug fallback.

Scope:
- add a typed schema/fetcher for `ybc.json`
- implement a feed-backed `lib/clients/ybc/onchain.ts` client
- wire read hooks and query keys
- add live wallet overlays for member status, voted status, and write readiness
- keep disconnected and loading behavior coherent

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- do not scan historical logs in browser code
- update tests and docs if behavior changes

Definition of done:
- hero, members, proposals, and rewards read from the accepted `ybc.json` feed
- production mode does not instantiate mock-only YBC state
- weight maturity is rendered from feed fields with safe fallbacks
- no mock-only assumptions leak into onchain mode
- read failures fall back safely
- wallet overlays do not block disconnected global rendering



### Reviewer prompt for WP8

Review this PR only against `ybc` `WP8` — **Feed-backed reads**.

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
- browser code indexes historical YBC logs



### Integrator prompt for WP8

Integrate `ybc` `WP8` — **Feed-backed reads** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
