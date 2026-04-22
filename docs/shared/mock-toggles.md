# Dev Mocks: Toggles, Scenarios & Tools

## Runtime Mode Baseline

- Env: `NEXT_PUBLIC_RUNTIME_MODE`
- Allowed values: `development`, `preview`, `production`
- Recommendation:
  - local dev: `development`
  - preview deploys: `preview`
  - production deploys: `production`

## Mock Backend Toggle

- Env: `NEXT_PUBLIC_USE_MOCKS=true`
- **Default:** Disabled in repo; enable for local UI-only testing.
- **Effect:** Uses `MockStyfiClient`, `MockVeyfiClient`, and `MockYethClient` instead of on-chain calls.
- **Clock behavior in mock mode:** Epoch and cooldown UI timing uses the local mock clock (`nowSeconds`) instead of chain/S3 canonical clock sources.
- **Manual UAT tip:** For wallet-connect UX testing in mock mode, set `NEXT_PUBLIC_E2E=false`. If `NEXT_PUBLIC_E2E=true`, the app uses a fixed mock connector address and behaves as connected.

## Clock Source by Mode

- **Non-mock mode:** Epoch clock source priority remains chain timestamp (when connected) -> S3 `meta.timestamp` (pre-connect) -> local fallback.
- **Mock mode (`NEXT_PUBLIC_USE_MOCKS=true`):** Epoch clock intentionally bypasses chain/S3 and uses local mock time only. This keeps debug time travel deterministic and isolated from production data feeds.

## yETH Mock Backend

- In mock mode (`NEXT_PUBLIC_USE_MOCKS=true`), yETH uses `MockYethClient`.
- In non-mock mode (`NEXT_PUBLIC_USE_MOCKS=false`), yETH uses `OnchainYethClient`.
- yETH includes app-specific debug presets for fast state switching:
  - Claimable
  - Recovery Position
  - Empty
- The debug panel also includes claim-window toggles (`Open`, `Ended`, `Real Time`).

## Production Feature Gates

- `NEXT_PUBLIC_RUNTIME_MODE=production` enables production gating behavior.
- `NEXT_PUBLIC_ENABLE_TEAMS=true` is required to expose Team Finances in production runtime.
- `NEXT_PUBLIC_ENABLE_YBC=true` is required to expose YBC in production runtime.
- `NEXT_PUBLIC_ENABLE_YETH=true` is required to expose yETH in production runtime.
- `NEXT_PUBLIC_ENABLE_DEBUG_UI=true` is required to expose `/debug/ui` in production runtime.
- If unset in production, Team Finances routes/host mapping, YBC routes/host mapping, yETH routes/host mapping, and debug UI are intentionally unavailable.

## Public RPC (Non-Mock Mode)

## Global Data (Non-Mock Mode)

- Env: `NEXT_PUBLIC_GLOBAL_DATA_URL` (S3 or similar).
- Used to hydrate global, non-account stats before a wallet connects.
- The client reads via `/api/global-data` proxy to avoid CORS issues.
- If missing, the UI renders skeletons for global stats until a wallet connects.

## Public RPC (Required in Production)

- Env: `NEXT_PUBLIC_RPC_URLS` (comma-separated, HTTPS when served over HTTPS).
- Required in production. Used to seed wagmi transports for non-wallet and fallback reads.
- In non-production, if unset, wagmi falls back to viem default mainnet RPC URLs.

## Persistence

- **Session Storage:** The mock clients now persist their internal chain state (balances, allowances, cooldowns) to `window.sessionStorage`.
- **Behavior:** This allows testing of "Returning User" flows. Refreshing the page **does not** reset your mock balances.
- **Reset:** To wipe this state, use the "Reset App" button in the on-screen debug controls.

## Mock Controls UI

When running with mocks enabled, a **"🛠️ Debug"** button appears at the bottom center of the screen.

Default app surfaces should stay production-like even when mocks are enabled. Route-local
hero cards, scenario switchers, and obvious prototype-control chrome are transitional
only; app-specific mock controls belong inside this floating debug panel or the E2E
bridge. Scenario fixtures are still valid as hidden seed presets, but they should not
be the primary user-facing interaction model for mature mock-backed routes.

For mature mock-backed routes, debug controls should mutate underlying domain state in
place. Presets may bootstrap the state, but QA should be able to keep navigating the
normal route while changing persona, time, loading/empty coverage, and domain-specific
values under the current view.
For `teams` and `ybc`, that also means the default route should avoid visible `mock` /
`prototype` badges or route-shell implementation notes; those review states belong in
the floating panel or the shared E2E bridge.

For Teams specifically, the shared panel now owns preset bootstrapping, viewer/admin
access, loading/empty coverage, workspace selection, current period, lifecycle,
read-only access, revenue, funding, and bonus state changes.

### Features

1.  **Time Travel:**

    - `+1 Day` / `+7 Days`
    - Advances the internal mock clock. Use this to fast-forward through 14-day cooldowns to test unlocking and streaming logic.
    - Triggers an immediate refetch of account and domain queries (`styfi`, `veyfi`, `yeth`) and also reserves `teamsKeys.all` plus `ybcKeys.all` as the `M2A` shared-root invalidation seam; identity values update from the shared stYFI account query.

2.  **Balance Injection:**

    - Cross-app controls are available on both `/styfi` and `/veyfi` debug panels.
    - stYFI actions: `Add stYFI`, `Add stYFIx`.
    - veYFI actions: `+10 Legacy veYFI`, `+10 sdYFI`, `+10 coveYFI`, `+10,000 supYFI`.
    - wallet action: `+10 YFI`.
    - _Note:_ stYFI balance injections can queue for the next wallet connection; other token injections require a connected wallet.

3.  **Local State Tools:**
    - `Reset App`: Full wipe of `localStorage`, `sessionStorage` (chain state), and query cache. Simulates a completely fresh install.

## Scenario Presets

- Env: `NEXT_PUBLIC_SCENARIO`
- Usage: Seeds initial state _only if no session storage exists_.
- Allowed: `standard` (default), `active`, `ready`, `caps-exhausted`.
  - `active`: pre-staked + in-cooldown fixtures.
  - `ready`: cooldown ended, ready-to-withdraw fixtures.
  - `caps-exhausted`: global and per-token redemption caps fully used.

## Notes

- Domain allowances should be read from account state in mock mode (avoid `useTokenAllowance`).
- Error shaping is normalized in `lib/tx/errors.ts`; keep new mock errors aligned with that map.
- New mock-heavy domains should expose app-specific debug setters through the floating
  panel and `window.__TEST__` rather than relying on route-local scenario UI.
- When a new mock-heavy domain is added, `DebugControls` time travel and `Reset App`
  must invalidate and reset that domain's store as part of the same package.
- For the Teams and YBC `M2A` alignment work, shared seam ownership for
  `DebugControls` and `window.__TEST__` sits in `shared / WP0`; the domain runtime
  packages consume that seam rather than redefining it.
- For that `M2A` seam specifically, domain controls should plug into
  `DebugControlsSection[]` and the `TeamsTestBridgeAdapter` / `YbcTestBridgeAdapter`
  types instead of extending the shared shell ad hoc.
