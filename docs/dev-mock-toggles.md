# Dev Mocks: Toggles, Scenarios & Tools

## Mock Backend Toggle

- Env: `NEXT_PUBLIC_USE_MOCKS=true`
- **Default:** Disabled in repo; enable for local UI-only testing.
- **Effect:** Uses `MockStyfiClient` and `MockVeyfiClient` instead of on-chain calls.

## Public RPC (Non-Mock Mode)

- Env: `NEXT_PUBLIC_RPC_URLS` (comma-separated, HTTPS when served over HTTPS).
- Required when `NEXT_PUBLIC_USE_MOCKS=false`. Missing or invalid RPC config surfaces a runtime error instead of falling back to mocks.

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
    - Triggers an immediate refetch of epoch-dependent queries.

2.  **Balance Injection:**

    - `Add stYFI`: Injects 100 stYFI into the connected address.
    - `Add stYFIx`: Injects 100 stYFIx into the connected address.
    - _Note:_ If wallet is disconnected, these queue a balance injection for the next address that connects. Use this to test the default asset selection logic.

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
