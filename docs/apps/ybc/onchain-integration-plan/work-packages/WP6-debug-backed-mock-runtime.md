# WP6 — Debug-backed mock runtime

## Objective

Move YBC off route-local scenario switching and onto a mutable mock runtime that is
mutated in place through the shared debug panel and E2E bridge.

## Scope

- replace route-local scenario orchestration with a shared YBC mock store
- allow named presets only as optional bootstraps into the shared store, not as the
  primary QA model
- expose granular app-specific debug controls that mutate live YBC state in place while
  normal route navigation stays unchanged
- support at minimum in-place setters for:
  - observer, member, and operator perspective
  - loading, empty-roster, and empty-board coverage
  - current epoch / mock time
  - roster membership, status, and weight maturity state
  - proposal creation, lifecycle phase, vote tallies, thresholds, execution readiness,
    and terminal history state
  - rewards visibility, pending rewards, and shared-claim handoff inputs
  - operator visibility, hooks visibility, and scoped admin inputs
- wire YBC into shared debug runtime behavior so `DebugControls` time travel and
  `Reset App` mutate, invalidate, and reset the YBC store correctly
- extend the test bridge so E2E and manual QA can reach YBC states without clicking
  visible prototype controls

## Non-goals

- onchain reads or writes
- new product scope beyond the accepted YBC MVP
- a generic arbitrary-call governance editor

## Dependencies

- `shared / WP0`
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
- `tests/components/YbcPageClient.test.tsx`
- `tests/e2e/*ybc*`

## Acceptance criteria

- the default `/ybc` route no longer depends on a visible scenario chooser to reach
  accepted UX flows
- the YBC mock runtime is mutable and shared across the route instead of swapping
  whole scenario payloads in and out
- route navigation stays production-like while debug actions mutate state underneath the
  current route instead of swapping the user into canned board states
- app-specific debug controls expose granular YBC setters for persona, loading/empty
  coverage, epoch/time, roster/maturity, proposal lifecycle, vote state, rewards, and
  operator/admin visibility
- any named debug presets are implemented as convenience bootstraps into the mutable
  store rather than as the primary or only QA path
- propose, retract, vote, and execute mock interactions run against the shared YBC
  store
- YBC exposes the YBC-specific reset, time-travel, invalidation, and bridge adapters
  required by `shared / WP0` instead of redefining the shared shell or bridge contract
- when consumed through the shared seam, `DebugControls` time travel invalidates YBC
  queries and updates YBC state coherently
- when consumed through the shared seam, `Reset App` resets the YBC mock store
  alongside the existing mock-backed domains
- the E2E bridge exposes YBC state seeding APIs so browser tests avoid visible debug
  clicking and route-local scenario controls, with granular setters for YBC state rather
  than scenario-only loading

## UAT checkpoint

UAT-Y6A can begin once the debug-backed YBC runtime replaces the route-local
prototype controls.

## Prompts


### Implementer prompt for WP6

You are implementing `ybc` `WP6` — **Debug-backed mock runtime**.

Objective:
Move YBC off route-local scenario switching and onto a mutable mock runtime that is
mutated in place through the shared debug panel and E2E bridge.

Scope:
- replace route-local scenario orchestration with a shared YBC mock store
- allow named presets only as optional bootstraps into the shared store, not as the
  primary QA model
- expose granular app-specific debug controls that mutate live YBC state in place while
  normal route navigation stays unchanged
- support at minimum in-place setters for persona, loading/empty, epoch/time,
  roster/maturity, proposal lifecycle and votes, rewards state, and operator/admin
  visibility inputs
- wire YBC into shared debug runtime behavior so `DebugControls` time travel and
  `Reset App` mutate, invalidate, and reset the YBC store correctly
- extend the test bridge so E2E and manual QA can reach YBC states without clicking
  visible prototype controls

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- depend on `shared / WP0` and follow `docs/shared/debug-runtime-contract.md` for the
  shared debug-panel and test-bridge seam
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- the default `/ybc` route no longer depends on a visible scenario chooser to reach
  accepted UX flows
- the YBC mock runtime is mutable and shared across the route instead of swapping
  whole scenario payloads in and out
- route navigation stays production-like while debug actions mutate state underneath the
  current route instead of swapping canned views
- app-specific debug controls expose granular YBC setters rather than only preset or
  board-mode selectors
- YBC runtime plugs into the `shared / WP0` seam so shared `DebugControls` time travel
  and `Reset App` include YBC store integration without redesigning the shared shell
- the E2E bridge exposes granular YBC state setters



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
- critical YBC review states cannot be reached through granular debug or test APIs
- debug controls still operate by swapping named canned views instead of mutating live
  route state
- `DebugControls` time travel or `Reset App` omit the YBC store
- the package redefines the shared shell or bridge contract instead of consuming
  `shared / WP0`
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
- assume `shared / WP0` landed first and record any YBC-specific adapter notes for
  later Teams comparison only
