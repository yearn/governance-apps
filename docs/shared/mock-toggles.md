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
- **Effect:** Uses mock/debug backends across app domains instead of on-chain/feed-backed
  production paths.
- **Scope:** Global. There are no per-app mock/live switches for launch. Do not
  mix mock and live app domains in production.
- **Clock behavior in mock mode:** Epoch and cooldown UI timing uses the local mock clock (`nowSeconds`) instead of chain/global-data canonical clock sources.
- **Manual UAT tip:** For wallet-connect UX testing in mock mode, set `NEXT_PUBLIC_E2E=false`. If `NEXT_PUBLIC_E2E=true`, the app uses a fixed mock connector address and behaves as connected.

## Clock Source by Mode

- **Non-mock mode:** Epoch clock source priority remains chain timestamp (when connected) -> global-data `meta.timestamp` (pre-connect) -> local fallback.
- **Mock mode (`NEXT_PUBLIC_USE_MOCKS=true`):** Epoch clock intentionally bypasses chain/global-data and uses local mock time only. This keeps debug time travel deterministic and isolated from production data feeds.

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
- `NEXT_PUBLIC_ENABLE_DAO=true` permits the temporary route-local DAO mock
  review candidate in production runtime. The preproduction workflow may read
  this protected flag; the production workflow hardcodes it false.
- `NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS=true` permits the DAO fixture controls
  on `dao-beta.dao-ops.com` when the DAO route is enabled. It does not enable
  global mocks, E2E wiring, `/debug/ui`, or controls on another beta host.
- `NEXT_PUBLIC_ENABLE_TEAMS=true` is required to expose Team Finances in production runtime.
- `NEXT_PUBLIC_ENABLE_YBC=true` is required to expose YBC in production runtime.
- `NEXT_PUBLIC_ENABLE_YETH=true` is required to expose yETH in production runtime.
- `NEXT_PUBLIC_ENABLE_DEBUG_UI=true` is required to expose `/debug/ui` in production runtime.
- If unset in production, Team Finances routes/host mapping, YBC routes/host mapping, yETH routes/host mapping, and debug UI are intentionally unavailable.
- For the Teams/YBC launch, there are no separate write flags. Once the relevant app is
  approved, its production flag exposes feed-backed reads and launch-scope writes
  together. Disable the app flag to roll back exposure.

## Global Data (Non-Mock Mode)

- Env: `NEXT_PUBLIC_GLOBAL_DATA_URL` (R2 or similar static JSON storage).
- Used to hydrate global, non-account stats before a wallet connects.
- Server/runtime reads the configured URL directly; browser runtime reads `/api/global-data` so the payload is delivered same-origin.
- If missing, the UI renders skeletons for global stats until a wallet connects.

## Teams Data (Non-Mock Mode)

- Env: `NEXT_PUBLIC_TEAMS_DATA_URL` (`teams.json` from `gov-apps-stats`).
- Required when `NEXT_PUBLIC_ENABLE_TEAMS=true` in production.
- Server/runtime reads the configured URL directly; browser runtime reads `/api/teams-data` so the payload is delivered same-origin.
- Launch-scope writes are wired in feed mode after Teams WP10. Production exposure
  remains gated until Teams WP11 fork/preprod smoke and release approval are accepted.
- For fork smoke, use the validated corrected v2 candidate, or the stable v2 object
  after cutover. Do not use the current v1 object as financial evidence. Use fixture
  JSON or test route interception for rare states absent from the candidate; do not
  switch the production app into Teams-only mock mode.

## YBC Data (Non-Mock Mode)

- Env: `NEXT_PUBLIC_YBC_DATA_URL` (`ybc.json` from `gov-apps-stats`).
- Required when `NEXT_PUBLIC_ENABLE_YBC=true` in production.
- Server/runtime reads the configured URL directly; browser runtime reads `/api/ybc-data` so the payload is delivered same-origin.
- Launch-scope writes are wired in feed mode after YBC WP9. Production exposure
  remains gated until YBC WP10 fork/preprod smoke and release approval are accepted.
- For fork smoke, use live or saved `ybc.json` as the read source. Use fixture JSON or
  test route interception for rare states absent from the live feed; do not switch the
  production app into YBC-only mock mode.

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
Every mature mock-backed route must avoid visible `mock` or `prototype` badges
and route-shell implementation notes. Those review states belong in the floating
panel or shared E2E bridge.

DAO Governance uses this shared runtime in development and preview. Its controls
cover route state, deterministic fixtures, personas and independent roles,
content, lifecycle, veto, analysis, account, execution, and authoring facts. DAO
time travel recomputes protocol status and capabilities through domain logic; it
does not swap display labels.

The M2 internal review is the one temporary production-runtime exception:
`NEXT_PUBLIC_ENABLE_DAO=true` may mount the route-local DAO mock client while
global `NEXT_PUBLIC_USE_MOCKS`, E2E, and debug UI stay false. The separate
`NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS=true` flag may expose only the DAO
controls on `dao-beta.dao-ops.com`; it does not expose the E2E Test Bridge or a
global debug surface. This is not a reusable per-app mock/live switch. Public
production hardcodes both DAO flags false.

For Teams specifically, the shared panel now owns preset bootstrapping, viewer/admin
access, loading/empty coverage, workspace selection, current period, lifecycle,
read-only access, revenue, funding, and bonus state changes.

The panel is viewport-bounded and scrollable. Long Teams and YBC control sets should
prefer collapsible groups so QA can reach granular controls without the floating panel
clipping or covering the route.

### Features

1.  **Time Travel:**

    - `+1 Day` / `+7 Days`
    - Advances the internal mock clock. Use this to fast-forward through 14-day cooldowns to test unlocking and streaming logic.
    - Triggers an immediate refetch of account and registered domain query roots,
      including Teams and YBC; identity values update from the shared stYFI
      account query.

2.  **Balance Injection:**

    - Cross-app controls are available on both `/styfi` and `/veyfi` debug panels.
    - stYFI actions: `Add stYFI`, `Add stYFIx`.
    - veYFI actions: `+10 Legacy veYFI`, `+10 sdYFI`, `+10 coveYFI`, `+10,000 supYFI`.
    - wallet action: `+10 YFI`.
    - _Note:_ stYFI balance injections can queue for the next wallet connection; other token injections require a connected wallet.

3.  **Local State Tools:**
    - `Reset App`: Full wipe of `localStorage`, `sessionStorage` (chain state),
      every participating mock store (stYFI, veYFI, yETH, Teams, YBC, and DAO),
      and the query cache. Simulates a completely fresh install.

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
- New mock-heavy domains expose app-specific debug setters through the floating
  panel and `window.__TEST__`, not route-local scenario UI.
- The package adding the domain must register its query root, time-change hook,
  reset hook, mock store, and typed test-bridge adapter.
- Domain controls plug into `DebugControlsSection[]`. They do not extend the
  shared shell ad hoc.
