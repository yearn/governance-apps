# Debug Runtime Contract

Purpose: freeze the shared debug-panel and E2E bridge contract for mature mock-backed
routes so parallel work packages do not invent incompatible seams.

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
- global controls stay at the top:
  - time travel
  - reset app
- app-specific controls mount inside the shared shell as route/domain sections
- Teams and YBC should each expose their own `MockControls` section instead of adding
  route-local hero cards or scenario bars

## Time travel and reset requirements

When a new mature mock-backed domain joins the debug runtime:

- time travel must invalidate that domain's query keys
- time travel must update the domain's derived state coherently against shared mock time
- `Reset App` must reset that domain's mock store
- `Reset App` must clear any persisted state for that domain in the same way as the
  existing mock-backed apps

For Teams and YBC specifically:

- `DebugControls` must invalidate `teamsKeys.all` and `ybcKeys.all`
- `Reset App` must reset the Teams and YBC mock stores alongside Styfi, veYFI, and yETH

## E2E bridge rules

- prefer domain-prefixed granular setters
- prefer patch/mutate-in-place helpers over scenario-only loading
- keep methods async and invalidate queries after mutation
- route-level scenarios may still exist as hidden bootstraps, but they are not the
  primary bridge interface for mature routes

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

When two runtime packages run in parallel:

- one package should own the shared seam edits in `DebugControls` and `lib/test-bridge.ts`
- the other package should implement against the agreed contract instead of redefining it
- any expansion of the shared seam should preserve the naming and mutation model above
