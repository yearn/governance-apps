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

## Current prototype status

The current mock-backed route keeps the shell structure from WP0 and now includes a
proposal board prototype with:

- explicit proposal phases and UTC timeline rows
- visible addition and expulsion threshold targets
- mock propose / retract / vote / execute interactions
- an explicit empty-board perspective for no-proposal state coverage
- terminal expired proposals that stay visible but cannot be revived

## Included docs

- `docs/apps/ybc/ui-spec.md`
- `docs/apps/ybc/user-stories.md`
- `docs/apps/ybc/mock-data-schema-v1.md`
- `docs/apps/ybc/examples/mock-data.example.json`
- `docs/apps/ybc/onchain-integration-plan/README.md`
