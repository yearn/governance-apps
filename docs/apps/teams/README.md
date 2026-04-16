# Team Finances

App name / slug: `teams`
Route key: `/teams`
Beta host: `teams-beta.dao-ops.com`
Production host: `teams.yearn.fi` (gated until live contract wiring and production approval)
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
workspace.

The current accepted prototype covers the directory table, the overview workspace,
the bonus summary with period drilldown, and the ownership/lifecycle card.
It keeps explicit loading and empty coverage across the route so UAT can validate
state handling before revenue, funding, and admin write interactions ship.

The bonus surface keeps the main card action-oriented by showing claimable YFI first,
exposing a mock `Claim Bonus` CTA when the workspace is eligible, and moving profit
and pricing inputs into period detail and tooltip states.
Scenario switches reset any staged mock bonus action back to the target fixture so
the prototype controls stay deterministic.
The ownership/lifecycle card keeps owner, pending owner, retirement, migration, and
successor state visible without introducing ownership write actions yet.
Bonus and ownership/lifecycle anchors stay stable across selected, loading, empty,
and no-team workspace states so the route shell sections remain linkable.

The approved top-level shell sections are:

1. Team directory
2. Team workspace overview
3. Revenue
4. Funding
5. Bonus
6. Ownership & lifecycle
7. Admin, shown only for operator/admin contexts

The route remains path-first on shared hosts. `teams-beta.dao-ops.com` is the beta
review target for mock/dummy data. `teams.yearn.fi` is reserved for production and
must remain gated until live contract wiring is complete and production approval is
recorded.

## Included docs

- `docs/apps/teams/ui-spec.md`
- `docs/apps/teams/user-stories.md`
- `docs/apps/teams/mock-data-schema-v1.md`
- `docs/apps/teams/examples/mock-data.example.json`
- `docs/apps/teams/onchain-integration-plan/README.md`
