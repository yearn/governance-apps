# stYFI UI Spec v0.5

**Status:** Approved / Ready for Dev
**Applies to:** `styfi.yearn.fi` (and `/styfi` route)
**Last updated:** 2025-11-25

---

## 1. Scope & Purpose

This document defines the **UI and interaction model** for `styfi.yearn.fi`.
It specifically addresses:

- **Unified Mode Selector:** Single “Your Position” card that owns onboarding (expanded) and dashboard (collapsed) states.
- **Mode State:** Single source of truth via a shared provider + persistence (LS), with URL sync for shareability.
- **Onboarding:** Drawer-based onboarding, no separate page.
- **Functionality:** Full support for partial staking, partial cooldowns, and dynamic rewards.

---

## 2. Design Principles

1.  **Flat, Single-Surface:** One page, no tabs, no routing complexity.
2.  **Card-Centric State:** The “Your Position” card controls mode + onboarding. No separate toolbar/hero gating.
3.  **URL-Friendly:** URL may include `?mode=` for deep links but the provider is the source of truth; we sync URL for shareability.
4.  **Soft Onboarding:** First-time users see the card expanded (drawer) until they pick a mode; returning users land collapsed.
5.  **Explicit, Safe Interactions:** All write actions (Stake, Cooldown, Withdraw) require explicit inputs.
6.  **Data-Driven:** Labels (token symbols) and weights are driven by the client, not hardcoded.

---

## 3. Information Architecture

**Route:** `/styfi`

**Page Structure:**

1.  **Global Header** (Standard Yearn Header)
2.  **Your Position Card** (collapsed/expanded, owns mode and onboarding)
3.  **Content Area:** Cockpit (Two-column dashboard)

---

## 4. Global Layout

### 4.1 Desktop Layout

```text
--------------------------------------------------------------------
| AppLauncher |              [ Yearn Logo ]          | Wallet |    <-- Global Header
--------------------------------------------------------------------
|      [ stYFI  |  stYFIx ]                  [ Unlocked YFI: 12.5 ]| <-- Domain Toolbar
--------------------------------------------------------------------
|                                                                  |
|               [ Hero Banner OR Two-Column Cockpit ]              |
|                                                                  |
--------------------------------------------------------------------
```

### 4.2 Mobile Layout

Stacked vertical layout.

```text
[Global Header]
[Domain Toolbar (Sticky or Scrollable)]
[Hero Banner OR Cockpit]
   L [Your Position]
   L [Rewards]
   L [Stake / Manage]
```

---

## 5. Epoch Integration

The stYFI system runs on 14-day epochs. Users need visibility into timing for cooldowns.

**Placement:**

1.  **Tooltip on "Your Position":**
    - Shows Current Epoch #.
    - Shows Start/End timestamps (e.g., "Epoch 4 ends Nov 24, 12:00 UTC").
2.  **Stake / Manage (Cooldown Tab):**
    - Dynamic text updating based on current time: "Cooldown initiated now will be available on [Date]."

---

## 6. Navigation Components

### 6.1 Global Header

- **Standard Component:** Uses the shared `Header.tsx`.
- **Behavior:** Dumb component. Does **not** know about stYFI modes. Does not contain the switch.

### 6.2 Your Position Card (Unified Selector)

- **Location:** Rendered inside `/app/styfi/StyfiPageClient.tsx`, directly under the Global Header.
- **States:**
  - **Collapsed:** Shows active mode logos (primary + secondary), balance summary, “Compare modes” toggle.
  - **Expanded (Drawer):** Shows two selection cards, explainer copy; selecting sets mode, marks onboarded, collapses.
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

- **Source of Truth:** `StyfiModeProvider` context (shared in `/app/styfi/state/StyfiModeProvider.tsx`).
- **URL:** Synced for shareability/deep links (`?mode=styfi|x`), but the provider drives the UI.
- **LocalStorage:**
  - `styfi_onboarded`: `"true"` when user has closed onboarding.
  - `styfi-last-mode`: optional last mode hint.

### 7.3 Onboarding Flow

- **First visit (no `styfi_onboarded`):** “Your Position” drawer is expanded; user must pick a mode.
- **Returning (flag present):** Card starts collapsed in last mode (from URL or LS).
- **Selection:** Sets mode, marks onboarded, collapses drawer.

---

## 8. Core Components (Dashboard View)

These components render once mode is resolved by the provider (initially from URL/LS). Once resolved, the provider also persists `styfi-last-mode` as a hint for future loads.

### 8.1 Your Position Card (Selector + Drawer)

**Purpose:** Own mode selection and onboarding, plus surface balance summary.
**State:**

- **Collapsed (Dashboard header):**
  - Primary logo (active) + secondary logo (quick switch).
  - Balance summary: `X YFI in stYFI|stYFIx`.
  - “Compare modes” toggle (expands drawer).
- **Expanded (Onboarding/Drawer):**
  - Explainer text.
  - Two selection cards; active card visually highlighted.
  - Selecting a card sets mode, marks onboarded, collapses.

**Accessibility:**
- Toggle has `aria-expanded`, `aria-controls`.
- Secondary logo has `aria-label="Switch to …"`.
- Selection cards are focusable buttons; focus moves into drawer on open.

### 8.2 Rewards Card

**Purpose:** Unified claim panel with visibility into future rewards.
**Data Source:** `useStyfiRewards()`

**Fields:**

1.  **Claimable (CTA):**
    - **Amount:** `claimableGeneric + claimableBoosted`.
    - **Token Label:** **Dynamic**. Read symbol from account state (e.g., "yvUSDS").
    - **CTA:** `Claim [Symbol]`. Disabled if 0.
2.  **Accruing (Info):**
    - **Label:** "Accruing (Next Epoch)"
    - **Amount:** `accruingGeneric + accruingBoosted`.
    - **Purpose:** Shows users that yield is generating even if not yet claimable.

### 8.3 Stake / Manage Card

**Single card, always visible.**
**Data Source:** `useStyfiPosition(mode)` + `useTx()`.

**Tabs:**

1.  **Stake**
    - **Input:** `AmountInput` (supports specific amounts).
    - **Balance:** User's Wallet YFI.
    - **CTA:** "Approve YFI" -> "Stake".
2.  **Cooldown**
    - **Input:** `AmountInput` (supports **Partial Cooldowns** for both stYFI/stYFIx).
    - **Max Button:** Pre-fills active staked balance.
    - **Info:** "Starts a 14-day cooldown."
    - **CTA:** "Start Cooldown".
3.  **Withdraw**
    - **Display:** Amount available to withdraw (completed cooldowns).
    - **Status:** If cooldown active but not finished, show timer here.
    - **CTA:** "Withdraw YFI".

---

## 9. Data Architecture (Granular Hooks)

We implement granular hooks for performance and component decoupling.

1.  **`useStyfiPosition(mode: 'stYFI' | 'stYFIx')`**

    - Returns: `stakedBalance`, `cooldownState`, `earningWeight`.
    - Uses: `StyfiClient.getAccountState`.

2.  **`useStyfiRewards()`**

    - Returns: `claimable`, `accruing`, `rewardToken { symbol, address, decimals }`.
    - _Note:_ Rewards are technically unified on the account, but this hook provides a clean interface for the Rewards Card.

3.  **`useEpoch()`**
    - Returns: `currentEpoch`, `timestamps`.

---

## 10. Technical Amendments (Required for Spec Support)

To support this UI, the following updates are required in `lib/clients/styfi/types.ts` and `mock.ts`:

1.  **Add Earning Weight:**

    ```typescript
    // In StyfiAccountState
    earningWeight: bigint; // Scaled 1e18 (e.g. 1.5 * 1e18)
    ```

2.  **Add Dynamic Reward Token Info:**

    ```typescript
    // In StyfiAccountState
    rewardToken: {
      address: Address;
      symbol: string;
      decimals: number;
    }
    ```

3.  **Update Mock Generation:**
    - Populate `earningWeight` (e.g., random between 1.0 and 2.0 or fixed 1.0).
    - Populate `rewardToken` (symbol: "yvUSDS", decimals: 18, address: "0x...").

---

## 11. Copy & Tone

- **Reward Token:** Use the symbol provided by the client (do not hardcode "yvUSDS" in text).
- **Actions:**
  - "Stake" (Entry)
  - "Start Cooldown" (Exit initiation)
  - "Withdraw" (Final exit)
- **Modes:** Strict usage of "stYFI" and "stYFIx".
- **Hero Banner:** Clear value prop difference ("Manage Vote" vs "Delegated Vote").

---

## 12. State Matrix

| User State    | LocalStorage                              | URL Params   | View                                             |
| :------------ | :---------------------------------------- | :----------- | :----------------------------------------------- |
| **New User**  | `styfi_onboarded` missing                 | Empty        | **Your Position** expanded (drawer).             |
| **Returning** | `styfi_onboarded` = true, last-mode maybe | Empty        | Collapsed card in last-mode; dashboard renders.  |
| **Deep Link** | Any                                       | `?mode=x`    | Provider sets mode to `x`; card collapsed; dashboard renders. |
| **Switching** | `styfi_onboarded` = true                  | `?mode=styfi|x` | Mode switches; LS updated with last-mode.        |
