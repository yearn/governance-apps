# stYFI UI Spec v0.3

**Status:** Approved / Ready for Dev
**Applies to:** `styfi.yearn.fi` (and `/styfi` route)
**Last updated:** 2025-11-24

---

## 1. Scope & Purpose

This document defines the **UI and interaction model** for `styfi.yearn.fi`.
It specifically addresses:

- **Mode Selection:** Switching between **stYFI** and **stYFI+**.
- **Context-Aware Header:** Navigation and mode controls specific to the domain.
- **Staking & Cooldown:** Full support for partial staking and partial cooldowns.
- **Dynamic Rewards:** Rendering reward tokens dynamically based on contract state.

---

## 2. Design Principles

1.  **Flat, Single-Surface:** One page, no tabs, no routing complexity.
2.  **Mode as State:** stYFI and stYFI+ are views of the same account, toggled via state.
3.  **Context-Aware Navigation:** The header adapts to the active domain (`/styfi` vs `/veyfi`).
4.  **Explicit, Safe Interactions:** All write actions (Stake, Cooldown, Withdraw) require explicit inputs.
5.  **Data-Driven:** Labels (like reward tokens) and Weights are driven by the client, not hardcoded.

---

## 3. Information Architecture

**Route:** `/styfi`

**Page Structure:**

1.  **Global Header** (Context-aware: shows Mode Switcher only on this route)
2.  **Hero / Mode Selection Banner** (If first time/no position)
3.  **Cockpit** (Two-column layout)
    - Left: Your Position & Rewards
    - Right: Stake / Manage Panel

---

## 4. Global Layout

### 4.1 Desktop Layout

```text
--------------------------------------------------------------------
| AppLauncher |      [ Mode Switcher ]      | YFI Balance | Wallet |  <-- Header
--------------------------------------------------------------------
|           (Optional) First-Time Mode Selection Banner            |
--------------------------------------------------------------------
|  [ Your Position ]         |                                     |
|                            |         [ Stake / Manage ]          |
|  [ Rewards ]               |                                     |
--------------------------------------------------------------------
```

### 4.2 Mobile Layout

Stacked vertical layout.

```text
[Header (Mode Switcher collapses to icon or dropdown)]
[First-Time Banner (if applicable)]
[Your Position]
[Rewards]
[Stake / Manage]
```

---

## 5. Epoch Integration

The stYFI system runs on 14-day epochs. Users need visibility into timing for cooldowns.

**Placement:**

1.  **Tooltip on "Your Position":**
    - Shows Current Epoch #.
    - Shows Start/End timestamps.
2.  **Stake / Manage (Cooldown Tab):**
    - Dynamic text updating based on current time: "Cooldown initiated now will be available on [Date]."

---

## 6. Header Specification

The `Header` component is shared but context-aware.

### 6.1 Elements

- **Left:** `AppLauncher` (Yearn Ecosystem menu).
- **Center (stYFI Specific):** **Mode Switcher**.
  - **Visibility:** Visible **only** on `/styfi` route. Hidden entirely on `/veyfi`.
  - **UI:** A toggle or pill selector: `stYFI` | `stYFI+`.
  - **Behavior:** Visual state indicates the active mode. Switching modes updates the page content immediately without reloading.
- **Right:**
  - **YFI Balance:** Displays user’s _unlocked_ wallet YFI (e.g., "12.50 YFI").
  - **Wallet Button:** Standard Connect/Account button.

---

## 7. Mode Logic & Persistence

### 7.1 Mode Definitions

- **stYFI:** Voting power retained.
- **stYFI+:** Voting power delegated to YBC. Rewards are identical to stYFI.

### 7.2 Storage

- Use **Zustand** with `persist` middleware to store `styfi-mode-preference`.
- Key: `styfi-mode-preference`
- Values: `'stYFI' | 'stYFI+'`

### 7.3 Auto-Detection (On Load)

1.  **Check Local Storage:** If preference exists, use it.
2.  **If New User (No Preference):**
    - Check on-chain balances.
    - If `stYFI > 0` and `stYFI+ == 0` → Default to **stYFI**.
    - If `stYFI+ > 0` and `stYFI == 0` → Default to **stYFI+**.
    - If both > 0 → Default to the mode with the **larger balance**.
    - If both == 0 → Show **First-Time Mode Selection Banner**.

### 7.4 First-Time Banner

- Appears between Header and Cockpit.
- Two large cards comparing features.
- Clicking a card sets the Mode, saves to Zustand, and collapses the banner.

---

## 8. Core Components

### 8.1 Your Position Card

**Purpose:** Show live stake state for the _active mode_.

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

**Tabs:**

1.  **Stake**
    - **Input:** `AmountInput` (supports specific amounts).
    - **Balance:** User's Wallet YFI.
    - **CTA:** "Approve YFI" -> "Stake".
2.  **Cooldown**
    - **Input:** `AmountInput` (supports **Partial Cooldowns** for both stYFI/stYFI+).
    - **Max Button:** Pre-fills active staked balance.
    - **Info:** "Starts a 14-day cooldown."
    - **CTA:** "Start Cooldown".
3.  **Withdraw**
    - **Display:** Amount available to withdraw (completed cooldowns).
    - **Status:** If cooldown active but not finished, show timer here.
    - **CTA:** "Withdraw YFI".

---

## 9. Technical Amendments (Required for Spec Support)

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
      address: Address; // Added per reviewer feedback
      symbol: string;
      decimals: number;
    }
    ```

3.  **Update Mock Generation:**
    - Populate `earningWeight` (e.g., random between 1.0 and 2.0 or fixed 1.0).
    - Populate `rewardToken` (symbol: "yvUSDS", decimals: 18, address: "0x...").

---

## 10. Copy & Tone

- **Reward Token:** Use the symbol provided by the client (do not hardcode "yvUSDS" in text).
- **Actions:**
  - "Stake" (Entry)
  - "Start Cooldown" (Exit initiation)
  - "Withdraw" (Final exit)
- **Modes:** Strict usage of "stYFI" and "stYFI+".

---

## 11. State Matrix (Revised)

| User State    | LocalStorage    | View                                                                    |
| :------------ | :-------------- | :---------------------------------------------------------------------- |
| **New User**  | Empty           | **Hero Banner** visible. Header toggle neutral or hidden.               |
| **Returning** | 'stYFI'         | Cockpit shows **stYFI** data. Header switch set to stYFI.               |
| **Returning** | 'stYFI+'        | Cockpit shows **stYFI+** data. Header switch set to stYFI+.             |
| **Conflict**  | Empty (cleared) | Auto-detect. Default to **larger balance**. If equal/zero, Hero Banner. |
