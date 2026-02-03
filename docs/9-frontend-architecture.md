# 9. Frontend Architecture

**Version 1.0 — 2025-12-20**
Scope: stYFI • stYFIx • veYFI (UI implementation architecture)
Status: Implemented

This document defines the **frontend implementation architecture** for the governance apps under YIP-88.

---

## 1. High-Level Layout

### 1.1 Route Structure (App Router)

We use the Next.js App Router structure:

```text
/app
  layout.tsx          // Root layout with Global Header
  styfi/
    page.tsx          // stYFI + stYFIx UI
  veyfi/
    page.tsx          // veYFI + LLYFI UI
```

---

## 2. Global Header vs Domain Toolbar

### 2.1 Global Header (`app/layout.tsx`)

The Global Header is a **dumb, stable** component containing AppLauncher, Logo, and Wallet Connect.

### 2.2 Domain Controls (Per-Route)

Domain-specific controls live inside the route itself.

For `/styfi`:

- **Protocol Stats Bar:** A universal component for ecosystem health (Supply/Staked).
- **AccountSummary:** Context area that renders ModeComparison (new users) or a positions list (returning users).
- **StyfiCockpit:** StakeManageCard + RewardsCard; always visible.

For `/veyfi`:

- **VeyfiStatsBar:** Displays migration and boost health.

---

## 3. View State (State-Driven)

For stYFI, the **view state** is derived inside `StyfiPageClient` and does not rely on URL params or localStorage.

- `selectedAsset`: `"stYFI" | "stYFIx"`.
- Default selection uses on-chain balances:
  - If `stYFIx` balance > `stYFI` balance → select `stYFIx`.
  - Else if `stYFI` balance > `stYFIx` balance → select `stYFI`.
  - Else → select `stYFIx`.
- `isNewUser = totalBalance === 0`.

---

## 4. SSR/CSR Boundary: `page.tsx` + Client Wrapper

### 4.1 Pattern

Each domain route follows this pattern:

```tsx
// app/styfi/page.tsx (Server Component)
import { StyfiPageClient } from "./StyfiPageClient";

export default function StyfiPage() {
  return <StyfiPageClient />;
}
```

```tsx
// app/styfi/StyfiPageClient.tsx (Client Component)
"use client";

export function StyfiPageClient() {
  return (
    <>
      <StatsBar />
      <AccountSummary />
      <StyfiCockpit />
    </>
  );
}
```

**Responsibilities:**

- **Server (page.tsx):**
  - Render the route shell.
  - Defer all stYFI state to the client.

- **Client (StyfiPageClient):**
  - Derive `selectedAsset` and `isNewUser` from account state.
  - Render AccountSummary + Cockpit without layout thrash.

### 4.2 Avoiding Flicker

State is resolved inside `StyfiPageClient` after account data loads. The summary/cockpit render without a drawer, so the layout stays stable for both new and returning users.

---

## 5. `/styfi` Implementation Architecture

### 5.1 Overview

`/styfi` route UI flow:

```text
/styfi
  ├── Global Header             (from app/layout.tsx)
  └── StyfiPageClient
       ├─ [StatsBar]            (Generic component injected with stYFI data)
       └─ Main Container
            ├─ [AccountSummary]      (ModeComparison or Positions list)
            └─ [Cockpit]             (StakeManageCard + RewardsCard)
            └─ [Mock Controls]       (Debug widget if usesMockBackend=true)
```

Selecting a mode in the AccountSummary hero smooth-scrolls the user to the cockpit for action.

### 5.2 Component Tree (Simplified)

```text
<StyfiPageClient>
  <StatsBar />                   // Composed directly in StyfiPageClient
  <main>
     <AccountSummary />          // ModeComparison or positions list
     <StyfiCockpit>
       <StakeManageCard />       // Contains StakeTab and UnstakeTab
       <RewardsCard />           // Contains Claim CTA and Earning Power
     </StyfiCockpit>
     {usesMockBackend && <MockControls />}
  </main>
</StyfiPageClient>
```

---

## 6. Component & File Structure (stYFI)

### 6.1 Directory Layout

We group components by **feature**:

```text
app/
  styfi/
    page.tsx
    StyfiPageClient.tsx

    components/
      AccountSummary.tsx         (Hero or positions list)
      ModeComparison.tsx         (Shared comparison cards)
      StyfiCockpit.tsx           (Layout for cards)
      MockControls.tsx           (Debug tools)
      types.ts

      cards/
        RewardsCard.tsx
        StakeManageCard.tsx
        stake/
          StakeTab.tsx
          UnstakeTab.tsx         (Unified Cooldown + Withdraw logic)
```

**Note:** `ProtocolStatsBar` was removed. We now compose the shared `StatsBar` directly inside `StyfiPageClient` using data hooks.

---

## 7. Hooks & Data Dependencies

The blueprint (`4-architecture-blueprint.md`) defines domain hooks at a high level.
Implementation-wise, we follow **granular hooks** per feature:

### 7.1 Hooks for stYFI

Under `/lib/hooks/useStyfi.ts`:

1. `useStyfiAccount()`

   - Source: `StyfiClient.getAccountState`
   - Returns: Balances, Cooldowns, Rewards, Allowances.

2. `useStyfiStats()`

   - Source: `StyfiClient.getStats`
   - Returns: `totalSupply`, `totalStaked`.
   - Global data is fetched via `/api/global-data` proxy in the browser to avoid CORS.

3. `useStyfiApy()`

   - Source: `StyfiClient.getApy`
   - Returns: Protocol APY in basis points.

4. `useEpoch()`

   - **Shared hook** (not `/styfi`-specific).
   - Source: shared epoch info client or config.
   - Returns: `currentEpoch`, `epochStart`, `epochEnd`.

5. Transaction flows use:
   - `prepareStake`, `prepareStartCooldown`, `prepareWithdraw`, `prepareClaimRewards`
   - `useTx()` from `/lib/tx/useTx.ts`

### 7.2 Granularity & Re-renders

Each card/component uses **only the hooks it needs**:

- `StyfiPageClient` → `useStyfiStats`, `useStyfiApy` (for StatsBar).
- `AccountSummary` → `useStyfiAccount`.
- `RewardsCard` → `useStyfiAccount`, `useStyfiStats` (for Earning Power).
- `StakeTab` → `useStyfiAccount` (wallet balance) + `prepareStake`.
- `UnstakeTab` → `useStyfiAccount` + `useEpoch` + `prepareWithdraw` + `prepareStartCooldown`.

---

## 8. Error States, Skeletons & Loading

### 8.1 Route-Level Loading

We rely primarily on React Query loading states and inline skeletons in cards:

- `AccountSummary`: placeholder rows for balances when needed.
- `RewardsCard`: skeleton for rows.
- `StakeManageCard`: disabled buttons + skeleton inputs if dependent data missing.

We do **not** block the entire `/styfi` route on a single slow query.

### 8.2 `StyfiPageClient` Loading

`StyfiPageClient` derives view state from account data:

- On mount, it compares `stYFI` vs `stYFIx` balances to pick a default asset.
- `isNewUser` is derived from total balance and controls the AccountSummary view.
- The UI renders the header/stats bar immediately and keeps layout stable for all users.
- When a wallet is connected, the stats bar may prefer on-chain reads for fresher totals after transactions.

---

## 9. `/veyfi` Implementation Architecture

### 9.1 Overview

`/veyfi` follows a **Registry** pattern (vertical list of assets) rather than a Dashboard pattern.

```text
/veyfi
  ├── Global Header
  └── VeyfiPageClient
       ├─ [VeyfiStatsBar]       (Ecosystem health: Migration %, Boost, Staked %)
       └─ Main Container
            ├─ [MigrationCard]        (Conditionally visible: Action vs Info)
            ├─ [LlyfiTokenTable]      (The Ledger)
            │    └─ [LlyfiTokenRow]   (Expandable)
            │         └─ [Cockpit]    (Stake | Unstake | Trade)
            ├─ [InventoryCard]        (Global Redemption Intelligence)
            └─ [VeyfiRewardsCard]     (Nav to stYFI)
```

### 9.2 Component Tree & Directory Structure

```text
app/
  veyfi/
    page.tsx
    VeyfiPageClient.tsx
    messages.ts

    components/
      VeyfiStatsBar.tsx
      VeyfiCockpit.tsx           (Layout wrapper)

      MigrationCard.tsx
      InventoryCard.tsx          (Redemption/Inventory status)

      LlyfiTokenTable.tsx
      LlyfiTokenRow.tsx
      LlyfiRowCockpit.tsx        (Tabs wrapper)

      VeyfiRewardsCard.tsx       (Nav to stYFI)

      tabs/
        LlyfiStakeTab.tsx
        LlyfiUnstakeTab.tsx
        LlyfiTradeTab.tsx        (Mint / Redeem logic)
```

### 9.3 Hooks & Data Dependencies

We follow the same granular hook pattern as stYFI.

Under `/lib/hooks/useVeyfi.ts`:

1.  `useVeyfiAccount()`

    - Returns: `veYfi` migration state, `redemptionCaps`, `llyfiTokens` (user balances).
    - Used by: `MigrationCard`, `LlyfiTokenTable`, `LlyfiTokenRow`.

2.  `useRedemptionCaps()`

    - Selector on `useVeyfiAccount`.
    - Used by: `InventoryCard`, `LlyfiTradeTab` (for validation), `VeyfiStatsBar` (for Fee display).

3.  `useVeyfiStats()`

    - Source: `VeyfiClient.getGlobalStats`
    - Returns: `migratedYfi`, `maxBoostMultiplier`, `totalStakedPercent`.
    - Used by: `VeyfiStatsBar`.

4.  `useLlyfiTokens()`
    - Selector on `useVeyfiAccount`.
    - Used by: `LlyfiTokenTable`.

### 9.4 State Management

- **Selection:** Unlike stYFI, there is no global "Mode". The user selects a token by expanding a row. This state is local to `LlyfiTokenTable` (or `LlyfiTokenRow`).
- **Trade Mode:** "Buy" vs "Sell" state is local to `LlyfiTradeTab`.

---

## 10. Copy Guidelines

- Each route/feature owns a co-located `messages.ts`.
- Exports follow `<feature>Copy` (or `copy` when obvious).
- Design system/shared components stay copy-agnostic.

---

## 11. Summary

This frontend architecture:

- Keeps the **Global Header** simple.
- Uses **StatsBar** for high-level ecosystem context.
- Centralizes mode education in **AccountSummary + ModeComparison**.
- Uses **client state** as the canonical view state.
- Implements `/veyfi` as a **Registry** with nested **Cockpit** actions.

---

**End of `frontend-architecture.md`**
