# 4. Architecture Blueprint

**Version 0.9 — 2025-12-20**
Scope: stYFI • stYFIx • veYFI • LLYFI (BR#1 UI-first architecture)
Status: Updated after Phase-6 implementation

This blueprint defines the front-end implementation architecture for the governance applications under YIP-88, aligned with:

- **0-normative-spec-yip88.md**
- **1-user-stories-styfi.md**
- **2-user-stories-veyfi.md**
- **3-frontend-frd.md**
- **5-master-task-list.md**

It is the top-level design document guiding implementers of the `/styfi` and `/veyfi` front-end apps.

---

# 1. High-Level Architecture

```

/app
├── styfi/        UI for stYFI + stYFIx
├── veyfi/        UI for veYFI + LLYFI
└── layout.tsx

/lib
├── clients/
│     ├── shared/      shared domain types (CooldownState)
│     ├── styfi/       domain types + interfaces + mock
│     └── veyfi/       domain types + interfaces + mock
├── tx/                tx lifecycle (Phase-2)
├── hooks/             domain hooks (Phase-3)
└── format/            formatting + helpers

/components
├── ui/                primitives (buttons, cards, tables, modals)
└── domain/            reusable sections (staking panels, cooldown widgets, etc.)

```

Core principles:

- **Domain-first**: Two domain clients: `StyfiClient` and `VeyfiClient`.
- **Separation of concerns**: UI never touches viem/wagmi directly except read helpers; all writes go via `useTx`.
- **Mock-first**: Entire UI is built against deterministic mocks.
- **Simplicity**: No auto-approvals, no magic.
- **Predictable state flow**: domain reads → domain UI → `prepare*` → `useTx`.

---

# 2. Build System

Due to Turbopack limitations with deep indirect dependencies (`thread-stream` → `pino` → `walletconnect`), the recommended build configuration is:

- **Development:** default (`next dev`)
- **Production:** `next build --webpack`

This is a tooling detail and does not affect architecture, but ensures clean builds.

---

# 3. Domain Model

The domain layer defines strict, typed interfaces that abstract all reads and writes.
Everything else hangs off this.

---

## 3.1 Shared Types

### `CooldownState`

Defined in: `/lib/clients/shared/types.ts`.

> **Single universal cooldown model for all assets across both domains.**

```ts
export type CooldownState = {
  amount: bigint;
  endsAt: number; // unix seconds
} | null;
```

Used by:

- stYFI
- stYFIx
- LLYFI tokens (sdYFI, upYFI, coveYFI, etc.)

This replaces any domain-specific cooldown types.

---

## 3.2 stYFI Domain Model

### Entities

- **EpochInfo**
- **StyfiAllowances**
- **StyfiXPosition**
- **StyfiAccountState** (includes `withdrawable` balances as source of truth)
- **StyfiGlobalStats** (Total Supply, Total Staked)

All read through:

```
StyfiClient.getAccountState(address)
StyfiClient.getStats()
StyfiClient.getApy()
StyfiClient.getEpochInfo()
```

### Actions (writes)

- `prepareStake(mode, amount)`
- `prepareStartCooldown(mode, amount)`
- `prepareWithdraw(mode)`
- `prepareClaimRewards()`

Mode is `"stYFI" | "stYFIx"`.

---

## 3.3 veYFI + LLYFI Domain Model

### Entities

- **Legacy veYFI migration state**
- **LLYFI token states (multiple tokens)**
- **RedemptionCaps**
- **VeyfiAccountState**

LLYFI token list is dynamic and domain-driven (not UI-driven).

### Actions (writes)

- `prepareMigrateVeYfi()`
- `prepareStakeLlyfi(symbol, amount)`
- `prepareStartCooldownLlyfi(symbol, amount)`
- `prepareWithdrawLlyfi(symbol)`
- `prepareClaimLlyfiRewards()`
- `prepareRedeemLlyfi(symbol, amount)`

All return a `PreparedTransaction`.

---

# 4. Transaction Pipeline

**Phase-1 reality (done):**
`PreparedTransaction` is defined in `/lib/tx/types.ts` as:

```ts
export type PreparedTransaction = () => Promise<TransactionHash>;
```

**Phase-2 (current state):**

- `TxStatus`, `TxErrorType`, and `TxState` are defined in `/lib/tx/types.ts`.
- `useTx` in `/lib/tx/useTx.ts`:

  - calls the `PreparedTransaction` (which submits and returns a hash),
  - waits for confirmation via `waitForTransactionReceipt` (skipped in mock mode),
  - tracks `idle → signing → submitted → mining → success | error`,
  - exposes `state` and `status`,
  - accepts callbacks for invalidation and success/error handling.

Automatic toast lifecycle and retry/error normalization are left to the shared UI layer and **MAY** be added in a later phase without changing the `useTx` interface.

**Principle:**
**Clients never send transactions themselves.**
They only _prepare_ the metadata needed to send a transaction.
Execution always occurs through `useTx`.

---

# 5. Client Architecture

Two fully isolated domain clients:

```
lib/clients/styfi/ (StyfiClient)
lib/clients/veyfi/ (VeyfiClient)
```

Each folder contains:

- `types.ts`
- `client.ts` (interfaces)
- `mock.ts` (Phase-2)
- `index.ts` (optional barrel)

### Client Responsibilities

**Allowed:**

- Fetch state via multicalls.
- **Simulate** `eth_call` for complex getters (e.g. `RewardClaimer.claim` to preview rewards).
- Prepare transaction objects.
- Interpret contract return values.
- Model domain behaviours (cooldown, caps, migrations).

**Not allowed:**

- Send transactions
- Update global UI state
- Create toasts
- Perform approvals automatically

---

# 6. Protocol Provider

A single top-level provider binds domain clients to the UI.

```
<ProtocolProvider>
  <Web3Providers> (Wagmi -> QueryClient -> RainbowKit)
    {children}
  </Web3Providers>
</ProtocolProvider>
```

`ProtocolProvider` decides whether to use:

- **On-chain clients** (default target)
- **Mock clients** (`NEXT_PUBLIC_USE_MOCKS=true`)

Until Phase 8 lands, on-chain clients are not implemented; the provider falls back to mocks with a warning when on-chain is requested. This enables rapid local iteration and safe UI-first development while keeping the intended default clear.

---

# 7. Hooks Layer

All business logic lives in domain hooks.

## 7.1 Read Hooks

Examples:

- `useStyfiAccount()`
- `useStyfiStats()` (Global stats)
- `useStyfiApy()` (Dynamic APY)
- `useVeyfiAccount()`
- `useEpoch()`
- `useLlyfiTokens()`
- `useRedemptionCaps()`

These:

- Use React Query
- Have stable query keys
- Cache and revalidate predictably
- Derive UI-ready computed values

## 7.2 Write Hooks

Always:

1. Call client `prepare*`
2. Pass result to `useTx`
3. Invalidate affected queries on success

E.g.:

```ts
const { execute, state } = useTx();
const tx = await styfi.prepareStake("stYFI", amount);
await execute(tx, { invalidate: ["styfi", address] });
```

---

# 8. UI Architecture

## 8.1 Reusable UI Primitives

- **Button**
- **Card**
- **Modal**
- **Input**
- **Tabs**
- **Table**
- **Banner**
- **ProgressBar**
- **Skeleton**
- **Toast**

All domain flows use these primitives, ensuring uniformity.

---

## 8.2 `/styfi` Page Structure

```
/styfi
  ├── Account Summary
  ├── Stake (stYFI)
  ├── Stake (stYFIx)
  ├── Cooldown & Withdraw (both)
  └── Rewards
```

All data comes from:

- `useStyfiAccount()`
- `useEpoch()` (optional separate)

---

## 8.3 `/veyfi` Page Structure

```
/veyfi
  ├── Migration Card (legacy → veYFI)
  ├── LLYFI Ledger (Table)
  │    └── Row (Expandable)
  │         └── Cockpit Tabs: [Stake] [Unstake] [Trade]
  ├── Inventory Card (Redemption Intelligence)
  └── Rewards Card
```

All data comes from:

- `useVeyfiAccount()`
- `useLlyfiTokens()` (includes Balances, APR, Cooldown)
- `useVeyfiStats()` (Global health)

**Notes:**

- **Trade Tab:** Handles both "Mint" (YFI → LLYFI) and "Redeem" (LLYFI → YFI).
- **Inventory Card:** Displays protocol liquidity available for redemption (Flight Board).

---

## 8.4 Copy and Text Management

- All user-facing copy lives in co-located `messages.ts` files with an `as const` export.
- Each route/feature owns its own `messages.ts` (e.g., `app/styfi/messages.ts`, `app/veyfi/messages.ts`); shared shell copy (nav, footer, generic errors) lives in `app/_shared/messages.ts`.
- Exports follow `<feature>Copy` (or `copy` when obvious) and use semantic nesting (`page`, `cta`, `forms`, `errors`, `emptyState`, `status`, `shared`) instead of flat namespaces.
- Dynamic text uses functions (`positionSummary(amount: string) => string`); avoid building long sentences inline in components.
- Design system/shared components stay copy-agnostic: they take strings/ReactNodes via props and do not import `messages.ts` directly.
- Heuristic: avoid inline strings longer than ~60 characters in components unless they are accessibility attributes.

---

# 9. Error Handling & Edge Conditions

## 9.1 Wrong network

- Global banner
- Disable all CTAs
- Keep read views active

## 9.2 Blacklist

- Global banner
- Disable ALL actions
- Read-only mode remains enabled

## 9.3 Query errors

- Clear error banner
- Retry button
- No partial states

## 9.4 Cooldown visibility

CooldownPanel must handle:

- `null` state
- countdown states
- ready-for-withdrawal

consistent across stYFI, stYFIx, and LLYFI.

---

# 10. Mocks Architecture (Phase-2)

Mocks simulate domain behaviour deterministically and are the primary target for local UI development.

### Shared patterns (target behaviour):

- **Persistence:** In-memory store is persisted to `sessionStorage`.
- **Global Store:** Module-level global Map.
- **Configurable Latency:** Simulates network conditions.
- **Contract Parity:** Mocks now calculate "Withdrawable" and "Redeemable" using logic identical to the Vyper contracts (e.g., `maxWithdraw` emulation) to ensure UI testing is valid.
- **Debug Helpers:**
  - `debugSetBalance`: Immediate injection (connected).
  - `debugSetPendingBalance`: Queued injection (onboarding flows).
  - `timeTravel`: Advances internal clock for epoch/cooldown testing.

For **Phase 2**, mocks:

- implement the full client interfaces for stYFI and veYFI/LLYFI,
- provide realistic fixtures (balances, rewards, caps),
- simulate latency and return deterministic tx hashes via `PreparedTransaction`.

Per-address state mutation for stake/cooldown/withdraw/redeem can be layered in once the hooks and ProtocolProvider are wired, without changing the public client interfaces.

Example control flow:

```
prepareStake → mutate mock-store → return fake PreparedTransaction
useTx(fakeTx) → immediate success → invalidate queries
```

This produces a dev environment where:

- All flows behave exactly like production
- No external calls are needed
- Errors and edge cases can be tested cleanly

### Mock Implementation Details (Dev Only)

To ensure a smooth developer experience where UI updates immediately after transactions:

1.  **Global State:** Mocks use a module-level global `Map` to persist state.
2.  **Implicit Context:** Mocks track the `lastAddress` used in `getAccountState`.
3.  **Serialization:** Custom JSON replacer/reviver handles `BigInt` persistence in session storage.

---

# 11. On-Chain Integration (Phase-8+)

Activated when:

- ABIs are stable
- Multicall layout is known
- Domain invariants are locked

### Requirements:

- Minimal RPC calls
- All reads via multicall
- All writes via prepare\* → useTx
- No direct component-level contract interactions
- Strong type safety via viem contract bindings

This phase does **not** change UI or domain architecture.

---

# 12. Non-Functional Considerations

### 12.1 Performance

- Statically prerender `/`, `/styfi`, `/veyfi`
- Lazy-load heavy components
- Shared memoised derivations

### 12.2 Accessibility

- Keyboard-accessible CTAs
- Semantic headings
- Accessible modals

### 12.3 Internationalization (Optional future)

Blueprint keeps copy centralized to allow future i18n without refactor.

---

# 13. Summary

This architecture:

- Separates domain logic from UI
- Ensures transaction flows are unified and predictable
- Supports mock-first development
- Ensures minimal code duplication
- Produces a clean, scalable and maintainable FE system for Yearn’s governance apps

**Version 0.9** reflects:

- Phase-6 completion (veYFI/LLYFI)
- Architecture updates for Nested Cockpit and Inventory Card
- Shared CooldownState model
- Correct sequencing of tx pipeline

---

**End of `4-architecture-blueprint.md`**
