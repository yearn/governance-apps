# Debug Runtime Contract

Purpose: freeze the shared debug-panel and E2E bridge contract for mature mock-backed
routes so parallel work packages do not invent incompatible seams.

Ownership for `M2A`:

- `shared / WP0` owns `components/DebugControls.tsx` and `lib/test-bridge.ts`
- `teams / WP7` and `ybc / WP6` consume that seam instead of redefining it

Applies to:

- `components/DebugControls.tsx`
- `lib/test-bridge.ts`
- route-specific `MockControls.tsx` implementations
- mutable mock stores for `teams` and `ybc`

## Core rules

- default route chrome stays production-like
- route-local scenario switchers are not the primary QA path
- debug actions mutate live route state in place
- named presets are optional convenience bootstraps only
- `Reset App` and time travel must include every participating mock-backed domain

## Shared debug panel shape

- `DebugControls` remains the shared shell
- time travel controls stay at the top
- app-specific controls mount inside the shared shell as route/domain sections
- `Reset App` stays in the footer below app-specific sections
- Teams and YBC should each expose their own `MockControls` section instead of adding
  route-local hero cards or scenario bars
- the shell must stay viewport-bounded, scrollable, and readable on small screens
- long domain control sets should use collapsible groups or equivalent progressive
  disclosure inside the shared shell
- changing that top/middle/footer structure is shared-shell work owned by `shared / WP0`

### Current `M2A` seam

- `components/DebugControls.tsx` exposes `DebugControlsSection` entries for domain-owned
  middle-panel sections
- each section may provide:
  - `queryKeys` to invalidate on shared time travel
  - `onTimeTravel(days)` for domain-local clock sync; shared invalidation waits for
    these hooks to settle before refetching query roots
  - `onReset()` for store reset and persistence cleanup
- shared time travel invalidates `styfi`, `veyfi`, `yeth`, `teamsKeys.all`, and
  `ybcKeys.all`
- the initial YBC root invalidation seam is `ybcKeys.all` from `lib/hooks/useYbc.ts`
- the Teams section is expected to cover preset bootstrapping, viewer/admin access,
  loading/empty coverage, workspace selection, current period, lifecycle/read-only,
  revenue, funding, and bonus state mutation without adding route-local QA chrome

## Time travel and reset requirements

When a new mature mock-backed domain joins the debug runtime:

- time travel must invalidate that domain's query keys
- time travel must update the domain's derived state coherently against shared mock time
- `Reset App` must reset that domain's mock store
- `Reset App` must clear any persisted state for that domain in the same way as the
  existing mock-backed apps

For Teams and YBC specifically:

- `DebugControls` must invalidate the Teams root query key entry point
  (`teamsKeys.all` at the time this contract was written)
- `shared / WP0` must establish the YBC root invalidation seam consumed by
  `DebugControls` and the test bridge before `ybc / WP6` depends on it
- `Reset App` must reset the Teams and YBC mock stores alongside Styfi, veYFI, and yETH

## E2E bridge rules

- prefer domain-prefixed granular setters
- prefer patch/mutate-in-place helpers over scenario-only loading
- keep methods async and invalidate queries after mutation
- route-level scenarios may still exist as hidden bootstraps, but they are not the
  primary bridge interface for mature routes

### Current `M2A` bridge seam

- `lib/test-bridge.ts` defines `TeamsTestBridgeAdapter` and `YbcTestBridgeAdapter`
- `components/TestBridgeListener.tsx` accepts optional `teams` and `ybc` adapters and
  passes them into `createTestBridge`
- shared `reset()` clears fixed mock time before it fans out to `resetTeams()` /
  `resetYbc()`, so adapters that snapshot `nowSeconds()` rebuild from cleared time
- shared `setNow(timestamp)` fans out to adapter `onSetNow(timestamp)` hooks before
  invalidating queries
- domain-prefixed adapter methods invalidate `teamsKeys.all` or `ybcKeys.all`
  automatically after mutation, so downstream packages should attach behavior through
  the adapter rather than replacing the bridge

## Recommended naming pattern

Teams examples:

- `setTeamsViewerRole`
- `setTeamsSelectedTeam`
- `setTeamsLoading`
- `setTeamsEmpty`
- `setTeamsCurrentPeriod`
- `patchTeamsTeam`
- `patchTeamsFundingApproval`
- `patchTeamsBonus`
- `patchTeamsAdmin`
- `resetTeams`

YBC examples:

- `setYbcPerspective`
- `setYbcLoading`
- `setYbcEmptyRoster`
- `setYbcEmptyBoard`
- `setYbcEpoch`
- `patchYbcMember`
- `patchYbcProposal`
- `patchYbcRewards`
- `patchYbcAdmin`
- `resetYbc`

Exact names may evolve, but the contract intent should remain:

- domain-prefixed
- granular
- mutable
- production-like route flow

## Package ownership guidance

For `M2A`:

- `shared / WP0` owns the shared seam edits in `DebugControls` and `lib/test-bridge.ts`
- `teams / WP7` and `ybc / WP6` should treat that seam as an input dependency, not a
  place to redesign the shared shell
- any expansion of the shared seam should preserve the naming and mutation model above
- merge order remains: land `shared / WP0` first, then let `teams / WP7` and
  `ybc / WP6` plug their runtime adapters into the established seam
