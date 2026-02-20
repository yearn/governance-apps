# yETH Recovery UI/UX Spec

**Version:** 2.0 (Tokyo Refresh)  
**Status:** Active implementation guide  
**Theme:** Tokyo Party (`#5814FB`)  
**Core Principle:** Action-first hierarchy (de-boxed layout)

This specification defines the yETH recovery interface behavior for `/yeth`.

## 1. Visual Identity and Principles

- **Hero color:** Tokyo Party 300 (`#5814FB`).
  - In code, this hex maps to the `tokyo-600` token to match existing primary button hierarchy conventions.
- **Layout philosophy:** De-boxed. Avoid nesting cards within cards. Use typography and spacing to create hierarchy instead of borders.
- **Tone:** Urgent but digital-native. Less accounting software, more mechanism.
- **Primary action:** `Claim ETH & Exit` must be visually dominant.
- **Secondary action:** `Deposit claim into Recovery Vault` must feel advanced and optional.

## 2. Page Structure

### 2.1 Global Header

- Standard Yearn shell header.
- Wallet connect/account control in the right cluster.

### 2.2 Recovery Banner (Persistent)

Always visible on yETH route, pinned below the header.

- **Background:** `surface-secondary` (neutral), not brand colored.
- **Content:**
  - `yETH has been retired. This interface is for recovery.`
  - Link to approved YIP.
  - Claim window countdown (for example, `Ends in 61 days`).

### 2.3 Recovery Hero (The State)

Replaces the old primary recovery card.

- **Centering:** Vertically and horizontally centered top section.
- **Headline metric:** `ETH Claimable Now` amount rendered in `text-6xl` or `text-7xl` using `font-number`.
  - Color: `text-tokyo-600` (`#5814FB`).
- **Secondary metric:** `Recovered so far: XX.X%` in a pill directly below the amount.

### 2.4 Action Deck (The Decision)

A two-column grid directly below the hero metrics.

#### Option A: Claim and Exit (Recommended)

- **Visual:** Solid card with stronger elevation.
- **Button:** Primary button (`bg-tokyo-600 text-white`).
- **Copy:** dynamic amount (`Claim X.XXXX ETH & Exit`).
- **Body:** Bullet points emphasizing immediacy (`Receive ETH immediately`, `Recovery complete`).

#### Option B: Active Recovery (Advanced)

- **Visual:** Outlined or ghost treatment, visually recessed.
- **Button:** Ghost style (`border-2 border-tokyo-600 text-tokyo-600`).
- **Copy:** `Deposit claim into Recovery Vault`.
- **Body:** Bullet points emphasizing risk (`Receive Recovery Vault shares`, `Ongoing risk`).
- **Interaction:** Opens risk acknowledgement modal.

Action deck layout constraints:

- Both option headers share a consistent vertical baseline.
- Both CTA buttons align to the same height on desktop.

### 2.5 Context Grid (Secondary Stats)

A clean 2x2 (mobile) or 4x1 (desktop) grid below the Action Deck.

- Wallet address (truncated)
- Snapshot Value (`Original Snapshot Value`)
- Claim window end (UTC)
- Eligibility (`Eligible` / `Ineligible`)

### 2.6 Trust and Verify Footer

Replaces the old trust drawer treatment.

- Located at the bottom of page content.
- Uses a collapsible `<details>` element with a clear interactive trigger.
- Trigger copy: `View Contracts, Risks & Sources`.
- Trigger includes a chevron icon that rotates on open state.
- Trigger uses subtle hover/focus affordance so it reads as a control, not plain text.
- Includes:
  - Contract addresses (Claim Contract, Recovery Vault, Yield Vault) with explorer links
  - Vault metrics (TVL, PPS, performance fee)
  - Yield sources and risk disclosures
  - Manual late-claim instructions

## 3. Interaction Flows

### 3.1 Risk Acknowledgement Modal

**Trigger:** Clicking `Deposit claim into Recovery Vault`.

Requirements:

- Explicit smart-contract and strategy risk statement.
- Explicit `no recovery of the recovery` warning.
- Consent checkbox required before confirm button is enabled.

### 3.2 Post-Claim State: Exited

- **Visual:** Success hero.
- **Headline:** `Recovery Complete`.
- **Metric:** `You received X.XXXX ETH`.
- **Subtext:** `You no longer participate in future recovery yield.`
- **Action:** Link to block explorer.

### 3.3 Post-Claim State: Staying (Recovery Vault Holder)

- **Visual:** Active position dashboard.
- **Framing:** Settlement-first ("checkout ticket"), not progress tracking.
- **Primary metric:** `Liquidation Value` shown as the amount available to withdraw now.
- **Detail rows:**
  - Original Snapshot
  - Recovered vs Original
  - Vault Shares
- **Primary action:** dynamic cash-out CTA (`Cash out X.XXXX ETH`) using Tokyo primary styling.

### 3.4 Claim Window Ended

- Hero metrics replaced by `Claim Window Closed`.
- Action deck hidden or disabled.
- Callout to manual late-claim process (governance docs link).

## 4. Copy Guidelines

- **Avoid:** `Loss`, `Keep earning`, `Optimize`.
- **Use:** `Snapshot Value`, `Recover`, `Claim`.
- **Reasoning:** `Loss` is psychologically negative; `Snapshot Value` is neutral. `Keep earning` sounds promotional, while `Deposit claim into Recovery Vault` signals deliberate, risk-aware action.

## 5. Responsive Behavior

### 5.1 Mobile

- Hero text scales down (`text-5xl`).
- Action deck stacks vertically with Claim and Exit first.
- Stats grid wraps to 2x2.

### 5.2 Desktop

- Action deck renders side-by-side.

## 6. Implementation References

- **Colors:** `/app/globals.css`
  - `tokyo-600`: `#5814FB` (primary action and hero text)
  - `tokyo-700`: `#460dc9` (hover state)
- **Components:**
  - `/app/yeth/components/RecoveryHero.tsx`
  - `/app/yeth/components/ActionDeck.tsx`
  - `/app/yeth/components/StatsGrid.tsx`
  - `/app/yeth/components/TrustFooter.tsx`
- **State driver:** `/app/yeth/YethPageClient.tsx` with `useYethAccountState` and `useYethGlobalState`.
