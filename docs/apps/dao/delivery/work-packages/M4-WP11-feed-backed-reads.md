# M4 WP11: Feed-Backed Reads and Live Wallet Overlay

Branch: `agent/dao/m4/wp11`

## Objective

Use the validated DAO feed for global history and live contract reads for current
wallet-specific state.

## Depends on

- Accepted M3 staging validation.

## Expected ownership

- same-origin DAO feed route/proxy
- typed feed client and onchain read client
- query keys and DAO hooks
- environment validation and saved-feed E2E fixtures

## Scope

- Feed-backed proposal list/detail.
- Last-good, stale, unavailable, and incompatible feed handling.
- Live wallet network, weight, decay, voted, role, parameter, and capability
  overlays.
- Post-transaction invalidation seam.

## Non-goals

- No writes.
- No production mock fallback.
- No browser historical event scan.

## Acceptance criteria

- Disconnected users read global history without wallet RPC dependence.
- Current account capability never trusts a feed action label.
- Vetoed-but-votable remains representable from live reads.
- Feed lag after a write can coexist with authoritative live voted/role state.
- Production mode does not construct the DAO mock client.

## Validation

- Feed mapping, stale/failure, live-overlay, wrong-network, and RPC-failure tests.
- Route E2E against the saved staging feed.
- Standard repository checks.

## Review

Frontend data reviewer and contract-read auditor. Integrate before WP12.
