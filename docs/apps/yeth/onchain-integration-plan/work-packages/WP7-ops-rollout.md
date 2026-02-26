# WP7 — Ops, Feature Flag, and Production Rollout

## Objective
Ship yETH onchain support safely, starting with fork validation and preprod.

## Scope
- Confirm feature gating:
  - production requires `NEXT_PUBLIC_ENABLE_YETH=true`
- Verify `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL` configured for deployment environment
- Verify `NEXT_PUBLIC_RPC_URLS` configured for onchain account reads/writes
- Add a short rollback plan:
  - disable `NEXT_PUBLIC_ENABLE_YETH`
  - or temporarily route yETH back to mock mode for emergency UI stability

## Dependencies
- WP4/WP5 completed

## Acceptance Criteria
- Preprod deploy can render yETH global state without wallet connection.
- Production deploy is gated until explicitly enabled.
