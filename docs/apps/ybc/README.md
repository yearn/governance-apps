# Yearn Builder's Collective

App name / slug: `ybc`
Route key: `/ybc`
Beta host: `ybc-beta.dao-ops.com`
Production host: `ybc.yearn.fi` (gated until fork smoke, preprod smoke, and
production approval)
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

The shared-host route is `/ybc`. The accepted shell keeps the overview visible first,
then renders the governance command-center sections on one page. When discussion,
voting, or awaiting-execution proposals exist, the proposal feed appears above the
roster so actionable governance work is not buried.

Default structure:

1. Overview summary
2. Priority proposal feed when proposals are actionable
3. Visual member roster, with audit table available through a view toggle
4. Rewards handoff
5. Operator panel, shown only for operator/admin perspectives

## Live data path

The production YBC route consumes a dedicated `ybc.json` feed from `gov-apps-stats`,
configured by `NEXT_PUBLIC_YBC_DATA_URL`. The feed owns historical member, proposal,
vote, weight, and reward display state. The frontend owns presentation and
wallet-specific overlays.

Feed-backed reads are wired for the non-mock runtime through a same-origin
`/api/ybc-data` proxy, a typed v1 schema, and a mapper into the accepted YBC page data
contract. Launch-scope proposal writes are wired in feed mode through the shared
transaction pipeline for propose addition, propose expulsion, retract, vote yea/nay,
and execute. Feed rendering stays authoritative after writes; the frontend invalidates
the feed and wallet overlay, but does not fabricate proposal rows or vote totals before
`gov-apps-stats` publishes the next indexed snapshot. Local/debug runs keep the mock
store and floating debug controls.

Wallet-specific action eligibility is derived client side from the feed plus a live
wallet overlay when RPC is available: membership, operator status, live weight,
proposal status, and whether the connected wallet has already voted. The feed remains
safe to render without the overlay, but write CTAs are conservative when the connected
wallet, chain, phase, or proposal history does not support the action.

The beta host is `ybc-beta.dao-ops.com`. The production host is `ybc.yearn.fi`, but
production exposure remains gated until fork smoke, preprod smoke, and explicit
production approval are complete.

## Debug runtime alignment

The current mock-backed route integrates the accepted WP2, WP3, WP4, WP5, WP6, and
WP7 runtime work:

- the overview stays visible while members, proposals, rewards, and operator tooling
  render as stable command-center sections
- the default `/ybc` surface keeps production-like copy and navigation while QA-only
  state seeding lives in the floating debug panel and the shared E2E bridge
- the hero separates internal member influence from delegated public influence
- unknown connected non-member wallets remain on the observer path
- the default `/ybc` runtime reseeds from the active wallet on connect, disconnect,
  and account changes unless an explicit debug preset is applied
- observer and member perspectives render distinct weight summaries
- the visual member roster and audit table keep raw stake, effective weight, target
  weight, and maturity separate
- loading and empty roster states are implemented for the overview state machine
- the proposal board shows explicit phases, UTC timeline rows, and threshold targets
- proposal propose, retract, vote, and execute interactions remain available on the
  route without mock-specific badge copy
- empty-board, empty-roster, loading, and operator coverage now seed through the shared
  debug panel instead of visible route-local controls
- terminal proposal debug setters keep executed, expired, failed, and retracted history
  actionless so the route never implies those states can be revived
- the rewards section shows YBC-attributed rewards while routing claims to the shared reward surface
- observer, empty, member, and operator perspectives keep the reward handoff visible without implying a separate YBC claim stack
- the operator/admin perspective now exposes a scoped operator panel for add/remove
  member affordances, operator visibility, hook visibility, threshold visibility, and
  reward sync status
- the operator access debug toggle mutates the viewer's operator membership rather than
  relying on display-only booleans, so access can be turned on and off consistently
- the floating debug panel mutates a shared YBC mock store in place and the E2E bridge
  exposes domain-prefixed setters for YBC state seeding without visible debug clicking

## Included docs

- `docs/apps/ybc/ui-spec.md`
- `docs/apps/ybc/user-stories.md`
- `docs/apps/ybc/mock-data-schema-v1.md`
- `docs/apps/ybc/examples/mock-data.example.json`
- `docs/apps/ybc/onchain-integration-plan/README.md`
- `docs/apps/ybc/onchain-integration-plan/ybc-feed-schema-v1.md`
- `docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json`
