# WP8 — Production-parity UI and debug controls

## Objective

Finish the Teams mock-runtime alignment so the default route mimics production while
all mock-only controls live behind the floating debug panel.

## Scope

- remove mock / prototype wording from default Teams route copy where it does not
  describe rollout gating
- move any remaining state toggles, presets, and prototype controls into the floating
  debug panel
- keep admin visibility, loading / empty coverage, and read-only states reachable
  through debug controls without leaking debug language into the default route
- update docs, smoke coverage, and reviewer guidance for the debug-backed model

## Non-goals

- onchain reads or writes
- hiding beta-host or production-gate rollout language

## Dependencies

- `shared / WP0`
- WP7

## Suggested files

- `app/teams/messages.ts`
- `app/teams/components/MockControls.tsx`
- `docs/shared/debug-runtime-contract.md`
- `tests/components/TeamsPageClient.test.tsx`
- `tests/e2e/smoke/teams-shell.spec.ts`
- `docs/apps/teams/README.md`
- `docs/apps/teams/ui-spec.md`
- `docs/shared/mock-toggles.md`

## Acceptance criteria

- the default Teams route reads like intended production UI rather than a prototype
- the floating debug panel hosts all Teams mock controls needed for QA and design review
- route navigation and admin visibility behave normally without visible mock scaffolding
- docs and tests no longer instruct users or test authors to rely on route-local
  scenario controls

## UAT checkpoint

UAT-T5A: Teams production-parity surface and debug controls accepted.

## Prompts


### Implementer prompt for WP8

You are implementing `teams` `WP8` — **Production-parity UI and debug controls**.

Objective:
Finish the Teams mock-runtime alignment so the default route mimics production while
all mock-only controls live behind the floating debug panel.

Scope:
- remove mock / prototype wording from default Teams route copy where it does not
  describe rollout gating
- move any remaining state toggles, presets, and prototype controls into the floating
  debug panel
- keep admin visibility, loading / empty coverage, and read-only states reachable
  through debug controls without leaking debug language into the default route
- update docs, smoke coverage, and reviewer guidance for the debug-backed model

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- depend on `shared / WP0` and follow `docs/shared/debug-runtime-contract.md` for
  placement and behavior of Teams debug controls
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- the default Teams route reads like intended production UI rather than a prototype
- the floating debug panel hosts all Teams mock controls needed for QA and design review
- route navigation and admin visibility behave normally without visible mock scaffolding
- docs and tests no longer instruct users or test authors to rely on route-local
  scenario controls



### Reviewer prompt for WP8

Review this PR only against `teams` `WP8` — **Production-parity UI and debug controls**.

Check:
- scope matches the package and does not bleed into later WPs
- acceptance criteria are fully met
- copy and control placement are coherent
- docs are updated
- tests reflect behavior changes

Block if:
- default route copy still advertises mock/prototype state where production wording is
  intended
- critical Teams QA controls remain on the page instead of in the debug panel
- shared repo patterns are ignored without justification



### Integrator prompt for WP8

Integrate `teams` `WP8` — **Production-parity UI and debug controls** into the
`agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any shared debug-menu or test-bridge merge-order notes for YBC
