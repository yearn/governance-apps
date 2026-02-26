# yETH Onchain Integration Plan (v2 - simplified)

This folder contains the planning spec and work packages to integrate **onchain support**
for the `/yeth` app in `governance-apps`.

## What changed vs v1 plan

This plan intentionally **reduces scope** to ship an initial production-ready onchain MVP:

- **No `opensAt` / pre-window state.** Claims are treated as **open** until the onchain `deadline`.
- **No snapshots.** We do not ship or host `snapshot.json` data in this app.
- **No log/event lookups.** We do not attempt to classify "ineligible" vs "claimed/exited" or compute historical amounts.
- Account UX is based on only two signals:
  1) `claimable(address) > 0` (show claim UI)
  2) `recoveryVault.balanceOf(address) > 0` (show Recovery Vault position UI)

If neither is true, the app shows **no wallet-specific recovery state** (only global content like the footer).

## Where to place

Unzip at the **repo root**. It will add:

- `docs/apps/yeth/onchain-integration-plan/**` (this plan)
- `lib/clients/yeth/deployment.json` (yETH-only deployment config)

## How to start

1. Complete **WP0** first (deployment config).
2. Then run **WP1** (UI + type simplification) so the app no longer assumes `opensAt`.
3. Implement **WP2/WP3** (OnchainYethClient reads/writes) in parallel.
4. Merge with **WP4** (protocol wiring).
5. Validate with **WP5** (mainnet fork runbook).

