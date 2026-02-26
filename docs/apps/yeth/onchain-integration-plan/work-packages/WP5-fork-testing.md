# WP5 — Fork Testing & Seed Utilities

## Objective
Provide a repeatable mainnet fork test harness for yETH.

## Scope

### 1) Documented runbook
- Ensure `docs/apps/yeth/onchain-integration-plan/fork-runbook.md` is accurate.
- Include exact env vars used for fork testing.
  - include `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL` for disconnected global rendering.

### 2) Optional: Seed script
Add a small script under `scripts/` (repo-local) to:
- impersonate Claim.management()
- call `set_claimable([address], [amount])`
- optionally set `deadline`

This avoids manual console/cast steps.

### 3) Test checklist
Add a short checklist to confirm:
- global loads
- claim works (exit)
- claim works (stay)
- redeem works

## Dependencies
- WP2/WP3/WP4

## Acceptance Criteria
- A new developer can follow the runbook and reproduce the flows in < 10 minutes.
- No snapshots or log queries are required for the fork test.
