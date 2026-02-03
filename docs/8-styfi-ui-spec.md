# stYFI UI Spec v3.1

**Status:** Final
**Applies to:** `styfi.yearn.fi` (and `/styfi` route)
**Last updated:** 2026-01-20

---

## 1. Scope & Purpose

This document defines the **UI and interaction model** for `styfi.yearn.fi`.
It specifically addresses:

- **State-driven dashboard:** One flat surface that unifies education and utility.
- **Account Summary split:** New users see mode education; returning users see positions.
- **Always-visible cockpit:** Stake/Unstake is always available; no layout thrashing.
- **Clear cooldown semantics:** Explicit Unstaking, Withdrawable, and safety copy.

---

## 2. Core Architecture

### 2.1 State Management (Single Page Client)
- **Location:** `app/styfi/StyfiPageClient.tsx`
- **State:** `selectedAsset` (`"stYFI" | "stYFIx"`)
- **Default selection logic (on mount):**
  1. Fetch account state.
  2. If `stYFIx` balance > `stYFI` balance → select `stYFIx`.
  3. Else if `stYFI` balance > `stYFIx` balance → select `stYFI`.
  4. Else (both 0) → select `stYFIx` (default/recommended).
- **Derived:** `isNewUser = totalBalance === 0`.

### 2.2 Data Flow
- `StyfiPageClient` derives `selectedAsset` and `isNewUser`.
- `AccountSummary` receives `isNewUser` + balances.
- `StyfiCockpit` receives `selectedAsset`, `onSelectAsset`, and `isNewUser`.

---

## 3. Page Structure

1. **Global Header** (standard Yearn header)
2. **Protocol Stats Bar** (Total Supply, Staked, APR, State; show **“Epoch 1 APR”** when current epoch == 0 from the canonical clock). **Staked** should use `styfi.staked` (excludes cooldown balances; `styfi.unstaking` is the cooldown amount).
3. **AccountSummary** (Hero for new users, positions list for returning users)
4. **Cockpit** (StakeManageCard + Rewards)

---

## 4. AccountSummary

### 4.1 New User (Hero)
- Inline `<ModeComparison />` grid.
- Cards act as a selector for the cockpit.
- Selected card shows an active border in brand color.
- Selecting a card **smooth-scrolls** the user to the cockpit.

### 4.2 Loading State
- If connected and account data is loading, show a compact skeleton row.
- Hero is only shown once balances are loaded and total is zero.

### 4.3 Returning User (Positions)
- Read-only list of active positions.
- Render `stYFI` row if balance > 0.
- Render `stYFIx` row if balance > 0.
- Dense horizontal layout to avoid dead space.

**Row Layout:**
- **Icon:** Asset logo
- **Name:** `stYFI` or `stYFIx`
- **Balance:** `{amount} Active`
- **Status:** `{amount} Unstaking` (grey, hide when 0)
- **Actionable:** `{amount} Withdrawable` (brand color / high contrast, hide when 0)
- **Note:** Do **not** use green for withdrawable.

---

## 5. ModeComparison (Shared)

- **Layout:** Grid (2 columns desktop, stacked mobile).
- **stYFI card:**
  - Badge: "Variable APY"
  - Description: "Standard staking. You retain voting rights. Governance participation required for max yield."
- **stYFIx card:**
  - Badge: "Maximized APY" + "Recommended" (brand blue)
  - Description: "Auto-delegated vault. Voting power is assigned to YBC to maximize rewards automatically."
- **Interaction:** Cards function as buttons to call `onSelectAsset`.

---

## 6. StakeManageCard (Control Panel)

Always visible and owns all write interactions.

### 6.1 Header
- **Segmented toggle:** `[ stYFI | stYFIx ]` bound to `selectedAsset`.
- **Compare modes:** Text link opens a modal with `<ModeComparison />`.

### 6.2 Context Banner
- **stYFI:** "You are managing standard stYFI. You must vote manually."
- **stYFIx:** "You are managing stYFIx. Voting is delegated for passive yield."

### 6.3 Tabs
- **Variant:** Line tabs (text + underline) to differentiate action from scope.
- **Stake:** Approve → Stake flow. Input unit: YFI.
- **Unstake:** Refactored flow (below).

### 6.4 Rewards Card (Yield & Rewards)
- **Title:** "Yield & Rewards".
- **Layout:** Two stacked sections for clarity on small screens.
  - **Top (Context):**
    - **Current APR** with tooltip: "Annualized rate based on the previous epoch's performance."
    - **Reward Token** label with tooltip: "Rewards are paid in {symbol}, which earns its own yield automatically."
    - Show reward token symbol and an APY badge (success variant) when available.
    - Optional sublabel: "Auto-compounding vault".
  - **Bottom (Payout Zone):**
    - **Available to claim** label.
    - Large claimable amount (USD) with a smaller token value beneath (include symbol).
    - Primary CTA: **Claim Rewards**.
- **States:**
  - **Disconnected:** Centered empty state with icon + "Connect wallet to view rewards."
  - **Loading:** Two-tier skeleton (context section + payout section).
  - **Blacklisted:** Error banner above stats; CTA disabled.

---

## 7. Unstake Tab (Refactored)

- **Terminology:** Use **Unstaking** (not Exiting).
- **Withdrawable visibility:** If `withdrawable > 0`, show a Withdraw section **above** the cooldown input.
- **Safety warning:**
  - **Condition:** `existingCooldown.amount > 0` and user enters a value.
  - **Banner copy:**
    "Action Rule: Adding to your cooldown will immediately claim any liquid assets and reset the 14-day timer for the stream."
- **Ghost button label:** "Start new cooldown".

---

## 8. Copy & Tone

- **APY Badges:** "Variable APY" vs "Maximized APY".
- **Status Labels:** Active, Unstaking, Withdrawable.
- **Avoid green** for withdrawable values; use brand accents.

---

## 9. State Matrix

| User State   | On-Chain Balance | View                              |
| :----------- | :--------------- | :-------------------------------- |
| New User     | 0                | AccountSummary → ModeComparison   |
| Returning    | > 0              | AccountSummary → Positions List   |
