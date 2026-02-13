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
- **Effect:** Uses `MockStyfiClient` and `MockVeyfiClient` instead of on-chain calls.
- **Clock behavior in mock mode:** Epoch and cooldown UI timing uses the local mock clock (`nowSeconds`) instead of chain/S3 canonical clock sources.
- **Manual UAT tip:** For wallet-connect UX testing in mock mode, set `NEXT_PUBLIC_E2E=false`. If `NEXT_PUBLIC_E2E=true`, the app uses a fixed mock connector address and behaves as connected.

## Clock Source by Mode

- **Non-mock mode:** Epoch clock source priority remains chain timestamp (when connected) -> S3 `meta.timestamp` (pre-connect) -> local fallback.
- **Mock mode (`NEXT_PUBLIC_USE_MOCKS=true`):** Epoch clock intentionally bypasses chain/S3 and uses local mock time only. This keeps debug time travel deterministic and isolated from production data feeds.

## yETH Mock Backend

- The `yETH` recovery app currently uses a dedicated mock client in all environments.
- This is isolated from `NEXT_PUBLIC_USE_MOCKS`, so `stYFI` and `veYFI` can stay on on-chain clients while `yETH` remains mocked.
- yETH includes app-specific debug presets for fast state switching:
  - Eligible / Unclaimed
  - Claimed / Exited
  - Claimed / Staying
  - Ineligible
- The debug panel also includes claim-window toggles (`Open`, `Ended`, `Real Time`).

## Production Feature Gates

- `NEXT_PUBLIC_RUNTIME_MODE=production` enables production gating behavior.
- `NEXT_PUBLIC_ENABLE_YETH=true` is required to expose yETH in production runtime.
- `NEXT_PUBLIC_ENABLE_DEBUG_UI=true` is required to expose `/_debug/ui` in production runtime.
- If unset in production, yETH routes/host mapping and debug UI are intentionally unavailable.

## Public RPC (Non-Mock Mode)

## Global Data (Non-Mock Mode)

- Env: `NEXT_PUBLIC_GLOBAL_DATA_URL` (S3 or similar).
- Used to hydrate global, non-account stats before a wallet connects.
- The client reads via `/api/global-data` proxy to avoid CORS issues.
- If missing, the UI renders skeletons for global stats until a wallet connects.

## Public RPC (Optional)

- Env: `NEXT_PUBLIC_RPC_URLS` (comma-separated, HTTPS when served over HTTPS).
- Optional. Used to seed wagmi transports for local/dev or fork testing.
- If unset, wagmi falls back to default mainnet RPC URLs.

## Persistence

- **Session Storage:** The mock clients now persist their internal chain state (balances, allowances, cooldowns) to `window.sessionStorage`.
- **Behavior:** This allows testing of "Returning User" flows. Refreshing the page **does not** reset your mock balances.
- **Reset:** To wipe this state, use the "Reset App" button in the on-screen debug controls.

## Mock Controls UI

When running with mocks enabled, a **"🛠️ Debug"** button appears at the bottom center of the screen.

### Features

1.  **Time Travel:**

    - `+1 Day` / `+7 Days`
    - Advances the internal mock clock. Use this to fast-forward through 14-day cooldowns to test unlocking and streaming logic.
    - Triggers an immediate refetch of identity and domain queries (`styfi`, `veyfi`, `yeth`) so UI state updates right away.

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
