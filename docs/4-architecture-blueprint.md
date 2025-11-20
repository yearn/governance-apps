# stYFI / stYFIMax / veYFI / LLYFI Frontend

**Implementation Approach & Architecture Blueprint**
Version 0.5 — 2025-11-20
Status: Draft
Repo: `yearn/governance-apps`
Author: Pickles

---

## 1. Purpose

This document defines **how** the new Yearn governance web apps are implemented within the `governance-apps` repository.

It translates:

- **Protocol spec** (YIP-88),
- **Frontend Functional Requirements** (`frontend-frd.md`),
- **User Stories** (`user-stories-styfi.md`, `user-stories-veyfi.md`),

into a concrete frontend architecture and phased implementation plan.

Focus of BR#1 (UI-first, mock-backed):

- `styfi.yearn.fi` → stYFI + stYFIMax
- `veyfi.yearn.fi` → veYFI + LLYFI + redemption

On-chain integration (multicall, live contracts) is a later phase once ABIs are stable.

---

## 2. Scope & Surfaces

### 2.1 Initial Scope (BR#1)

Single Next.js app in `yearn/governance-apps` with:

- `/styfi`

  - YFI → stYFI staking
  - YFI → stYFIMax (ERC-4626) staking
  - Cooldown + withdrawal for both
  - Unified reward claiming (yvUSDS)
  - Epoch info display
  - Blacklist-aware behaviour

- `/veyfi`
  - veYFI migration
  - LLYFI staking (legacy locker tokens)
  - LLYFI cooldown + withdrawal
  - LLYFI → YFI redemption (caps + fees)
  - Reward claiming (yvUSDS)
  - Blacklist-aware behaviour

Non-goals in BR#1:

- Governance voting UI
- Proposals / discussions
- Revenue / P&L dashboards
- YBC flows
- Transfer UI

---

## 3. High-Level Design Principles

1. **Single app, multiple “sites”**
   One Next.js app (`governance-apps`) exposes multiple route groups:

   - `/styfi`
   - `/veyfi`
   - Future: `/governance`, `/dashboards`, etc.
     DNS rewrites map subdomains to these paths.

2. **UI-first, mock-backed**
   Build the full UI, transaction flows, and state handling using **mock clients** first.
   Swap in on-chain clients when contracts and ABIs are ready.

3. **Hard data-access boundary**
   React components and hooks **MUST NOT** use wagmi/viem or ABIs directly.
   All protocol access goes through two domain clients:

   - **StyfiClient** – stYFI + stYFIMax
   - **VeyfiClient** – veYFI + LLYFI + redemption

4. **Transaction lifecycle as a first-class concern**
   Every write path uses the same `useTx` state machine:

   - `idle → simulating → signing → submitted → mining → success/error`

5. **Multicall & batch reads**
   On-chain clients use `publicClient.multicall` to build aggregate views:

   - `StyfiAccountState`
   - `VeyfiAccountState`

6. **BigInt everywhere**
   All token values and caps are handled as `bigint`.
   Formatting/parsing goes through shared helpers.

7. **Contracts are source of truth**
   No local re-implementation of:
   - reward formulas
   - boosts
   - epoch schedule
   - vault PPS
     UI only displays what contracts report.

---

## 4. Technology Stack

### 4.1 Framework & Rendering

- **Next.js** (App Router)
- **React** + **TypeScript**

### 4.2 Styling & Components

- **Tailwind CSS v4** (already wired via `@tailwindcss/postcss`)
- Custom components under `/ui` for:
  - Buttons, cards, tables, modals, banners, toasts, progress bars
- Potential later addition: Storybook (optional, not required for BR#1)

### 4.3 Web3 Layer

- **wagmi 2.x** (already configured in `/web3/wagmi.ts`)
- **viem** (`publicClient`, `walletClient`)
- **RainbowKit** for wallet selection & `ConnectButton`

### 4.4 Data & State Management

- **React Query** (already configured in `/state/query-client.tsx`)
  - All reads go through React Query hooks
  - Invalidation after writes
- **Zustand** (planned)
  - UI state: modals, banners, feature toggles
- **Zod**
  - For user inputs (amounts, addresses)
  - Not for contract outputs (overhead not justified)

---

## 5. Repository & Module Structure

Current repo (simplified):

```text
app/
  styfi/
    page.tsx
  veyfi/
    page.tsx
  page.tsx
  layout.tsx
state/
  query-client.tsx
web3/
  wagmi.ts
  rainbowkit.tsx
```

Target structure:

```text
app/
  layout.tsx          -> wraps with Web3Providers, QueryProviders, ProtocolProvider
  page.tsx            -> landing with links to /styfi and /veyfi
  styfi/
    page.tsx          -> stYFI / stYFIMax entry UI
  veyfi/
    page.tsx          -> veYFI / LLYFI entry UI

docs/
  frontend-frd.md
  user-stories-styfi.md
  user-stories-veyfi.md
  architecture-blueprint.md  (this file)
  master-task-list.md
  yip-88-summary.md          (optional mirror / FE-focused notes)

lib/
  clients/
    styfi/
      types.ts              -> Styfi domain types
      client.ts             -> StyfiClient interface
      mock.ts               -> MockStyfiClient
      onchain.ts            -> OnchainStyfiClient
    veyfi/
      types.ts
      client.ts
      mock.ts
      onchain.ts
  hooks/
    useStyfiAccount.ts
    useStyfiActions.ts
    useVeyfiState.ts
    useVeyfiActions.ts
  protocol/
    epoch.ts                -> epoch-related helpers (contract-facing)
  tx/
    useTx.ts                -> shared transaction lifecycle hook
    types.ts                -> TxStatus, error shape

ui/
  components/
    Button.tsx
    Card.tsx
    Input.tsx
    Table.tsx
    Banner.tsx
    Modal.tsx
    ProgressBar.tsx
    Toast.tsx
  patterns/
    StyfiAccountPanel.tsx
    StyfiStakePanel.tsx
    StyfiCooldownPanel.tsx
    StyfiRewardsPanel.tsx
    VeyfiMigrationCard.tsx
    LlyfiTable.tsx
    RedemptionPanel.tsx
  styles/
    tokens.ts               -> color + spacing tokens

state/
  query-client.tsx
  ui-store.ts               -> Zustand store
  feature-flags.ts

web3/
  wagmi.ts
  rainbowkit.tsx
  multicall.ts              -> helper for batched reads (optional)
```

Notes:

- **`/lib/clients`** is the data-access layer; avoids confusion with Solidity “protocol”.
- App-level code **only uses hooks** from `/lib/hooks`, never clients or wagmi directly.

---

## 6. Domain Clients & Types

### 6.1 StyfiClient (stYFI + stYFIMax)

**Responsibility:** Everything under `/styfi`:

- YFI wallet balance
- stYFI stake + cooldown
- stYFIMax vault shares + underlying assets
- Rewards (generic + boosted)
- Epoch info
- Blacklist status
- Token allowances

#### 6.1.1 Types – `/lib/clients/styfi/types.ts`

```ts
import type { Address } from "viem";

export type EpochInfo = {
  currentEpoch: number;
  epochEnd: number; // unix seconds (from contract)
  nextEpochStart: number; // unix seconds (from contract)
};

export type StyfiAllowances = {
  yfiToStyfi: bigint;
  yfiToStyfiMax: bigint;
};

export type StyfiCooldownState = {
  amount: bigint;
  endsAt: number; // unix seconds
} | null;

export type StyfiMaxPosition = {
  sharesActive: bigint; // stYFIMax shares
  sharesInCooldown: bigint;
  assetsActive: bigint; // underlying YFI equivalent
  assetsInCooldown: bigint;
  cooldown: StyfiCooldownState;
};

export type StyfiAccountState = {
  address: Address;
  isBlacklisted: boolean;

  yfiBalance: bigint;

  // stYFI
  styfiActive: bigint;
  styfiInCooldown: bigint;
  styfiCooldown: StyfiCooldownState;

  // stYFIMax
  styfiMax: StyfiMaxPosition;

  // Rewards
  claimableGenericRewards: bigint;
  claimableBoostedRewards: bigint;
  accruingGenericRewards: bigint;
  accruingBoostedRewards: bigint;

  allowances: StyfiAllowances;
  epoch: EpochInfo;
};
```

#### 6.1.2 Interface – `/lib/clients/styfi/client.ts`

```ts
export type StyfiStakeMode = "stYFI" | "stYFIMax";

export interface StyfiClient {
  getAccountState(address: Address): Promise<StyfiAccountState>;
  getEpochInfo(): Promise<EpochInfo>;

  // Read-only helpers if needed
  // getPreviewStake(mode, amount): Promise<...>;

  // Write-prep methods: return a function or tx descriptor for useTx
  prepareStake(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<() => Promise<string>>;
  prepareStartCooldown(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<() => Promise<string>>;
  prepareWithdraw(mode: StyfiStakeMode): Promise<() => Promise<string>>;
  prepareClaimRewards(): Promise<() => Promise<string>>;
}
```

**Important:**
Clients **do not** auto-handle approvals. Approval logic is separated (handled either via dedicated helper or a separate “token” client, but in BR#1 it’s enough to call standard wagmi `approve` via `useTx` directly).

---

### 6.2 VeyfiClient (veYFI + LLYFI + Redemption)

**Responsibility:** Everything under `/veyfi`:

- Legacy veYFI state
- LLYFI tokens: balances, staking, cooldown, rewards
- Redemption caps and fee
- Blacklist status

#### 6.2.1 Types – `/lib/clients/veyfi/types.ts`

```ts
export type VeYfiMigrationState = {
  legacyBalance: bigint;
  migrationEligible: boolean;
  migrated: boolean;
};

export type LlyfiTokenId = "sdYFI" | "upYFI" | "coveYFI"; // extensible

export type LlyfiTokenState = {
  symbol: LlyfiTokenId;
  name: string;
  decimals: number;
  walletBalance: bigint;
  stakedBalance: bigint;
  cooldownBalance: bigint;
  cooldown: StyfiCooldownState;
  claimableRewards: bigint;
  accruingRewards: bigint;
  allowance: bigint;
};

export type RedemptionCaps = {
  globalLimit: bigint;
  globalUsed: bigint;
  perToken: {
    symbol: LlyfiTokenId;
    limit: bigint;
    used: bigint;
  }[];
  feeBps: number; // 0–10_000
};

export type VeyfiAccountState = {
  address: Address;
  isBlacklisted: boolean;

  veYfi: VeYfiMigrationState | null;
  llyfiTokens: LlyfiTokenState[];
  redemptionCaps: RedemptionCaps;
};
```

#### 6.2.2 Interface – `/lib/clients/veyfi/client.ts`

```ts
export interface VeyfiClient {
  getAccountState(address: Address): Promise<VeyfiAccountState>;

  // Write-prep methods
  prepareMigrateVeYfi(): Promise<() => Promise<string>>;
  prepareStakeLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<() => Promise<string>>;
  prepareStartCooldownLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<() => Promise<string>>;
  prepareWithdrawLlyfi(symbol: LlyfiTokenId): Promise<() => Promise<string>>;
  prepareClaimLlyfiRewards(): Promise<() => Promise<string>>; // may claim all tokens
  prepareRedeemLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<() => Promise<string>>;
}
```

Again, approvals are not hidden inside these methods.

---

## 7. ProtocolProvider & Hooks

### 7.1 ProtocolProvider

`/lib/ProtocolProvider.tsx`:

- Instantiates either mock or on-chain clients based on env (`USE_MOCKS=true|false`).
- Provides `{ styfiClient, veyfiClient }` via React context.

```ts
type ProtocolContextValue = {
  styfiClient: StyfiClient;
  veyfiClient: VeyfiClient;
};

const ProtocolContext = createContext<ProtocolContextValue | null>(null);

// Used in app/layout.tsx
export function ProtocolProvider({ children }: { children: ReactNode }) {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

  const styfiClient = useMemo(
    () => (useMocks ? new MockStyfiClient() : new OnchainStyfiClient()),
    [useMocks]
  );
  const veyfiClient = useMemo(
    () => (useMocks ? new MockVeyfiClient() : new OnchainVeyfiClient()),
    [useMocks]
  );

  return (
    <ProtocolContext.Provider value={{ styfiClient, veyfiClient }}>
      {children}
    </ProtocolContext.Provider>
  );
}
```

`RootLayout` wraps `ProtocolProvider` around the app (inside `Web3Providers` / `QueryProviders`).

---

### 7.2 React Query Hooks

Hooks under `/lib/hooks` wrap the clients for the UI.

**Styfi hooks:**

- `useStyfiAccount()`
- `useStyfiStake(mode)`
- `useStyfiCooldown(mode)`
- `useStyfiWithdraw(mode)`
- `useStyfiClaimRewards()`

**Veyfi hooks:**

- `useVeyfiAccount()`
- `useVeyfiMigration()` (selector over account)
- `useLlyfiTokens()` (selector over account)
- `useRedemptionCaps()` (selector over account)
- Action hooks (`useVeyfiMigrate`, `useLlyfiStake`, etc.) which internally call `useTx`.

---

## 8. Transaction Lifecycle (`useTx`)

This is **critical** and moved early (Phase 2), not an afterthought.

### 8.1 Types — `/lib/tx/types.ts`

```ts
export type TxStatus =
  | "idle"
  | "simulating"
  | "signing"
  | "submitted"
  | "mining"
  | "success"
  | "error";

export type TxErrorType =
  | "USER_REJECTED"
  | "INSUFFICIENT_FUNDS"
  | "REVERT"
  | "NETWORK"
  | "UNKNOWN";

export type TxState = {
  status: TxStatus;
  errorType?: TxErrorType;
  errorMessage?: string;
  txHash?: `0x${string}`;
};
```

### 8.2 Hook — `/lib/tx/useTx.ts`

`useTx`:

- Accepts an async function that produces a transaction (e.g. a client’s `prepare*` result or a direct wagmi write).
- Drives the TxStatus state.
- Emits events to a toast system.
- On success: triggers React Query invalidation (via callback or shared helper).

Example usage:

```ts
const { execute, state } = useTx({
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ["styfi", "account", address] }),
});

const handleStake = async () => {
  const txFn = await styfiClient.prepareStake(mode, amount);
  await execute(txFn);
};
```

Components bind button disabled / spinners to `state.status`.

---

## 9. Data Flow

### 9.1 Reads

1. Page mounts.
2. `useStyfiAccount` / `useVeyfiAccount` called with `address`.
3. Hook uses `useQuery` to call `client.getAccountState`.
4. Under the hood, **on-chain clients** use viem `multicall` to fetch:

   - balances
   - rewards
   - epoch info
   - blacklist status
     and aggregate into account types.

5. UI renders from stable, typed, aggregated state.

### 9.2 Writes

1. User presses a button (stake / migrate / redeem / etc).
2. UI:

   - Validates inputs via Zod/small helpers.
   - Calls appropriate `prepare*` method on domain client.

3. The client returns a `() => Promise<string>` function (send tx, return hash).
4. `useTx.execute` runs the fn:

   - Sets `status` = `signing`, then `submitted`, `mining`, `success`/`error`.
   - Emits toasts.

5. On success:

   - React Query invalidates relevant keys (account state, etc.).

Approvals (ERC-20 `approve`) are handled similarly but via simple wrappers around wagmi/viem, also through `useTx`.

---

## 10. Mocks & Scenario System

### 10.1 Mock Clients

**MockStyfiClient** & **MockVeyfiClient**:

- Implement same interfaces as on-chain clients.
- Store an in-memory “fake chain state”:

  - accounts, balances, cooldowns, rewards, caps, etc.

- Methods:

  - `getAccountState` returns deterministic fixture data.
  - `prepare*` returns functions that mutate this in-memory state and simulate tx hashes.

### 10.2 Latency & Errors

Mocks **must** simulate:

- Latency: `await new Promise(r => setTimeout(r, 500–1000))`.
- Occasional errors (configurable) for QA of error handling.

### 10.3 Scenarios (nice-to-have, not mandatory in BR#1)

Allow switching scenarios via URL or environment:

- `?scenario=fresh_user`
- `?scenario=styfi_staked`
- `?scenario=styfi_cooldown`
- `?scenario=styfi_max_only`
- `?scenario=ve_migration_ready`
- `?scenario=llyfi_rewards`
- `?scenario=redemption_full`
- `?scenario=facility_closed`

These scenarios define the mock state; used to exercise all branches of the UI.

---

## 11. Epoch & Time Handling

1. Epoch info (`EpochInfo`) is obtained **only from contracts**.
2. UI uses contract timestamps (`epochEnd`, `nextEpochStart`) + `Date.now()` for countdown visuals only.
3. Any mismatch: contract state is authoritative; UI is cosmetic.

---

## 12. Error & Edge Handling

### 12.1 Read Errors (multicall failures)

- Show top-of-page error banner.
- Hide main panels or show skeleton + retry.
- Retry is user-initiated.

### 12.2 Wrong Network

- Detect chain via wagmi’s `useNetwork`.
- Show persistent banner.
- Disable all write actions.

### 12.3 Blacklisted Addresses

- `isBlacklisted` read from relevant contract(s).
- On true:

  - Show explicit “This address is restricted” banner.
  - All write actions disabled.
  - Read-only state remains accessible.

---

## 13. Implementation Roadmap (Phases)

### Phase 0 — (Done) Bootstrap

- Repo created
- Next.js + TS + Tailwind
- wagmi + RainbowKit wired
- `/`, `/styfi`, `/veyfi` stub pages
- `ConnectButton` working

### Phase 1 — Types & Interfaces (NOW)

- Add `/lib/clients/styfi/types.ts` + `client.ts`.
- Add `/lib/clients/veyfi/types.ts` + `client.ts`.
- Align types with `frontend-frd.md` and user stories.

### Phase 2 — `useTx` & Mock Clients (NOW)

- Implement `TxStatus`, `TxState`, and `useTx`.
- Implement `MockStyfiClient` & `MockVeyfiClient` with in-memory state and latency.

### Phase 3 — ProtocolProvider & Hooks

- Add `ProtocolProvider` and wrap it in `RootLayout`.
- Implement initial hooks:

  - `useStyfiAccount`, `useVeyfiAccount`
  - Action hooks using `useTx` and mock clients.

### Phase 4 — UI Primitives & Patterns

- Implement `/ui/components` primitives.
- Build `/styfi` patterns:

  - Account panel, staking panel, cooldown panel, rewards panel, epoch banner.

- Build `/veyfi` patterns:

  - Migration card, LLYFI table, redemption panel, banners.

All wired to mocks.

### Phase 5 — Error/Edge Cases & Polish

- Wrong network handling.
- Blacklist behaviour.
- Loading skeletons, empty states.
- Consistent copy & tooltips.

### Phase 6 — On-chain Clients & Multicall (BLOCKED until ABIs)

- Implement `OnchainStyfiClient` & `OnchainVeyfiClient` using viem/wagmi.
- Use `publicClient.multicall` to populate account states.
- Toggle via `NEXT_PUBLIC_USE_MOCKS`.

### Phase 7 — Final QA & Launch Prep

- End-to-end flows on mocks & testnet / mainnet.
- Performance checks.
- Mobile responsiveness.
- Docs update (`frontend-frd.md`, user stories, this blueprint).

---

## 14. Summary

- `governance-apps` is a single Next.js app hosting both `/styfi` and `/veyfi`.
- All protocol interactions are abstracted behind `StyfiClient` and `VeyfiClient`.
- The transaction lifecycle is centralized in `useTx`.
- BigInt and contract-sourced data are enforced throughout.
- UI is developed against robust mocks first, then bound to real contracts via on-chain clients.

This blueprint is the implementation backbone for BR#1 and must be kept in sync with `frontend-frd.md` and the user story documents.

---

_End of Architecture Blueprint v0.5_
