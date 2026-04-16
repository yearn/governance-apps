# Yearn Builder's Collective

App name / slug: `ybc`
Route key: `/ybc`
Beta host: `ybc-beta.dao-ops.com`
Production host: `ybc.yearn.fi` (gated until live contract wiring and production approval)
Recommended display label: `Yearn Builder's Collective`

## Product summary

A governance and membership workspace for the Yearn Builder's Collective.

This surface is broader than a simple vote page. It covers:

- collective overview and governance influence
- member roster and weight maturity
- proposal lifecycle
- thresholds and voting status
- execution timing
- reward visibility
- operator/admin controls for membership governance

## Naming stance

- Keep the **app slug** short and stable: `ybc`
- Keep the **route key** explicit and stable: `/ybc`
- Use the richer **display label** in product copy and headers: `Yearn Builder's Collective`

This keeps routing, hostnames, branch names, and domain client keys durable even if the
surface grows.

## Route shell baseline

The shared-host route is `/ybc`. The first accepted shell lands on the Overview section
and maps the top-level product sections in this order:

1. Overview
2. Members
3. Proposals
4. Rewards
5. Admin (conditional)

The beta host is `ybc-beta.dao-ops.com`. The production host is `ybc.yearn.fi`, but
production exposure remains gated until live contract wiring and explicit production
approval are complete.

## Current prototype state

The current mock-backed route integrates the accepted WP2 and WP3 prototypes:

- the five-section YBC shell map remains live on the route
- the hero separates internal member influence from delegated public influence
- unknown connected non-member wallets remain on the observer path
- observer and member perspectives render distinct weight summaries
- the members table keeps raw stake, effective weight, target weight, and maturity separate
- loading and empty roster states are implemented for the overview state machine
- the proposal board shows explicit phases, UTC timeline rows, and threshold targets
- mock propose, retract, vote, and execute interactions are available
- an explicit empty-board perspective covers the no-proposal state
- expired proposals remain visible as terminal history

Reward handoff and operator controls remain visible as mapped shell sections until
later work packages implement their interactive depth.

## Included docs

- `docs/apps/ybc/ui-spec.md`
- `docs/apps/ybc/user-stories.md`
- `docs/apps/ybc/mock-data-schema-v1.md`
- `docs/apps/ybc/examples/mock-data.example.json`
- `docs/apps/ybc/onchain-integration-plan/README.md`
