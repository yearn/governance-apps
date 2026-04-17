# WP7 — Debug-backed mock runtime

## Objective

Move Teams off route-local scenario switching and onto a mutable mock runtime that is
mutated in place through the shared debug panel and E2E bridge.

## Scope

- replace route-local scenario orchestration with a shared Teams mock store
- allow named presets only as optional bootstraps into the shared store, not as the
  primary QA model
- expose granular app-specific debug controls that mutate live Teams state in place
  while normal route navigation stays unchanged
- support at minimum in-place setters for:
  - viewer persona
  - selected team / directory-only state
  - loading and empty coverage
  - current period / mock time
  - team lifecycle and read-only status
  - revenue preview, submission success, and deposit history state
  - funding approval amounts, claimability, used/remaining balances, and late-liquid
    status
  - bonus claimability, claimed/finalization state, and admin visibility inputs
- wire Teams into shared debug runtime behavior so `DebugControls` time travel and
  `Reset App` mutate, invalidate, and reset the Teams store correctly
- extend the test bridge so E2E and manual QA can reach Teams states without clicking
  visible prototype controls

## Non-goals

- onchain reads or writes
- new product scope beyond the accepted Teams MVP
- a generic admin back-office editor outside the scoped Teams surface

## Dependencies

- WP1
- WP2
- WP3
- WP4
- WP5
- WP6

## Suggested files

- `app/teams/TeamsPageClient.tsx`
- `app/teams/components/MockControls.tsx`
- `components/DebugControls.tsx`
- `lib/clients/teams/mock.ts`
- `lib/hooks/useTeams.ts`
- `lib/test-bridge.ts`
- `tests/components/TeamsPageClient.test.tsx`
- `tests/e2e/*teams*`

## Acceptance criteria

- the default `/teams` route no longer depends on a visible scenario switcher or
  prototype-state card to reach accepted UX flows
- the Teams mock runtime is mutable and shared across the route instead of swapping
  whole scenario payloads in and out
- route navigation stays production-like while debug actions mutate state underneath the
  current route instead of swapping the user into canned views
- app-specific debug controls expose granular Teams setters for persona, team
  selection, loading/empty coverage, current period/time, lifecycle/read-only status,
  revenue state, funding state, bonus state, and admin visibility inputs
- any named debug presets are implemented as convenience bootstraps into the mutable
  store rather than as the primary or only QA path
- shared `DebugControls` time travel invalidates Teams queries and updates Teams state
  coherently
- shared `Reset App` resets the Teams mock store alongside the existing mock-backed
  domains
- the E2E bridge exposes Teams state seeding APIs so browser tests avoid visible debug
  clicking and route-local state controls, with granular setters for Teams state rather
  than scenario-only loading

## UAT checkpoint

UAT-T5A can begin once the debug-backed Teams runtime replaces the route-local
prototype controls.

## Prompts


### Implementer prompt for WP7

You are implementing `teams` `WP7` — **Debug-backed mock runtime**.

Objective:
Move Teams off route-local scenario switching and onto a mutable mock runtime that is
mutated in place through the shared debug panel and E2E bridge.

Scope:
- replace route-local scenario orchestration with a shared Teams mock store
- allow named presets only as optional bootstraps into the shared store, not as the
  primary QA model
- expose granular app-specific debug controls that mutate live Teams state in place
  while normal route navigation stays unchanged
- support at minimum in-place setters for persona, selected team, loading/empty,
  current period/time, lifecycle/read-only, revenue state, funding state, bonus state,
  and admin visibility inputs
- wire Teams into shared debug runtime behavior so `DebugControls` time travel and
  `Reset App` mutate, invalidate, and reset the Teams store correctly
- extend the test bridge so E2E and manual QA can reach Teams states without clicking
  visible prototype controls

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- the default `/teams` route no longer depends on a visible scenario switcher or
  prototype-state card to reach accepted UX flows
- the Teams mock runtime is mutable and shared across the route instead of swapping
  whole scenario payloads in and out
- route navigation stays production-like while debug actions mutate state underneath the
  current route instead of swapping canned views
- app-specific debug controls expose granular Teams setters rather than only preset or
  surface-mode selectors
- shared `DebugControls` time travel and `Reset App` include Teams store integration
- the E2E bridge exposes granular Teams state setters



### Reviewer prompt for WP7

Review this PR only against `teams` `WP7` — **Debug-backed mock runtime**.

Check:
- scope matches the package and does not bleed into later WPs
- acceptance criteria are fully met
- state coverage is complete
- docs are updated
- tests reflect behavior changes

Block if:
- the implementation leaves route-local scenario chrome as the primary Teams QA path
- critical Teams review states cannot be reached through granular debug or test APIs
- debug controls still operate by swapping named canned views instead of mutating live
  route state
- `DebugControls` time travel or `Reset App` omit the Teams store
- shared repo patterns are ignored without justification



### Integrator prompt for WP7

Integrate `teams` `WP7` — **Debug-backed mock runtime** into the `agent/integration`
branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any shared debug-menu, reset/time-travel, or test-bridge merge-order notes for
  YBC
