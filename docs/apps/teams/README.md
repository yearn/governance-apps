# Team Finances

App name / slug: `teams`
Route key: `/teams`
Beta host: `teams-beta.dao-ops.com`
Production host: `teams.yearn.fi` (gated until feed-backed reads, launch writes, fork
smoke, and production approval)
Display label: `Team Finances`

## Product summary


A team-centric finance and operations workspace for registered protocol teams.

This surface is broader than accounting alone. It covers:

- team directory and lifecycle
- current-period and lifetime reporting
- permissionless revenue deposits
- owner-led funding claims
- funding returns
- bonus visibility and claims
- operator/admin controls for the accounting system


## Naming stance

- Keep the **app key / slug** short and stable: `teams`
- Keep the **route key** path-scoped and stable: `/teams`
- Use the richer **display label** in product copy and headers: `Team Finances`

This keeps routing, hostnames, branch names, and domain client keys durable even if the
surface grows.

## Route shell baseline

The default `/teams` landing state is the team directory. It introduces the app through
the `Team Finances` label and gives users a scannable path into a selected team
workspace. The directory defaults to visual team cards and keeps the dense audit table
available through a view toggle.

The current accepted route keeps production-facing copy on the default shell and covers:

- a top-level `Directory` tab for comparing teams
- a top-level `Workspace` tab for one selected team
- a flattened selected-team command center with `Overview`, `Revenue`, `Funding`,
  `Bonus`, and `Lifecycle` sections as stable scroll targets
- a top-level `Admin` tab only when the viewer has operator/admin access

Loading, empty, and operator/admin coverage now seed through the floating debug panel
and the shared E2E bridge instead of visible route-local controls. The bonus surface
keeps the main card action-oriented by showing claimable YFI first and moving profit
and pricing inputs into period detail and tooltip states. Bonus and
ownership/lifecycle anchors remain stable across selected, loading, empty, and no-team
workspace states so the route shell stays linkable.

## Debug runtime alignment

Teams now follows the same debug-backed model used by `/styfi`, `/veyfi`, and `/yeth`.
The default route keeps production-like copy, while review-state bootstrapping and
granular runtime setters live in the floating debug panel and the shared E2E bridge.
Shared `DebugControls` time travel and bridge-driven `setNow()` mutations now resolve
against the same Teams clock, so current-period changes stay consistent after resets
and preset bootstraps. Shared bridge resets also clear fixed mock time before the
Teams runtime rebuilds, so a later `setNow()` call cannot inherit a stale anchor from
the previous mocked timestamp.

Named presets remain available as convenience bootstraps, but the runtime mutates in
place for viewer role, workspace selection, loading/empty coverage, current period,
lifecycle, read-only access, revenue, funding, bonus, and admin visibility changes.

The approved top-level shell tabs are:

1. Directory
2. Workspace
3. Admin, shown only for operator/admin contexts

The workspace tab renders the deeper operational sections on one page so deep links
such as `#revenue`, `#funding`, `#bonus`, and `#lifecycle` scroll directly to their
audit and action areas.

## Live data path

The production Teams route consumes a dedicated `teams.json` feed from `gov-apps-stats`,
configured by `NEXT_PUBLIC_TEAMS_DATA_URL`. The feed owns historical team, revenue,
funding, bonus, and accounting state. The frontend owns presentation and wallet-specific
overlays.

Feed-backed reads are wired for the non-mock runtime through a same-origin
`/api/teams-data` proxy, a typed v1 schema, and a mapper into the accepted Teams page
data contract. Launch writes are intentionally still disabled in feed mode until the
write package and fork-smoke runbook validate the shared transaction flow. Local/debug
runs keep the mock store and floating debug controls.

The feed-level `team.availableActions` block is compatibility-only. Production write
CTA availability must be derived in the frontend from raw feed facts, connected wallet
state, current chain, and simulation.

The route remains path-first on shared hosts. `teams-beta.dao-ops.com` is the beta
review target. `teams.yearn.fi` is reserved for production and must remain gated until
the feed-backed read model, launch writes, fork smoke, preprod smoke, and production
approval are complete.

## Included docs

- `docs/apps/teams/ui-spec.md`
- `docs/apps/teams/user-stories.md`
- `docs/apps/teams/mock-data-schema-v1.md`
- `docs/apps/teams/examples/mock-data.example.json`
- `docs/apps/teams/onchain-integration-plan/README.md`
- `docs/apps/teams/onchain-integration-plan/teams-feed-schema-v1.md`
- `docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json`
