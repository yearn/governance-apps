# WP0 — yETH Deployment Config (separate file)

## Objective
Add a **yETH-specific** deployment config file in the codebase so contract addresses
can be updated independently of the main `lib/deployment.json`.

## Scope
- Add `lib/clients/yeth/deployment.json` with the provided content.
- Add a tiny typed helper (optional) to avoid repeated casting.

## Deliverables
- `lib/clients/yeth/deployment.json`
- (Optional) `lib/clients/yeth/deployment.ts` exporting:
  - `YETH_CLAIM`, `YETH_YIELD_VAULT`, `YETH_RECOVERY_VAULT` as `Address`

## Dependencies
None.

## Acceptance Criteria
- Build passes.
- `OnchainYethClient` can import the deployment config without touching `lib/deployment.json`.
- No yETH keys are added to `lib/constants.ts` unless explicitly desired.

