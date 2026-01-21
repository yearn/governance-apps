# Testing Strategy and Workflow

This document defines our testing approach, infrastructure seams, and developer workflow. It is the source of truth for how tests are written and run in this repo.

## Goals

- Flake-free, deterministic tests.
- High signal, low maintenance.
- Confidence for aggressive refactors without breaking core flows.

## The Strategy: Barbell with Programmatic Control

We intentionally avoid a large pyramid of brittle component tests. Instead we use a barbell strategy:

- Unit tests for pure logic and mock correctness.
- A small set of high-value E2E tests for critical user flows.
- Integration and component tests only where wiring or complex UI logic warrants it.

### Test Layers

- Layer A: Unit (Vitest)
- Layer B: Integration (Vitest + Provider Harness)
- Layer C: Components (Vitest + RTL)
- Layer D: E2E Smoke (Playwright)
- Layer E: E2E Full (Playwright)

## Non-Goals (Hard Rules)

- No DOM snapshots (`toMatchSnapshot` is banned).
- No MetaMask automation in E2E. Use MockConnector only.
- No UI debug clicking in E2E. Use the Test Bridge to set state.
- No locale testing in E2E. Use strict decimals with a `.` separator.

## Infrastructure Seams (Required for E2E Stability)

### 1) Test Bridge (`window.__TEST__`)

We expose a typed control surface for E2E tests. It is only injected when `NEXT_PUBLIC_E2E=true` (even in production builds).

- Location: `lib/test-bridge.ts` (interface + implementation helpers).
- Initialization: `components/TestBridgeListener.tsx` rendered inside `state/protocol.tsx`.
- Guard: `if (process.env.NEXT_PUBLIC_E2E === "true")`.
- All state mutations invalidate React Query for deterministic UI updates.

#### Usage from Playwright (example)

```ts
await page.evaluate(async () => {
  await window.__TEST__?.reset();
  await window.__TEST__?.setBalance(
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "YFI",
    "100"
  );
});
```

#### Bridge API

- `reset()`: clears mock stores, time, and React Query cache.
- `setNow(timestamp)`: sets the fixed mock time (seconds since epoch).
- `getState(address)`: returns a snapshot of mock state.
- `setBalance(address, symbol, amount)`: sets wallet or mock token balances.
- `setAllowance(address, symbol, spender, amount)`: sets mock allowances.
- `setScenario(name)`: loads a predefined scenario (resets first).

Amounts passed to the bridge must be human-readable strings without commas (e.g. `\"100.5\"`).

All bridge methods are `async` and should be awaited.
Scenario presets are applied to the default E2E address unless a test overrides state via `setBalance`.
Prefer calling `reset()` at the start of each E2E test to avoid leaked state.

Available scenarios:

- `standard`: baseline mock state.
- `active`: seeded stYFI balance for the default address.
- `legacy_user`: legacy veYFI balance pending migration.
- `caps_exhausted`: redemption caps and inventory fully consumed.

### 2) Deterministic Time

All time logic must come from `lib/mocks/time.ts`:

- `nowSeconds()` is the single source of truth.
- `setFixedNow(ts | null)` freezes or clears time.

Any logic that previously called `Date.now()` must use `nowSeconds()` instead.

### 3) Deterministic Wallet

When `NEXT_PUBLIC_E2E=true`, wagmi uses a `mock` connector with a fixed address:

- Default E2E address: `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`
- Location: `lib/test/constants.ts`

This means E2E tests are instantly “connected” and do not rely on wallet UI flows.
The mock connector is for testing only and should never be enabled in real user environments.

## Parallelism

Parallel Playwright workers are safe because all mocks are client-side and scoped to each browser context.

## Test Locations and Naming

Preferred structure (target layout, not fully migrated yet):

- `tests/unit/*`
- `tests/integration/*`
- `tests/components/*`
- `tests/e2e/smoke/*`
- `tests/e2e/full/*`

Use descriptive filenames:

- `lib/format.test.ts`
- `hooks/useStyfiAccount.test.tsx`
- `components/UnstakePanel.test.tsx`
- `smoke/styfi-flow.spec.ts`

## What to Test (and What to Avoid)

Do:

- Validate math, formatting, and error mapping at the unit level.
- Verify hooks call clients and invalidate queries.
- Test complex disconnected UI logic with plain props.
- Use the Test Bridge to set E2E state.

Do not:

- Assert on implementation details or DOM snapshots.
- Use flakey timers or refetch intervals in tests.
- Click debug UI in E2E to set state.

## Running Tests

Current commands:

- `npm run test` (Vitest)
- `npm run lint`
- `npm run typecheck`
- `npm run test:e2e` (Playwright smoke)
- `npm run test:e2e:full` (Playwright full)

Playwright can also be run directly:

- `npx playwright test --project=smoke`
- `npx playwright test --project=full`

## Environment Flags for Testing

- `NEXT_PUBLIC_E2E=true` enables the Test Bridge and mock wallet.
- `NEXT_PUBLIC_USE_MOCKS=true` ensures the app uses mock clients.
- `NEXT_PUBLIC_E2E=true` also forces mock clients for safety.
- `NEXT_PUBLIC_MOCK_TIME_OFFSET_SECONDS` can offset the clock in dev.

## Common Failure Modes

- Bridge missing: check `NEXT_PUBLIC_E2E=true`.
- UI not updating: ensure bridge mutations are awaited (React Query invalidates).
- Cap tests failing: use `setScenario("caps_exhausted")` to force caps.

## Notes

- `E2E_WEB_SERVER_COMMAND` can override the Playwright web server command if you want to test `next start` instead of `next dev`.
- Typecheck uses `types/next-shim.d.ts` to satisfy Next’s internal type imports under `.next/types`.
