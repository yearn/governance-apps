# stYFI UI Spec v0.9

**Status:** Approved / In Development
**Applies to:** `styfi.yearn.fi` (and `/styfi` route)
**Last updated:** 2025-12-17

---

## 1. Scope & Purpose

This document defines the **UI and interaction model** for `styfi.yearn.fi`.
It specifically addresses:

- **Unified Mode Selector:** Single “Your Position” card that owns onboarding (expanded) and dashboard (collapsed) states.
- **Smart Onboarding:** Logic to skip manual selection if the user already has a position.
- **Functionality:** Full support for partial staking, **linear streaming** cooldowns, and dynamic rewards.
- **Stats & Hierarchy:** Separation of ecosystem health (Total Supply) from decision drivers (APR).

---

## 2. Design Principles

1.  **Flat, Single-Surface:** One page, no tabs, no routing complexity.
2.  **Card-Centric State:** The “Your Position” card controls mode + onboarding.
3.  **Smart Defaults:** If a user connects with existing stYFI or stYFIx, we auto-select that mode.
4.  **Explicit, Safe Interactions:** All write actions (Stake, Cooldown, Withdraw) require explicit inputs.
5.  **Visual Hierarchy:** Global stats are secondary; APR is a primary decision driver.

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
| Supply: 36k YFI   Staked: 2.5k (7.1%)   APR: 68.4%   State: Live | <-- Protocol Stats Bar
--------------------------------------------------------------------
|                                                                  |
|               [ Your Position (Balance Summary) ]                |
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
- **Content:** App Launcher, Logo, Epoch Countdown, Wallet Button. (YFI Balance pill removed to reduce noise).

### 6.2 Protocol Stats Bar

- **Purpose:** Display ecosystem health and yield metrics.
- **Content:**
  - **Total Supply:** Global YFI supply.
  - **Staked:** Total YFI staked (stYFI + stYFIx) + percentage of supply.
  - **APR:** Current dynamic protocol APY.
  - **State:** Current system phase (e.g., "Staking live").
- **Style:** Full-width `neutral-100` strip with `border-b`. Text is `Aeonik Mono` (data-first).

### 6.3 Your Position Card (Unified Selector)

- **States:**
  - **Collapsed:** Shows active mode logos and balance summary.
  - **Expanded (Drawer):** Shows selection cards with "Variable" vs "Max" APR columns.
- **Persistence:**
  - `styfi_onboarded`: boolean.
  - `styfi-last-mode`: `'styfi' | 'x'`.
- **Smart Onboarding:**
  - If `styfi_onboarded` is false, but connected wallet has `> 0` stYFI or stYFIx:
    - Automatically set mode to the one with higher balance.
    - Mark `onboarded = true`.
    - Skip drawer animation.

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

**Purpose:** Own mode selection, onboarding, and balance display.

**Balance Logic:**
The display splits "Active" (earning) vs "Exiting" (idle or unlocking) funds.

- **Active:** Funds currently staked and earning rewards.
- **Exiting:** Funds in cooldown (streaming).
- **Exited:** Funds fully unlocked (liquid) but not yet withdrawn.

**Format:**

- `12.00 YFI` `Active (+ 1.50 exiting)` (Stream active)
- `12.00 YFI` `Active (+ 1.50 exited)` (Stream complete/liquid)

### 8.2 Rewards Card

**Purpose:** Unified claim panel.

**Fields:**

1.  **Claimable (CTA):**
    - **Amount:** `claimableGeneric + claimableBoosted`.
    - **CTA:** `Claim Rewards`. Disabled if 0.
2.  **Earning Power (Footer):**
    - **Label:** "Earning Power"
    - **Value:** User's share of the total staking pool (User Active / Global Total).
    - **Tooltip:** Explains that yield share depends on this ratio.

_Note: "Accruing Rewards" was removed to simplify the dashboard._

### 8.3 Stake / Manage Card

**Single card, always visible.**

**Tabs:**

1.  **Stake**

    - **Input:** `AmountInput`.
    - **CTA:** "Approve YFI" -> "Stake YFI".

2.  **Unstake (Unified)**
    - **Visuals:**
      - **Tab Badge:** Hollow dot (Streaming) vs Solid dot (Ready).
    - **Section A: Status (Progress Bar)**
      - **Visual:** Orange linear progress bar.
    - **Section B: Withdraw Action**
      - **Condition:** Visible if `Liquid > 0`.
      - **Action:** "Withdraw YFI".
    - **Section C: Start/Reset Cooldown**
      - **Condition:** Hidden behind "+ Unstake more" ghost button if stream is active.
      - **Warning:** explicitly warns about timer reset and auto-claim of liquid funds.

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

| User State    | On-Chain Balance | View                                            |
| :------------ | :--------------- | :---------------------------------------------- |
| **New User**  | 0                | **Your Position** expanded (drawer).            |
| **Smart New** | > 0              | Auto-selects mode with balance; Card collapsed. |
| **Returning** | Any              | Collapsed card in last-mode.                    |
| **Deep Link** | Any              | Provider sets mode from URL; Card collapsed.    |
