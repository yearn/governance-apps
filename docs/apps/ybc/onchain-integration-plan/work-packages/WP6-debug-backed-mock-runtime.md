# WP6 — Debug-backed mock runtime

## Objective

Move YBC off route-local scenario switching and onto a mutable mock runtime that is
seeded and controlled through the shared debug panel and E2E bridge.

## Scope

- replace route-local scenario orchestration with a shared YBC mock store
- seed the store from named presets while keeping the default route production-shaped
- expose app-specific debug controls for persona, epoch/time, surface mode, proposal
  board seeds, rewards seeds, and operator visibility
- extend the test bridge so E2E and manual QA can reach YBC states without clicking
  visible prototype controls

## Non-goals

- onchain reads or writes
- new product scope beyond the accepted YBC MVP
- a generic arbitrary-call governance editor

## Dependencies

- WP1
- WP2
- WP3
- WP4
- WP5

## Suggested files

- `app/ybc/YbcPageClient.tsx`
- `app/ybc/components/MockControls.tsx`
- `lib/clients/ybc/mock.ts`
- `lib/hooks/useYbc.ts`
- `lib/test-bridge.ts`
- `tests/components/YbcPageClient.test.tsx`
- `tests/e2e/*ybc*`

## Acceptance criteria

- the default `/ybc` route no longer depends on a visible scenario chooser to reach
  accepted UX flows
- the YBC mock runtime is mutable and shared across the route instead of swapping
  whole scenario payloads in and out
- app-specific debug controls can seed at minimum:
  - observer, member, and operator perspectives
  - loading, empty-roster, and empty-board coverage
  - ramping vs matured weight seeds
  - proposal lifecycle, threshold, rewards, and operator visibility seeds
- propose, retract, vote, and execute mock interactions run against the shared YBC
  store
- the E2E bridge exposes YBC state seeding APIs so browser tests avoid visible debug
  clicking and route-local scenario controls

## UAT checkpoint

UAT-Y6A can begin once the debug-backed YBC runtime replaces the route-local
prototype controls.

## Prompts


### Implementer prompt for WP6

You are implementing `ybc` `WP6` — **Debug-backed mock runtime**.

Objective:
Move YBC off route-local scenario switching and onto a mutable mock runtime that is
seeded and controlled through the shared debug panel and E2E bridge.

Scope:
- replace route-local scenario orchestration with a shared YBC mock store
- seed the store from named presets while keeping the default route production-shaped
- expose app-specific debug controls for persona, epoch/time, surface mode, proposal
  board seeds, rewards seeds, and operator visibility
- extend the test bridge so E2E and manual QA can reach YBC states without clicking
  visible prototype controls

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- the default `/ybc` route no longer depends on a visible scenario chooser to reach
  accepted UX flows
- the YBC mock runtime is mutable and shared across the route instead of swapping
  whole scenario payloads in and out
- app-specific debug controls can seed the previously accepted YBC review states
- the E2E bridge exposes YBC state seeding APIs



### Reviewer prompt for WP6

Review this PR only against `ybc` `WP6` — **Debug-backed mock runtime**.

Check:
- scope matches the package and does not bleed into later WPs
- acceptance criteria are fully met
- state coverage is complete
- docs are updated
- tests reflect behavior changes

Block if:
- the implementation leaves route-local scenario chrome as the primary YBC QA path
- critical YBC review states cannot be reached through debug or test APIs
- shared repo patterns are ignored without justification



### Integrator prompt for WP6

Integrate `ybc` `WP6` — **Debug-backed mock runtime** into the `agent/integration`
branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any shared debug-menu or test-bridge merge-order notes for Teams
