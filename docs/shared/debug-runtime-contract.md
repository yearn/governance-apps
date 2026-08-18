# Debug Runtime Contract

Purpose: define the shared debug-panel and E2E bridge contract for mature
mock-backed routes so app packages do not invent incompatible seams.

Applies to:

- `components/DebugControls.tsx`
- `lib/test-bridge.ts`
- route-specific `MockControls.tsx` implementations
- mutable mock stores for each participating domain

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
- each domain exposes its own `MockControls` section instead of adding route-local
  hero cards or scenario bars
- the shell must stay viewport-bounded, scrollable, and readable on small screens
- long domain control sets should use collapsible groups or equivalent progressive
  disclosure inside the shared shell
- changing that top/middle/footer structure requires a separate shared-shell work
  package

### Current shared seam

- `components/DebugControls.tsx` exposes `DebugControlsSection` entries for domain-owned
  middle-panel sections
- each section may provide:
  - `queryKeys` to invalidate on shared time travel
  - `onTimeTravel(days)` for domain-local clock sync; shared invalidation waits for
    these hooks to settle before refetching query roots
  - `onReset()` for store reset and persistence cleanup
- shared time travel invalidates every participating domain root;
- existing root examples include `teamsKeys.all` and `ybcKeys.all`;
- new domains must add reset, time, query invalidation, and typed bridge support in
  the same package as their debug runtime.

## Time travel and reset requirements

When a new mature mock-backed domain joins the debug runtime:

- time travel must invalidate that domain's query keys
- time travel must update the domain's derived state coherently against shared mock time
- `Reset App` must reset that domain's mock store
- `Reset App` must clear any persisted state for that domain in the same way as the
  existing mock-backed apps

Existing domains must continue to reset alongside any new domain. Adding DAO, for
example, must not break Teams or YBC invalidation.

## E2E bridge rules

- prefer domain-prefixed granular setters
- prefer patch/mutate-in-place helpers over scenario-only loading
- keep methods async and invalidate queries after mutation
- route-level scenarios may still exist as hidden bootstraps, but they are not the
  primary bridge interface for mature routes

### Current bridge seam

- `lib/test-bridge.ts` defines `TeamsTestBridgeAdapter`, `YbcTestBridgeAdapter`,
  and `DaoTestBridgeAdapter`
- `components/TestBridgeListener.tsx` accepts optional `teams`, `ybc`, and `dao`
  adapters and passes them into `createTestBridge`
- shared `reset()` clears fixed mock time before it fans out to `resetTeams()`,
  `resetYbc()`, and `resetDao()`, so adapters that snapshot `nowSeconds()` rebuild
  from cleared time
- shared `setNow(timestamp)` fans out to adapter `onSetNow(timestamp)` hooks before
  invalidating queries
- domain-prefixed adapter methods invalidate `teamsKeys.all`, `ybcKeys.all`, or
  `daoKeys.all`
  automatically after mutation, so downstream packages should attach behavior through
  the adapter rather than replacing the bridge
- the floating shell's full reset clears stYFI, veYFI, yETH, Teams, YBC, and DAO
  stores regardless of which route currently mounts the shell

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

DAO examples:

- `setDaoFixture`
- `setDaoSelectedProposal`
- `setDaoPersona`
- `setDaoRole`
- `setDaoContentState`
- `setDaoLifecycle`
- `setDaoVetoState`
- `setDaoAnalysisState`
- `setDaoAccountState`
- `setDaoExecutionState`
- `setDaoAuthoringState`
- `setDaoProposalVotes`
- `setDaoProposalTiming`
- `resetDao`

Exact names may evolve, but the contract intent should remain:

- domain-prefixed
- granular
- mutable
- production-like route flow

## Package ownership guidance

The package adding a new mock-heavy domain owns its adapter and the smallest
shared-seam extension needed to register it. It must preserve the shell, naming,
reset, and mutation model above. Broader debug-shell redesign belongs in a
separate shared package.
