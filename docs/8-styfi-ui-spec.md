# stYFI UI Spec v0.4

**Status:** Approved / Ready for Dev
**Applies to:** `styfi.yearn.fi` (and `/styfi` route)
**Last updated:** 2025-11-24

---

## 1. Scope & Purpose

This document defines the **UI and interaction model** for `styfi.yearn.fi`.
It specifically addresses:

- **Mode Selection:** Switching between **stYFI** and **stYFIx**.
- **URL-Driven State:** Using search params for deep-linking (`?mode=...`).
- **Forced Active Choice:** Ensuring users explicitly select a mode before entering.
- **Navigation:** Decoupling domain controls into a dedicated toolbar.
- **Functionality:** Full support for partial staking, partial cooldowns, and dynamic rewards.

---

## 2. Design Principles

1.  **Flat, Single-Surface:** One page, no tabs, no routing complexity.
2.  **URL as Source of Truth:** The view state is determined strictly by the URL query parameter.
3.  **Decoupled Navigation:** The Global Header remains "dumb." Domain-specific controls live in a **Domain Toolbar**.
4.  **Active Choice:** New users (or those with no history) must explicitly select a mode via a Hero Banner.
5.  **Explicit, Safe Interactions:** All write actions (Stake, Cooldown, Withdraw) require explicit inputs.
6.  **Data-Driven:** Labels (token symbols) and Weights are driven by the client, not hardcoded.

---

## 3. Information Architecture

**Route:** `/styfi`

**Page Structure:**

1.  **Global Header** (Standard Yearn Header)
2.  **Domain Toolbar** (Mode Switcher & Balance — _Conditional Visibility_)
3.  **Content Area:**
    - **State A (No Mode selected):** Hero / Mode Selection Banner.
    - **State B (Mode Active):** Cockpit (Two-column dashboard).

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

### 6.2 Domain Toolbar (New)

- **Location:** Rendered inside `/app/styfi/page.tsx`, immediately below the Global Header.
- **Visibility:**
  - **Visible:** If URL has `?mode=styfi` or `?mode=x`.
  - **Hidden:** If URL has no mode (Hero Banner state).
- **Content:**
  - **Mode Switcher:** Toggle pill between `stYFI` and `stYFIx`.
    - _Action:_ Clicking updates URL to `?mode=styfi` or `?mode=x`.
  - **YFI Balance:** Displays user’s _unlocked_ wallet YFI (e.g., "12.50 YFI").

---

## 7. Routing Logic & Persistence

### 7.1 Mode Definitions

- **stYFI:** Voting power retained.
- **stYFIx:** Voting power delegated to YBC.

### 7.2 URL Parameters (Source of Truth)

- `?mode=styfi` → Renders stYFI Dashboard + Toolbar.
- `?mode=x` → Renders stYFIx Dashboard + Toolbar.
- `(No params)` → Triggers "Forced Choice" flow.

### 7.3 Persistence (History)

- We use **LocalStorage** only to remember if a user has visited before to streamline returning visits.
- Key: `styfi-last-mode`
- Value: `'styfi' | 'x'`

### 7.4 The "Forced Choice" Flow (On Load)

**Scenario A: User visits `/styfi` (Clean URL)**

1.  **Check LocalStorage:**
    - If `styfi-last-mode` exists → **Redirect** to `/styfi?mode=[last-mode]`.
    - If **No History** → Render **Hero Selection Banner**.

**Scenario B: User visits `/styfi?mode=x` (Deep Link)**

1.  **Render Dashboard** immediately in `stYFIx` mode.
2.  **Update LocalStorage:** Set `styfi-last-mode = 'x'`.

### 7.5 Hero Selection Banner

- **Purpose:** Force an active choice for new users.
- **Content:** Two large cards side-by-side.
  - **Card A (stYFI):** "Manage Vote. Standard Rewards."
  - **Card B (stYFIx):** "Delegated Vote. Standard Rewards."
- **Action:** Clicking a card:
  1.  Updates URL to `?mode=...`.
  2.  Saves choice to LocalStorage.
  3.  Banner unmounts, Toolbar + Dashboard mounts.

---

## 8. Core Components (Dashboard View)

These components only render when a `mode` is present in the URL.

### 8.1 Your Position Card

**Purpose:** Show live stake state for the _active mode_.
**Data Source:** `useStyfiPosition(mode)`

**Fields:**

- **Title:** `Your stYFI Position` (dynamic based on mode).
- **Staked Amount:** Huge number (e.g., `123.45 stYFI`).
- **Earning Weight:**
  - Display: `1.37x` (Value derived from `StyfiAccountState.earningWeight`).
  - Tooltip: "Your effective earning power based on lock duration and boosters."
- **Cooldown State:**
  - If `cooldown.amount > 0`: Show "X.XX stYFI in cooldown".
  - Tooltip/Subtext: "Available on [Date]".

**Empty State:**

- "No position." / "Stake YFI to start."

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

| User State    | LocalStorage | URL Params   | View                                                           |
| :------------ | :----------- | :----------- | :------------------------------------------------------------- |
| **New User**  | Empty        | Empty        | **Hero Banner** visible. Toolbar Hidden.                       |
| **Returning** | 'stYFI'      | Empty        | **Redirect** to `?mode=styfi`.                                 |
| **Deep Link** | Empty        | `?mode=x`    | **Dashboard (stYFIx)**. Toolbar Visible. Updates LS to 'x'.    |
| **Browsing**  | 'stYFI'      | `?mode=x`    | **Dashboard (stYFIx)**. Toolbar Visible. Updates LS to 'x'.    |
