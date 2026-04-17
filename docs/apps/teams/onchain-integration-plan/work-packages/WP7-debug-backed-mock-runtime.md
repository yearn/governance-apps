# WP7 — Debug-backed mock runtime

## Objective

Move Teams off route-local scenario switching and onto a mutable mock runtime that is
seeded and controlled through the shared debug panel and E2E bridge.

## Scope

- replace route-local scenario orchestration with a shared Teams mock store
- seed the store from named presets while keeping the default route production-shaped
- expose app-specific debug controls for persona, active team, surface mode, and key
  revenue / funding / bonus / admin seeds
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
- app-specific debug controls can seed at minimum:
  - viewer persona
  - active team / no-team directory state
  - loading and empty coverage
  - revenue-ready, funding-ready, bonus-ready, retired/read-only, and operator/admin
    seeds
- the E2E bridge exposes Teams state seeding APIs so browser tests avoid visible debug
  clicking and route-local state controls

## UAT checkpoint

UAT-T5A can begin once the debug-backed Teams runtime replaces the route-local
prototype controls.

## Prompts


### Implementer prompt for WP7

You are implementing `teams` `WP7` — **Debug-backed mock runtime**.

Objective:
Move Teams off route-local scenario switching and onto a mutable mock runtime that is
seeded and controlled through the shared debug panel and E2E bridge.

Scope:
- replace route-local scenario orchestration with a shared Teams mock store
- seed the store from named presets while keeping the default route production-shaped
- expose app-specific debug controls for persona, active team, surface mode, and key
  revenue / funding / bonus / admin seeds
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
- app-specific debug controls can seed the previously accepted Teams review states
- the E2E bridge exposes Teams state seeding APIs



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
- critical Teams review states cannot be reached through debug or test APIs
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
- record any shared debug-menu or test-bridge merge-order notes for YBC
