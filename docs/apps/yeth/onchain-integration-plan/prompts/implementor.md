# Implementor Prompt — yETH Onchain MVP (Simplified)

You are implementing the yETH onchain MVP for `governance-apps` under `/yeth`.

## Constraints (do not deviate)
- Claims are treated as **open** until onchain `deadline`. There is **no opensAt**.
- No snapshots are used or hosted.
- No event/log scanning is used.
- Wallet-specific UI is shown only if:
  - `claimable(address) > 0` (after applying recovery_rate), OR
  - `recoveryVault.balanceOf(address) > 0`
- If neither condition is true, render no wallet-specific yETH recovery state.

## Source of truth
Use `lib/clients/yeth/deployment.json` for:
- `YETH_CLAIM`
- `YETH_YIELD_VAULT`
- `YETH_RECOVERY_VAULT`
Use dedicated yETH global feed (`NEXT_PUBLIC_YETH_GLOBAL_DATA_URL`) for disconnected-wallet
global metrics (`deadline`, `TVL`, `PPS`, totals).

## Work style
- Prefer small PRs aligned to a single Work Package (WP0–WP7).
- Add/adjust unit tests when behavior changes.
- Use existing patterns from `OnchainStyfiClient` for wagmi simulate/write flows.

## Definition of done for your WP
- The app compiles, unit tests pass, and `/yeth` behavior matches the simplified spec.
- No references to removed concepts remain (e.g., `opensAt`, snapshot loaders, log queries).

## Helpful implementation notes
- Global state must load when wallet is disconnected via yETH feed.
- Account reads can poll only when wallet is connected and route is active (already handled in hooks).
- Keep ABIs minimal (only required functions).
- Keep trust copy / governance URLs static for MVP unless explicit ops requirement is introduced.

When you finish:
- Provide a concise summary of what changed.
- List files touched.
- Include manual test steps (fork recommended).
