# 4. Architecture Blueprint

**Version 0.7 — 2025-11-20**
Scope: stYFI • stYFIMax • veYFI • LLYFI (BR#1 UI-first architecture)
Status: Updated after Phase-3 implementation

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
├── styfi/        UI for stYFI + stYFIMax
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
- stYFIMax
- LLYFI tokens (sdYFI, upYFI, coveYFI, etc.)

This replaces any domain-specific cooldown types.

---

## 3.2 stYFI Domain Model

### Entities

- **EpochInfo**
- **StyfiAllowances**
- **StyfiMaxPosition**
- **StyfiAccountState**

All read through:

```
StyfiClient.getAccountState(address)
```

### Actions (writes)

- `prepareStake(mode, amount)`
- `prepareStartCooldown(mode, amount)`
- `prepareWithdraw(mode)`
- `prepareClaimRewards()`

Mode is `"stYFI" | "stYFIMax"`.

All return:

```
Promise<PreparedTransaction>
```

(where Phase-1 PreparedTransaction is a stub, expanded in Phase-2)

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

- Fetch state via multicalls (later)
- Prepare transaction objects
- Interpret contract return values
- Model domain behaviours (cooldown, caps, migrations)

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
- `useVeyfiAccount()`
- `useEpoch()`
- `useLlyfiTokens()`
- `useRedemptionCaps()`

These:

- Use React Query
- Have stable query keys
- Cache and revalidate predictably
- Derive UI-ready computed values
- Allowances for stYFI/LLYFI must come from domain account state; `useTokenAllowance` is reserved for on-chain reads and returns a stub in mock mode.

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
  ├── Stake (stYFIMax)
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
  ├── Migration Panel (legacy → veYFI)
  ├── LLYFI Staking Table
  ├── Cooldown & Withdraw
  ├── Rewards (claim-all)
  └── Redemption Panel
```

All data comes from:

- `useVeyfiAccount()`
- `useLlyfiTokens()`
- `useRedemptionCaps()`

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

consistent across stYFI, stYFIMax, and LLYFI.

---

# 10. Mocks Architecture (Phase-2)

Mocks simulate domain behaviour deterministically and are the primary target for local UI development.

### Shared patterns (target behaviour):

- In-memory store per user
- Controlled “time” for cooldowns
- Configurable latency
- Mutation on stake/cooldown/withdraw/redeem
- Deterministic “random” reward accrual

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

1.  **Global State:** Mocks use a module-level global `Map` to persist state across React fast-refreshes and component remounts.
2.  **Implicit Context:** Mocks track the `lastAddress` used in `getAccountState`. This allows `prepare*` methods (which do not accept an address argument) to know which account to mutate during the simulated transaction.
    - _Note:_ This is a dev-only hack. Real clients rely on the wallet provider's active signer.

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

**Version 0.7** reflects:

- Phase-1 completion
- Shared CooldownState model
- Phase-1 minimal tx types
- Correct sequencing of tx pipeline (Phase-2)
- Tooling note (Webpack for production builds)

---

**End of `4-architecture-blueprint.md`**
