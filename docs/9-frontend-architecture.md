# 9. Frontend Architecture

**Version 0.3 — 2025-11-28**
Scope: stYFI • stYFIx • veYFI (UI implementation architecture)
Status: Approved for Phase 5 (stYFI)

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
       ├─ [Protocol Stats Bar]  (Universal component, ecosystem data)
       └─ Main Container
            ├─ [Your Position Card]  (Collapsed/Expanded; owns mode, APR, onboarding)
            └─ [Cockpit]             (StakeManageCard + RewardsCard)
            └─ [Mock Controls]       (Debug widget if NEXT_PUBLIC_USE_MOCKS=true)
```

### 5.2 Component Tree (Simplified)

```text
<StyfiPageClient initialMode="styfi" | "x" | undefined>
  <StyfiModeProvider initialMode>
    <ProtocolStatsBar />         // Universal UI primitive
    <main>
       <StyfiPositionCard />     // APR logic moved here
       <StyfiCockpit>
         <StakeManageCard />     // Contains StakeTab and UnstakeTab
         <RewardsCard />
       </StyfiCockpit>
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
      ProtocolStatsBar.tsx       (Wrapper around generic StatsBar)
      StyfiPositionCard.tsx      (Mode selector + APR display)
      StyfiCockpit.tsx           (Layout for cards)
      MockControls.tsx           (Debug tools)

      cards/
        RewardsCard.tsx
        StakeManageCard.tsx
        stake/
          StakeTab.tsx
          UnstakeTab.tsx         (Unified Cooldown + Withdraw logic)
```

**Note:** `ProtocolStatsBar` in `app/styfi/components` is just a thin wrapper injecting Styfi-specific data into the shared `StatsBar` UI primitive.

---

## 7. Hooks & Data Dependencies

The blueprint (`4-architecture-blueprint.md`) defines domain hooks at a high level.
Implementation-wise, we follow **granular hooks** per feature:

### 7.1 Hooks for stYFI

Under `/lib/hooks` or `/lib/styfi/hooks` (depending on naming scheme decided in Phase 3):

1. `useStyfiPosition(mode: "stYFI" | "stYFIx")`

   - Source: `StyfiClient.getAccountState`
   - Returns:

     - `stakedBalance`
     - `cooldownAmount`
     - `cooldownEndsAt`
     - `earningWeight`

2. `useStyfiRewards()`

   - Source: `StyfiClient.getAccountState` or specialized rewards call.
   - Returns:

     - `claimableGeneric`
     - `claimableBoosted`
     - `accruingGeneric`
     - `accruingBoosted`
     - `rewardToken { address, symbol, decimals }`

3. `useEpoch()`

   - **Shared hook** (not `/styfi`-specific).
   - Source: shared epoch info client or config.
   - Returns:

     - `currentEpoch`
     - `epochStart`
     - `epochEnd`

4. Transaction flows use:

   - `prepareStake(mode, amount)`
   - `prepareStartCooldown(mode, amount)`
   - `prepareWithdraw(mode)`
   - `prepareClaimRewards()`
   - `useTx()` from `/lib/tx/useTx.ts`

### 7.2 Granularity & Re-renders

Each card/component uses **only the hooks it needs**:

- `YourPositionCard` → `useStyfiPosition(mode)` + `useEpoch()`
- `RewardsCard` → `useStyfiRewards()`
- `StakeTab` → wallet YFI balance + `prepareStake`
- `UnstakeTab` → `useStyfiPosition(mode)` + `useEpoch()` + `prepareWithdraw` + `prepareStartCooldown`

This avoids:

- Monolithic `useStyfiAccountData()` hooks
- Unnecessary re-renders when unrelated data changes
- Complex loading states blocking the whole page

---

## 8. Error States, Skeletons & Loading

### 8.1 Route-Level Loading

We rely primarily on React Query loading states and inline skeletons in cards:

- `YourPositionCard`: skeleton for balance/weight rows.
- `RewardsCard`: skeleton for rows.
- `StakeManageCard`: disabled buttons + skeleton inputs if dependent data missing.

We do **not** block the entire `/styfi` route on a single slow query.

### 8.2 `StyfiPageClient` LS Check

When checking LocalStorage to decide whether to redirect, `StyfiPageClient`:

- Either:

  - Renders `null` until it decides, or
  - Renders a thin skeleton (e.g. a single grey block where the Hero would be).

It should **not** render the Hero and then immediately redirect.

---

## 9. veYFI / LLYFI (Preview for Future Phases)

The same patterns apply to `/veyfi` when we implement it:

- `/veyfi` has its own **Domain Toolbar** (`VeyfiDomainToolbar`).
- View state (e.g. which LLYFI token, which filter) can use:

  - URL search params where it makes sense (shareable views).
  - Local component state or context where state is purely local/temporary.

- Component tree and hooks structure mirror the stYFI approach:

  - Granular, feature-driven hooks.
  - Cards for migration, staking, rewards, redemption.

- The `StatsBar` pattern should be reused for `/veyfi` to show Global Redemption Caps or Total LLYFI Staked.

`4-architecture-blueprint.md` continues to define the **domain model and clients.**
`9-frontend-architecture.md` defines **how we wire routes, components, hooks and URL state**.

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

- We introduce `/veyfi` UI.
- We change route-level state patterns.
- We introduce shared FE infra that affects multiple domains (e.g. centralized toast system, shared tx drawer, global error boundary).
