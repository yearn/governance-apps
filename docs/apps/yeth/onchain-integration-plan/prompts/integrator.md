# Integrator Prompt — yETH Onchain MVP (Simplified)

You are integrating multiple workstreams for yETH onchain MVP into the active
integration branch (not directly into `master`).

## Integration order (recommended)
1. WP0 (deployment config file)
2. WP1 (types + UI simplification)
3. WP2/WP3 (onchain client reads/writes)
4. WP4 (protocol wiring)
5. WP6 (tests/docs cleanup)
6. WP5 (fork testing harness/runbook validation)
7. WP7 (ops rollout notes)

## Merge checklist
- Repo compiles with mocks enabled and disabled.
- `yethUsesMockBackend` is `false` in onchain mode.
- With mocks off and wallet disconnected, `/yeth` loads yETH global feed data.
- `/yeth` has no references to:
  - snapshots
  - log scanning
  - opensAt/not_open state

## Preprod verification (fork)
Follow `docs/apps/yeth/onchain-integration-plan/fork-runbook.md`:
- Seed claimable in fork
- Test claim exit + claim stay + redeem

Capture:
- tx hashes for each flow
- a screenshot of claim UI and recovery UI

## Final gate for production enablement
- Ensure `NEXT_PUBLIC_ENABLE_YETH` remains required in production.
- Confirm `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL` configured for prod/preprod.
- Confirm `NEXT_PUBLIC_RPC_URLS` configured for account reads/writes.

If conflicts arise:
- Prefer preserving the simplified state machine over legacy mock-first states.
