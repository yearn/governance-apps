# 9. Frontend Architecture

**Version 0.1 — 2025-11-24**
Scope: stYFI • stYFIx • veYFI (UI implementation architecture)
Status: Approved for Phase 5 (stYFI) and future veYFI work

This document defines the **frontend implementation architecture** for the governance apps under YIP-88.
It sits **under** `4-architecture-blueprint.md` and describes:

- How routes are structured (`/styfi`, `/veyfi`)
- How we use **URL-driven view state**
- How we separate **Global Header** vs **Domain Toolbar**
- Component tree patterns
- Hooks layout and SSR/CSR boundaries

It is intentionally implementation-focused and complements:

- `0-normative-spec-yip88.md`
- `1-user-stories-styfi.md`
- `2-user-stories-veyfi.md`
- `3-frontend-frd.md`
- `4-architecture-blueprint.md`
- `8-styfi-ui-spec.md`

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

Principles:

- **Root layout** is shared.
- Each domain (`/styfi`, `/veyfi`) owns its _own_ UI composition.
- Cross-domain logic (clients, hooks, tx) lives under `/lib`.

---

## 2. Global Header vs Domain Toolbar

### 2.1 Global Header (`app/layout.tsx`)

The Global Header is a **dumb, stable** component:

- Contains:

  - AppLauncher (Yearn ecosystem)
  - Yearn logo / title
  - Wallet connect/account control

- **Does not know** about:

  - stYFI / stYFIx mode
  - veYFI-specific actions
  - Domain-specific state

This avoids coupling global navigation to domain details and keeps header changes rare and deliberate.

### 2.2 Domain Toolbar (Per-Route)

Domain-specific controls live in a **Toolbar** rendered inside the route.

For `/styfi`:

- Component: `StyfiDomainToolbar`
- Rendered **under** the Global Header, inside `app/styfi/page.tsx` (or its client wrapper).
- Contains:

  - stYFI / stYFIx **Mode Switcher** (when mode is active)
  - **Unlocked YFI balance** pill

For `/veyfi` (future):

- A separate toolbar (`VeyfiDomainToolbar`) will host veYFI/LLYFI domain controls (filters, token selectors, etc.).

**Rule:**
Global Header stays generic.
Each domain owns its Toolbar and layout.

---

## 3. URL-Driven View State

### 3.1 Mode as URL, not Global State

For stYFI, the **view state** (`stYFI` vs `stYFIx`) is driven by the URL query parameter:

- `/styfi?mode=styfi` → stYFI mode
- `/styfi?mode=x` → stYFIx mode

**The URL is the source of truth.**

We explicitly avoid:

- Storing mode in Zustand or other global UI state as the primary source.
- Mode-based SSR hydration mismatches.

This makes views:

- Shareable (`/styfi?mode=x` can be sent to someone)
- Deterministic (server knows mode from `searchParams`)
- Back-button friendly (browser history contains view state)

### 3.2 LocalStorage (Optional Hint, Not Authority)

We use LocalStorage only as a **hint** for returning users:

- Key: `styfi-last-mode`
- Values: `'styfi' | 'x'`
- On `/styfi` with **no** `mode` param:

  - If `styfi-last-mode` exists → redirect to `/styfi?mode=[last-mode]`.
  - If not → show Hero Banner (forced choice).

Once a `mode` is present in the URL:

- The dashboard renders in that mode.
- We update `styfi-last-mode` accordingly.

**Rule:**
LocalStorage is never the source of view truth; the **URL is**.

---

## 4. SSR/CSR Boundary: `page.tsx` + Client Wrapper

### 4.1 Pattern

Each domain route follows this pattern:

```tsx
// app/styfi/page.tsx (Server Component)
export default function StyfiPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const mode = normalizeMode(searchParams.mode); // 'styfi' | 'x' | undefined

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
  // LocalStorage check + redirect if needed
  // Decide between Hero vs Cockpit
}
```

**Responsibilities:**

- **Server (page.tsx):**

  - Read `searchParams.mode`.
  - Normalize/validate mode string.
  - Pass mode as `initialMode` prop to client.

- **Client (StyfiPageClient):**

  - Perform LocalStorage check.
  - If no URL mode and LS has last-mode → `router.replace("/styfi?mode=...")`.
  - If URL mode present → render Toolbar + Cockpit.
  - If no URL mode and no LS → render Hero Banner.

### 4.2 Avoiding Flicker

When `StyfiPageClient` is deciding whether to redirect based on LocalStorage:

- While checking LS, it may temporarily render nothing (`return null`) or a lightweight skeleton.
- The Hero Banner should only be rendered when we know that:

  - No URL mode, and
  - No prior mode saved.

This avoids a brief flash of the Hero for returning users before redirect.

---

## 5. `/styfi` Implementation Architecture

### 5.1 Overview

`/styfi` route UI flow:

```text
/styfi
  ├── Global Header             (from app/layout.tsx)
  └── StyfiPageClient
       ├─ [Hero Banner]         (if no mode)
       └─ [Domain Toolbar + Cockpit] (if mode active)
```

### 5.2 Component Tree (Simplified)

#### State A: No mode (`/styfi`, no history)

```text
<StyfiPageClient initialMode={undefined}>
  <StyfiHeroLayout>
    <StyfiHeroBanner>
      <StyfiModeCard mode="styfi" />
      <StyfiModeCard mode="x" />
    </StyfiHeroBanner>
  </StyfiHeroLayout>
</StyfiPageClient>
```

#### State B: Mode active (`/styfi?mode=styfi|x` OR after Hero selection)

```text
<StyfiPageClient initialMode="styfi" | "x">
  <StyfiLayout>
    <StyfiDomainToolbar mode>
      <StyfiModeSwitcher mode />        // updates URL ?mode=...
      <UnlockedYfiBalancePill />        // shows wallet YFI
    </StyfiDomainToolbar>

    <StyfiCockpit mode>
      <StyfiTwoColumnGrid>
        <StyfiLeftColumn>
          <YourPositionCard mode />
          <RewardsCard />
        </StyfiLeftColumn>

        <StyfiRightColumn>
          <StakeManageCard mode>
            <StakeTabs>
              <StakeTabStake mode />
              <StakeTabCooldown mode />
              <StakeTabWithdraw mode />
            </StakeTabs>
          </StakeManageCard>
        </StyfiRightColumn>
      </StyfiTwoColumnGrid>
    </StyfiCockpit>
  </StyfiLayout>
</StyfiPageClient>
```

---

## 6. Component & File Structure (stYFI)

### 6.1 Directory Layout

We group components by **feature** (hero, toolbar, cards) rather than by raw technical type:

```text
app/
  styfi/
    page.tsx
    StyfiPageClient.tsx

    components/
      StyfiHero.tsx               // layout + banner + mode cards
      StyfiDomainToolbar.tsx      // mode switcher + YFI balance
      StyfiCockpit.tsx            // outer layout + 2-column grid

      cards/
        YourPositionCard.tsx
        RewardsCard.tsx
        StakeManageCard.tsx
        stake/
          StakeTabs.tsx
          StakeTabStake.tsx
          StakeTabCooldown.tsx
          StakeTabWithdraw.tsx
```

Notes:

- `StyfiHero.tsx` can export both `StyfiHeroLayout` and `StyfiHeroBanner` if needed.
- `StyfiCockpit.tsx` can contain the simple 2-column layout logic, no need for separate `LeftColumn/RightColumn` files unless they grow.

This strikes a balance between clarity and avoiding folder sprawl.

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
- `StakeTabStake` → wallet YFI balance + `prepareStake`
- `StakeTabCooldown` → `useStyfiPosition(mode)` + `useEpoch()`
- `StakeTabWithdraw` → `useStyfiPosition(mode)`

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

`4-architecture-blueprint.md` continues to define the **domain model and clients.**
`9-frontend-architecture.md` defines **how we wire routes, components, hooks and URL state**.

---

## 10. Summary

This frontend architecture:

- Keeps the **Global Header** simple and domain-agnostic.
- Uses **URL parameters as the canonical view state** for sharable, deterministic pages.
- Encapsulates domain-specific controls in **Domain Toolbars**.
- Implements `/styfi` with a clear **Hero vs Cockpit** state machine.
- Structures components by **feature** (Hero, Toolbar, Cards) with a clean tree.
- Uses **granular hooks** instead of monolithic “view model” hooks.
- Cleanly separates:

  - Product behavior (`8-styfi-ui-spec.md`)
  - Domain architecture (`4-architecture-blueprint.md`)
  - Implementation details (**this doc**).

This doc should be updated when:

- We introduce `/veyfi` UI.
- We change route-level state patterns.
- We introduce shared FE infra that affects multiple domains (e.g. centralized toast system, shared tx drawer, global error boundary).
