# veYFI UI Spec v1.1

**Status:** Implemented (Phase 6 Complete)
**Applies to:** `veyfi.yearn.fi` (and `/veyfi` route)
**Last updated:** 2026-01-08

---

## 1. Scope & Purpose

This document defines the **UI and interaction model** for `veyfi.yearn.fi`.
Unlike the single-asset dashboard of stYFI, this is a **Registry & Management Tool** for multiple assets:

- **Migration:** Moving legacy veYFI to the new system.
- **LLYFI Registry:** Managing multiple Liquid Locker tokens (sdYFI, upYFI, etc.).
- **Redemption:** Monitoring liquidity caps and exiting LLYFI positions.

---

## 2. Design Principles

1.  **Registry Pattern:** We do not assume a single "primary" balance. Users scan a list of supported tokens to find their positions.
2.  **Intelligence First:** Redemption is cap-constrained. We show "Global Availability" (Flight Board) _before_ the user tries to transact.
3.  **Hub & Spoke Rewards:** All yield is realized in the stYFI Dashboard. This page only directs users there; it does not duplicate claiming logic.
4.  **Explicit Exit logic:** "Buying" and "Selling" LLYFI is handled within the token's specific context, keeping cap/fee logic tightly coupled to the asset.

---

## 3. Information Architecture

**Route:** `/veyfi`

**Page Structure:**

1.  **Global Header** (Standard Yearn Header)
2.  **Protocol Stats Bar** (Ecosystem Health)
3.  **Migration Zone** (Top priority, conditionally visible)
4.  **LLYFI Ledger** (Main management table)
5.  **Redemption Intelligence** (Global liquidity context)
6.  **Rewards Navigation** (Footer/Link)

---

## 4. Layout Zones

### 4.1 Protocol Stats Bar

**Purpose:** Display ecosystem health metrics.
**Content:**

- **Migrated veYFI:** Total amount + % of legacy supply migrated.
- **Current Boost:** The current max multiplier (e.g., "1.52x") for legacy locks.
- **Total Staked:** % of LLYFI supply currently staked in the protocol.
- **State:** System phase (e.g., "Migration and staking open").

### 4.2 Zone 1: Migration

**Component:** `MigrationCard`
**States:**

- **Action (Legacy Balance > 0):** "You have X legacy veYFI. Migrate now." (Primary CTA).
- **Info (Migrated):** "veYFI Boost Active". Visualizes the linear decay of the boost multiplier (2.0x -> 1.0x) over time.

### 4.3 Zone 2: The LLYFI Ledger

**Component:** `LlyfiTokenTable`
**Structure:**

- **Header:** Asset | Locker Status | Staked Ratio | Effective APR | Staked Balance.
- During **epoch 0** (canonical clock), the APR column label switches to **Next Epoch APR** and uses projected APR inputs.
- **Rows:** Expandable (Accordion).
- **Expanded State (Cockpit):** Reveals the "Manage" interface for that specific token.
- **Data sources (pre-connect):**
  - Locker Status uses `global.veyfi.tokens[].redemption.capacity` (YFI locked).
- Effective APR uses `llyfi[].current.aprBps` (or `projected.aprBps` when `epoch == 0`).
- Base stYFI APR uses `styfi.current.aprBps` (or `styfi.projected.aprBps` when `epoch == 0`), matching the migration card.
- veYFI boost uses the same legacy-lock boost logic as the migration card when connected; when disconnected, fall back to `global.maxBoostBps`.
- The APR tooltip shows base stYFI APR, boost multiplier, and the LLYFI staked ratio derived from `llyfi[].staked + llyfi[].unstaking` over capacity.

**The Cockpit (Tabs):**

1.  **Stake:**
    - Approve -> Stake flow.
2.  **Unstake:**
    - **Linear Streaming UI:** Reuses the "Pink" progress bar logic from stYFI.
    - **Header:** Labeled "Cooldown Status" to reflect state-based accounting (avoids confusion when bar resets after withdrawal).
    - Withdraw available liquid funds (read from `maxWithdraw` and normalized to Assets).
3.  **Trade:**
    - **Mode Selection:** Radio Button (Sell vs Buy).
    - **Buy (YFI -> LLYFI):**
      - **Constraint:** Limited by `Redemption.inventory` (Amount of LLYFI held by protocol).
      - **Contract:** `exchange()`.
    - **Sell (LLYFI -> YFI):**
      - **Action:** Labeled "Sell [Token]" (e.g. Sell sdYFI).
      - **Constraint:** Limited by `Redemption.capacity - Redemption.used` AND `Redemption.YFI_Balance`.
      - **Fee:** Shows exit fee (bps) and Net Receive amount.
      - **Contract:** `redeem()`.

### 4.4 Zone 3: Redemption Intelligence & Rewards

**Component:** `InventoryCard` ("Flight Board")
**Purpose:** Inform the user about exit liquidity _before_ they dig into specific tokens.
**Content:**

- **Global Inventory:** Table of available YFI held by protocol.
- **Current Fee:** The current exit fee (e.g., "5.0%").
- **Asset breakdown:** Read-only list showing YFI available per token type.

**Component:** `VeyfiRewardsCard`
**Purpose:** Reinforce stYFI as the yield hub.
**Content:** "Rewards are aggregated in the stYFI ecosystem."
**Action:** "Go to stYFI Dashboard".

---

## 5. Data Requirements

### 5.1 New Global Stats

The frontend requires a new `getGlobalStats()` method from the VeyfiClient to populate the top bar:

- `migratedYfi` (bigint)
- `lockedYfi` (bigint)
- `maxBoostMultiplier` (number/bigint, e.g. 15200 bps)
- `totalLlyfiStakedPercent` (number/bigint bps)

### 5.2 Token Data

- `LlyfiTokenState` must include `address` for approvals.
- APY data must include `base` vs `boost` breakdown if possible (or aggregated Net APY).

---

## 6. Copy & Tone

- **Migration:** Urgent but helpful. "Don't lose your boost."
- **Redemption:** Transparent. "Subject to dynamic exit fee."
- **Colors:**
  - **veYFI/LLYFI:** "Disco Salmon" (#CC3767).
  - **Warnings/Caps:** Amber/Red if caps are near full.
