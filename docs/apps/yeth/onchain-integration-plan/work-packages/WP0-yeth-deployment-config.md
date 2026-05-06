# WP0 — yETH Configuration Baseline (deployment + global feed contract)

## Objective
Establish yETH-specific configuration boundaries:
- deployment addresses in repo (`lib/clients/yeth/deployment.json`)
- a separate yETH global R2/static JSON feed contract (`yeth-global.json`) with a versioned schema

## Scope
- Add `lib/clients/yeth/deployment.json` with the provided content.
- Add a tiny typed helper (optional) to avoid repeated casting.
- Define yETH global feed schema + env key:
  - `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL`
  - versioned payload contract for external producer (v1)
- Add yETH global-data fetch plumbing (or document exact implementation plan if done in WP2).

## Deliverables
- `lib/clients/yeth/deployment.json`
- (Optional) `lib/clients/yeth/deployment.ts` exporting:
  - `YETH_CLAIM`, `YETH_YIELD_VAULT`, `YETH_RECOVERY_VAULT` as `Address`
- yETH global schema contract document (v1), e.g.:
  - `docs/apps/yeth/onchain-integration-plan/yeth-global-data-schema-v1.md`
- `lib/schemas/yeth-global.ts` (recommended)
- `lib/clients/yeth/global.ts` or equivalent fetcher (recommended)
- direct fetch from `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL`

## Dependencies
None.

## Acceptance Criteria
- Build passes.
- `OnchainYethClient` can import the deployment config without touching `lib/deployment.json`.
- No yETH keys are added to `lib/constants.ts` unless explicitly desired.
- yETH global feed schema is versioned and agreed with external data producer.
- yETH global feed can be fetched independently of stYFI/veYFI shared global data.
