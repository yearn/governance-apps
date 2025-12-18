# 9. Frontend Architecture

**Version 0.5 — 2025-12-18**
Scope: stYFI • stYFIx • veYFI (UI implementation architecture)
Status: Updated for Phase 5 completion

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
    page.tsx          // veYFI + LLYFI UI (future)
```

---

## 2. Global Header vs Domain Toolbar

### 2.1 Global Header (`app/layout.tsx`)

The Global Header is a **dumb, stable** component containing AppLauncher, Logo, and Wallet Connect.

### 2.2 Domain Controls (Per-Route)

Domain-specific controls live inside the route itself.

For `/styfi`:

- **Protocol Stats Bar:** A universal component for ecosystem health (Supply/Staked).
- **StyfiPositionCard:** The primary controller for Mode selection (stYFI vs stYFIx) and Onboarding.

---

## 3. URL-Driven View State

### 3.1 Mode via Provider (URL Synced)

For stYFI, the **view state** (`styfi` vs `x`) is driven by `StyfiModeProvider`.

### 3.2 LocalStorage (Hints)

- `styfi_onboarded` (boolean) → if missing, open onboarding drawer.
- `styfi-last-mode` (`'styfi' | 'x'`) → hint for last used mode.

Flow:

- First visit (no flag): open drawer.
- Returning: collapse in last-mode hint (or URL).
- Deep link (`?mode=x`): provider sets mode to `x`, marks onboarded, collapses.

---

## 4. SSR/CSR Boundary: `page.tsx` + Client Wrapper

### 4.1 Pattern

Each domain route follows this pattern:

```tsx
// app/styfi/page.tsx (Server Component)
export default async function StyfiPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = normalizeMode(params.mode); // 'styfi' | 'x' | undefined

  return <StyfiPageClient initialMode={mode} />;
}
```

```tsx
// app/styfi/StyfiPageClient.tsx (Client Component)
"use client";

export function StyfiPageClient({
  initialMode,
}: {
  initialMode?: "styfi" | "x";
}) {
  return (
    <StyfiModeProvider initialMode={initialMode}>
      <StyfiPositionCard />
      <StyfiCockpit />
    </StyfiModeProvider>
  );
}
```

**Responsibilities:**

- **Server (page.tsx):**

  - Read `searchParams.mode`.
  - Normalize/validate mode string.
  - Pass mode as `initialMode` prop to client.

- **Client (StyfiPageClient + Provider):**

  - Hydrate from LS (`styfi_onboarded`, `styfi-last-mode`).
  - Sync URL to mode for shareability.
  - Render unified position card (collapsed/expanded) + cockpit.

### 4.2 Avoiding Flicker

The provider hydrates once on the client. The card can render immediately; no hero gating is used. Drawer opens on first visit until mode is chosen.

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
            ├─ [Your Position Card]  (Collapsed/Expanded; owns mode, APR, onboarding)
            └─ [Cockpit]             (StakeManageCard + RewardsCard)
            └─ [Mock Controls]       (Debug widget if usesMockBackend=true)
```

### 5.2 Component Tree (Simplified)

```text
<StyfiPageClient initialMode="styfi" | "x" | undefined>
  <StyfiModeProvider initialMode>
    <StatsBar />                 // Composed directly in StyfiPageClient
    <main>
       <StyfiPositionCard />     // APR logic moved here
       <StyfiCockpit>
         <StakeManageCard />     // Contains StakeTab and UnstakeTab
         <RewardsCard />         // Contains Claim CTA and Earning Power
       </StyfiCockpit>
       {usesMockBackend && <MockControls />}
    </main>
  </StyfiModeProvider>
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
    state/
      StyfiModeProvider.tsx

    components/
      StyfiPositionCard.tsx      (Mode selector + APR display)
      StyfiCockpit.tsx           (Layout for cards)
      MockControls.tsx           (Debug tools & persistence controls)
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

2. `useStyfiStats()` (New)

   - Source: `StyfiClient.getStats`
   - Returns: `totalSupply`, `totalStaked`.

3. `useStyfiApy()` (New)

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
- `YourPositionCard` → `useStyfiAccount`, `useStyfiApy`.
- `RewardsCard` → `useStyfiAccount`, `useStyfiStats` (for Earning Power).
- `StakeTab` → `useStyfiAccount` (wallet balance) + `prepareStake`.
- `UnstakeTab` → `useStyfiAccount` + `useEpoch` + `prepareWithdraw` + `prepareStartCooldown`.

---

## 8. Error States, Skeletons & Loading

### 8.1 Route-Level Loading

We rely primarily on React Query loading states and inline skeletons in cards:

- `YourPositionCard`: skeleton for balance/weight rows.
- `RewardsCard`: skeleton for rows.
- `StakeManageCard`: disabled buttons + skeleton inputs if dependent data missing.

We do **not** block the entire `/styfi` route on a single slow query.

### 8.2 `StyfiPageClient` Loading

`StyfiModeProvider` handles the hydration and "Smart Onboarding" logic:

- On mount, it checks `localStorage` and connected wallet balances.
- If a new user connects with an existing balance, it **immediately** sets the mode and collapses the drawer.
- This bypasses the "New User" drawer animation to prevent layout thrashing for existing users.
- The UI renders the header/stats bar immediately, while the inner content waits for hydration.

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
            ├─ [RedemptionStatusCard] ("Flight Board": Global Caps & Fees)
            ├─ [LlyfiTokenTable]      (The Ledger)
            │    └─ [LlyfiTokenRow]   (Expandable)
            │         └─ [Cockpit]    (Stake | Unstake | Trade)
            └─ [RewardsNavCard]       (Link to stYFI dashboard)
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
      RedemptionStatusCard.tsx   (New "Intelligence" component)

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
    - Used by: `RedemptionStatusCard`, `LlyfiTradeTab` (for validation), `VeyfiStatsBar` (for Fee display).

3.  `useVeyfiStats()` (**New**)

    - Source: `VeyfiClient.getGlobalStats`
    - Returns: `migratedYfi`, `maxBoostMultiplier`, `totalStakedPercent`.
    - Used by: `VeyfiStatsBar`.

4.  `useLlyfiTokens()`
    - Selector on `useVeyfiAccount`.
    - Used by: `LlyfiTokenTable`.

### 9.4 State Management

- **Selection:** Unlike stYFI, there is no global "Mode". The user selects a token by expanding a row. This state is local to `LlyfiTokenTable` (or `LlyfiTokenRow`).
- **Trade Mode:** "Mint" vs "Redeem" state is local to `LlyfiTradeTab`.

---

## 10. Copy Guidelines

- Each route/feature owns a co-located `messages.ts` with an `as const` export named `<feature>Copy` (or `copy` when obvious). Semantic nesting only (`page`, `cta`, `forms`, `errors`, `emptyState`, `status`, `shared`), no flat mega namespaces.
- Shared shell copy (nav, header/footer, generic errors/toasts) lives in `app/_shared/messages.ts`. Do not pull copy into design-system components; they stay label/placeholder agnostic.
- Use functions for interpolation (`positionSummary(amount: string) => string`), not string concatenation inside components.
- Heuristic: avoid inline strings longer than ~60 characters in components unless they are accessibility attributes (`aria-*`, `title`).
- Example:

```ts
// app/styfi/messages.ts
export const styfiCopy = {
  page: {
    title: "Stake YFI and earn protocol rewards",
    subtitle: "Lock YFI to secure governance and share in upside.",
  },
  cta: { primary: "Stake YFI" },
  status: { summary: (amount: string) => `You have ${amount} staked.` },
} as const;
```

```tsx
import { styfiCopy as copy } from "./messages";
<h1>{copy.page.title}</h1>
<p>{copy.status.summary("1,234")}</p>
```

---

## 11. Summary

This frontend architecture:

- Keeps the **Global Header** simple.
- Uses **StatsBar** for high-level ecosystem context.
- Centralizes decision drivers (APR) in the **Position Card**.
- Uses **URL parameters** as canonical view state.
- Separates product behavior (`8-styfi-ui-spec.md`) from implementation details (**this doc**).

This doc should be updated when:

- We change route-level state patterns.
- We introduce shared FE infra that affects multiple domains (e.g. centralized toast system, shared tx drawer, global error boundary).
