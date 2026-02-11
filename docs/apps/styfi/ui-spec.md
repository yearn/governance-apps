# stYFI UI Spec v3.1

**Status:** Final
**Applies to:** `styfi.yearn.fi` (and `/styfi` route)
**Last updated:** 2026-02-11

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
2. **Protocol Stats Bar** (Total Supply, Staked, APR, optional State). Show **"Epoch 1 APR"** when current epoch == 0 from the canonical clock. **Staked** should use `styfi.staked` (excludes cooldown balances; `styfi.unstaking` is the cooldown amount). The **State** item is sourced from the MOTD JSON (`NEXT_PUBLIC_MOTD_URL`) and is omitted if missing/invalid.
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
    - **Current APR** (or **Next Epoch APR** when `epoch == 0`) with tooltip aligned to the label.
    - When `epoch == 0`, use `styfi.projected.aprBps` for the displayed value.
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
  - **Condition:** `withdrawable > 0` while the "Start new cooldown" form is visible.
  - **Banner title:** "Re-locking liquid funds"
  - **Banner body:** "You have **{formattedLiquid} {symbol}** available to withdraw. Starting a new cooldown will re-lock these funds for the full duration."
  - **Behavior:** Warning is informational only; do not disable/block the "Start new cooldown" CTA.
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

---

## 10. Cross-App Nudge

- **Goal:** Contextual guidance to `/veyfi` without interrupting staking flows.
- **Trigger policy:** Show at most one nudge, and only for high-intent actions:
  - legacy veYFI migration available
  - unstaked liquid locker tokens in wallet
  - intentionally **does not** show passive/manage-only nudges to avoid fatigue
- **Connection gating:** Nudge evaluation requires an actual connected wallet (`wagmi` connected), not only mock fallback identity.
- **Data path:** stYFI uses a lightweight veYFI nudge read (`getNudgeState`) instead of full veYFI account hydration.
  - Includes only: legacy migration signal + per-token liquid locker balances.
  - Excludes: allowances, cooldown streams, redemption caps, and cockpit-level data.
- **Copy source:** All nudge copy is defined in shared message config (`app/_shared/messages.ts`), not hardcoded in hook logic.
- **Amount formatting:** token values use standard token formatting with 4 decimal precision; liquid locker copy lists per-token symbols and amounts.
- **Visual treatment:** Brand-tinted banner with row-collapse animation (`grid-template-rows`) and top-right dismiss action.
- **Dismiss behavior:** `X` only; dismissal snoozes for 7 days per wallet and nudge ID.
- **CTA behavior:**
  - Label: "Visit veYFI website"
  - Opens in a new tab with external-link icon
  - Hostname-aware routing via governance link resolver:
    - `localhost` / `app.dao-ops.com` -> path-scoped `/veyfi`
    - `*.yearn.fi` -> canonical `https://veyfi.yearn.fi`
- **Deep-link behavior:** CTA routes include `source=nudge` + action/focus params.
- **Scroll reliability:** Target scrolling uses DOM-observer readiness checks (`MutationObserver`) rather than fixed timeout delays.
