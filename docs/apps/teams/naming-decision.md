# Team Finances Naming Decision

## Recommendation

Use:

- app name / slug: `teams`
- route key: `teams`
- shared-host path: `/teams`
- beta host: `teams-beta.dao-ops.com`
- production host: `teams.yearn.fi` (gated until live contract wiring and production approval)
- display label: `Team Finances`

## Why not rename the app key

The contracts and user mental model are centered on **teams** as durable objects:
teams have owners, revenue, funding approvals, bonus history, retirement state, and migration state.

A narrower key like `accounting`, `budget`, or `pnl` would age poorly as the surface expands.

## Practical benefit

Keeping the short route key:
- keeps URLs clean
- keeps branch and worktree names clean
- keeps future domain client names clean
- leaves room for richer display labels in product copy
