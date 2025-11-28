# stYFI UI Spec v0.8

**Status:** Approved / In Development
**Applies to:** `styfi.yearn.fi` (and `/styfi` route)
**Last updated:** 2025-11-28

---

## 1. Scope & Purpose

This document defines the **UI and interaction model** for `styfi.yearn.fi`.
It specifically addresses:

- **Unified Mode Selector:** Single “Your Position” card that owns onboarding (expanded) and dashboard (collapsed) states.
- **Mode State:** Single source of truth via a shared provider + persistence (LS), with URL sync for shareability.
- **Onboarding:** Drawer-based onboarding, no separate page.
- **Functionality:** Full support for partial staking, **linear streaming** cooldowns, and dynamic rewards.
- **Stats & Hierarchy:** Separation of ecosystem health (Total Supply) from decision drivers (APR).

---

## 2. Design Principles

1.  **Flat, Single-Surface:** One page, no tabs, no routing complexity.
2.  **Card-Centric State:** The “Your Position” card controls mode + onboarding. No separate toolbar/hero gating.
3.  **URL-Friendly:** URL may include `?mode=` for deep links but the provider is the source of truth; we sync URL for shareability.
4.  **Soft Onboarding:** First-time users see the card expanded (drawer) until they pick a mode; returning users land collapsed.
5.  **Explicit, Safe Interactions:** All write actions (Stake, Cooldown, Withdraw) require explicit inputs.
6.  **Data-Driven:** Labels (token symbols) and weights are driven by the client, not hardcoded.
7.  **Visual Hierarchy:** Global stats (Supply/Staked) are secondary information; APR is a primary decision driver co-located with action areas.

---

## 3. Information Architecture

**Route:** `/styfi`

**Page Structure:**

1.  **Global Header** (Standard Yearn Header)
2.  **Protocol Stats Bar** (Slim, full-width ecosystem stats)
3.  **Your Position Card** (collapsed/expanded, owns mode, onboarding, and APR display)
4.  **Content Area:** Cockpit (Two-column dashboard)

---

## 4. Global Layout

### 4.1 Desktop Layout

```text
--------------------------------------------------------------------
| AppLauncher |              [ Yearn Logo ]          | Wallet |    <-- Global Header
--------------------------------------------------------------------
| Total Supply: 36k YFI    Staked: 2.5k YFI   Network: Mainnet     | <-- Protocol Stats Bar
--------------------------------------------------------------------
|                                                                  |
|               [ Your Position (APR 84.5% displayed here) ]       |
|                                                                  |
|               [ Cockpit: Stake/Manage | Rewards ]                |
|                                                                  |
--------------------------------------------------------------------
```

### 4.2 Mobile Layout

Stacked vertical layout.

```text
[Global Header]
[Protocol Stats Bar (Wrap allowed)]
[Your Position]
[Cockpit]
   L [Stake / Manage]
   L [Rewards]
```

---

## 5. Epoch Integration

The stYFI system runs on 14-day epochs. Users need visibility into timing for cooldowns.

**Placement:**

1.  **Tooltip on "Your Position":**
    - Shows Current Epoch #.
    - Shows Start/End timestamps.
2.  **Unstake Tab:**
    - Streaming progress shows "Time Remaining" dynamically using contract timestamps.

---

## 6. Navigation Components

### 6.1 Global Header

- **Standard Component:** Uses the shared `Header.tsx`.
- **Behavior:** Dumb component. Does **not** know about stYFI modes. Does not contain the switch.

### 6.2 Protocol Stats Bar

- **Purpose:** Display ecosystem health indicators that provide social proof but do not drive immediate user input.
- **Content:**
  - Total YFI Supply
  - Total YFI Staked
- **Style:** Full-width `neutral-100` strip with `border-b`. Text is `Aeonik Mono` (data-first).

### 6.3 Your Position Card (Unified Selector)

- **Location:** Rendered inside `/app/styfi/StyfiPageClient.tsx`.
- **States:**
  - **Collapsed:** Shows active mode logos, balance summary, and **Current APR** (right-aligned).
  - **Expanded (Drawer):** Shows selection cards with "Variable" vs "Max" APR columns.
- **Interactions:**
  - **Secondary logo:** Quick switch (focusable button, `aria-label`).
  - **Compare modes:** Toggles drawer (`aria-expanded`, `aria-controls`).
  - **Selection cards:** Sets mode, persists LS flags, collapses.
- **Persistence:**
  - `styfi_onboarded`: boolean; if missing → start expanded.
  - `styfi-last-mode`: `"styfi" | "x"`; optional last-mode hint.

---

## 7. Routing Logic & Persistence

### 7.1 Mode Definitions

- **stYFI:** Voting power retained.
- **stYFIx:** Voting power delegated to YBC.

### 7.2 Mode State & Persistence

- **Source of Truth:** `StyfiModeProvider` context.
- **URL:** Synced for shareability/deep links (`?mode=styfi|x`).
- **LocalStorage:** `styfi_onboarded`, `styfi-last-mode`.

---

## 8. Core Components (Dashboard View)

### 8.1 Your Position Card (Selector + Drawer)

**Purpose:** Own mode selection, onboarding, and key decision metrics (APR).

**States:**

1.  **Onboarding (First Visit):**

    - **Header:** Hidden (reduces noise).
    - **Cards:** Both render in "Neutral" state (White background, raised).
    - **Animation:** Cards slide down (staggered). "Recommended" badge pulses.
    - **Interaction:** Clicking a card triggers the "Selected" state -> Header animates in -> Drawer collapses.

2.  **Collapsed (Dashboard):**

    - Standard view for returning users.
    - Shows active mode logos, balance summary, and **Current APR**.

3.  **Expanded (Switching):**
    - Header remains visible.
    - Active mode card appears "Pressed" (Gray background, inner shadow).

**Refinement (v0.8):**
The balance display splits "Active" (earning) vs "Exiting" (idle) funds.

- **Format:** `12.00 YFI` `active (+ 1.50 exiting)`

### 8.2 Rewards Card

**Purpose:** Unified claim panel with visibility into future rewards.
**Data Source:** `useStyfiRewards()`

**Fields:**

1.  **Claimable (CTA):**
    - **Amount:** `claimableGeneric + claimableBoosted`.
    - **CTA:** `Claim [Symbol]`. Disabled if 0.
2.  **Accruing (Info):**
    - **Label:** "Accruing (Next Epoch)"
    - **Amount:** `accruingGeneric + accruingBoosted`.

### 8.3 Stake / Manage Card

**Single card, always visible.**
**Data Source:** `useStyfiPosition(mode)` + `useTx()`.

**Tabs:**

1.  **Stake**

    - **Input:** `AmountInput` (supports specific amounts).
    - **CTA:** "Approve YFI" -> "Stake YFI" (Black button).

2.  **Unstake (Unified)**

    - **Purpose:** Handle the entire exit flow (Monitoring, Withdrawing, and Starting/Resetting).
    - **Visuals:**

      - **Tab Badge:** If streaming, show Spinner. If complete/ready, show Orange Dot.

    - **Section A: Status (Progress Bar)**

      - **Visual:** **Orange** linear progress bar showing Liquid vs. Streaming ratio.
      - **Labels:** "Total Unstaking", "Available", "Streaming (Time Left)".

    - **Section B: Withdraw Action**

      - **Condition:** Only visible if `Liquid > 0`.
      - **Action:** "Withdraw YFI" (Black button).

    - **Section C: Start/Reset Cooldown (Progressive Disclosure)**
      - **Condition:**
        - If NO active cooldown: Input is visible.
        - If ACTIVE cooldown: Input is hidden behind a **"+ Unstake more"** ghost button.
      - **Interaction:** Clicking "+ Unstake more" reveals the input.
      - **Warning:** If user types an amount while streaming is active, warn: _"Adding to cooldown will automatically claim available funds and reset the 14-day timer for the remaining stream."_

---

## 9. Data Architecture

(Unchanged from v0.5 - relies on `useStyfiPosition`, `useStyfiRewards`, `useEpoch`)

---

## 10. Copy & Tone

- **APR Labels:**
  - stYFI: "APR Variable" (indicates work/voting required).
  - stYFIx: "APR Max" (indicates auto-compounding).
- **Stats Bar:** Keep labels short and uppercase (e.g., "TOTAL SUPPLY").
- **Buttons:** "Stake YFI", "Withdraw YFI" (Explicit asset naming).
- **Progress Bar:** Use Yearn Orange (`bg-sunset-600`) to tie to stYFI brand.

---

## 11. State Matrix

| User State    | LocalStorage                              | URL Params   | View                                            |
| :------------ | :---------------------------------------- | :----------- | :---------------------------------------------- | ----------------------------------------- |
| **New User**  | `styfi_onboarded` missing                 | Empty        | **Your Position** expanded (drawer).            |
| **Returning** | `styfi_onboarded` = true, last-mode maybe | Empty        | Collapsed card in last-mode; dashboard renders. |
| **Deep Link** | Any                                       | `?mode=x`    | Provider sets mode to `x`; card collapsed.      |
| **Switching** | `styfi_onboarded` = true                  | `?mode=styfi | x`                                              | Mode switches; LS updated with last-mode. |
