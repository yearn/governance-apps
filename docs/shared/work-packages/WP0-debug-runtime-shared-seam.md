# WP0 — Debug runtime shared seam

## Objective

Own the shared debug-panel and E2E bridge seam for `M2A` so Teams and YBC runtime work
can proceed in parallel without colliding on `components/DebugControls.tsx` or
`lib/test-bridge.ts`.

## Scope

- freeze the shared `DebugControls` shell behavior for `M2A`
- preserve the current panel layout:
  - time travel controls at the top
  - app-specific sections in the middle
  - `Reset App` footer action at the bottom
- extend the shared debug runtime so mature mock-backed domains can plug in
  reset/time-travel behavior without redefining the shell
- own the shared `window.__TEST__` contract for Teams and YBC domain-prefixed granular
  setters
- establish the initial YBC root invalidation seam consumed by the shared debug runtime
- update shared docs so downstream packages consume this seam instead of redefining it

## Non-goals

- implementing Teams domain state coverage
- implementing YBC domain state coverage
- redesigning the shared debug panel UX beyond what is required to support the new seam

## Dependencies

- none

## Suggested files

- `components/DebugControls.tsx`
- `lib/test-bridge.ts`
- `docs/shared/debug-runtime-contract.md`
- `docs/shared/mock-toggles.md`
- `docs/shared/testing.md`
- `lib/hooks/useYbc.ts`

## Acceptance criteria

- `shared / M2A / WP0` is the documented and implemented owner of
  `components/DebugControls.tsx` and `lib/test-bridge.ts` for this milestone
- the shared debug shell layout matches the current product shell unless this package
  explicitly changes both the contract and implementation together
- the shared seam exposes the extension points required for Teams and YBC to add
  app-specific controls, reset hooks, time-travel hooks, and bridge methods without
  redefining the shell contract
- the YBC root invalidation seam required by `DebugControls` and the test bridge is
  established here before `ybc / WP6` consumes it
- shared docs point Teams and YBC runtime packages at this package for seam ownership
  and merge order

## UAT checkpoint

No direct UAT. This package is a prerequisite for `teams / WP7` and `ybc / WP6`.

## Prompts


### Implementer prompt for WP0

You are implementing `shared` `WP0` — **Debug runtime shared seam**.

Objective:
Own the shared debug-panel and E2E bridge seam for `M2A` so Teams and YBC runtime work
can proceed in parallel without colliding on `components/DebugControls.tsx` or
`lib/test-bridge.ts`.

Scope:
- freeze the shared `DebugControls` shell behavior for `M2A`
- preserve the current panel layout with time travel at the top, app-specific sections
  in the middle, and `Reset App` in the footer unless this package intentionally
  changes both the contract and shell together
- extend the shared debug runtime so mature mock-backed domains can plug in
  reset/time-travel behavior without redefining the shell
- own the shared `window.__TEST__` contract for Teams and YBC domain-prefixed granular
  setters
- establish the initial YBC root invalidation seam consumed by the shared debug runtime
- update shared docs so downstream packages consume this seam instead of redefining it

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not implement full Teams or YBC domain state coverage here
- do not jump ahead into later milestones
- update docs and tests if behavior changes

Definition of done:
- shared seam ownership is explicit in code and docs
- the shared shell layout matches the contract
- Teams and YBC runtime packages have a stable shared seam to consume
- the initial YBC invalidation seam is defined here rather than left ambiguous


### Reviewer prompt for WP0

Review this PR only against `shared` `WP0` — **Debug runtime shared seam**.

Check:
- scope matches the package and does not absorb Teams or YBC runtime implementation
- shared seam ownership is explicit
- the shell layout contract matches the implementation
- Teams and YBC have a stable extension seam for reset/time-travel and test-bridge work
- docs are updated

Block if:
- ownership of `components/DebugControls.tsx` or `lib/test-bridge.ts` remains ambiguous
- the package hard-codes domain seams that do not exist without defining them here
- the shell contract and implementation diverge


### Integrator prompt for WP0

Integrate `shared` `WP0` — **Debug runtime shared seam** into the `agent/integration`
branch before `teams / WP7` or `ybc / WP6`.

During integration:
- keep the merge focused on the shared seam
- record any contract changes that the Teams or YBC runtime packages must consume
