# `frontend-frd.md`

**Frontend Functional Requirements — stYFI, stYFIMax, veYFI, LLYFI**
**Version:** 0.1
**Applies to:** `governance-apps` repository
**Scope:** Part I (stYFI/stYFIMax) and Part II (veYFI/LLYFI)

---

# 1. Purpose

This document defines the **frontend functional requirements** for the Yearn Governance App that supports:

- stYFI staking, cooldown, withdrawal
- stYFIMax ERC-4626 vault staking
- unified reward claiming
- veYFI migration
- LLYFI staking, cooldown, redemption
- redemption caps and fees
- all cross-cutting UI behaviours (wallet, network, approval logic, transaction lifecycle, error handling, formatting, etc.)

This FE FRD sits **between**:

- the **protocol normative spec** (YIP-88), and
- the **architecture blueprint / client interfaces**, and
- the **user stories**.

It defines what **the frontend MUST do**, **MUST NOT do**, and what data it **MUST rely on**.

---

# 2. Global Frontend Requirements (Shared)

These apply across `/styfi` and `/veyfi`.

---

## 2.1. Wallet & Connection Requirements

1. The app **MUST** use RainbowKit + wagmi for wallet connections.
2. The app **MUST** support EOA wallets; multisigs and smart wallets are **not** required in BR#1.
3. If no wallet is connected:

   - Show neutral placeholder UI, not error states.

4. After connecting:

   - All reads **MUST** fetch data via the domain clients immediately.

---

## 2.2. Network Handling

1. The app **MUST** enforce the correct network (Ethereum mainnet).
2. If the user is connected to the wrong network:

   - Show a top-level **Wrong Network** banner.
   - Disable all interaction buttons.

3. The app **MUST NOT** attempt silent network switching.

---

## 2.3. Transaction Lifecycle (Shared)

All interactive flows use a **global transaction state machine**.

### 2.3.1. TxStatus (unified)

```
'idle'
'simulating'
'signing'
'submitted'
'mining'
'success'
'error'
```

### 2.3.2. Requirements

1. All transactions **MUST** use a shared `useTx()` hook.
2. No component may initiate a raw wagmi/viem write directly.
3. All domain client write methods **MUST** return a **PreparedTransaction**:
   - A function that, when called, submits the transaction and returns the tx hash.
   - `useTx` is responsible for waiting on the receipt and driving the status state.
4. Toasts and CTA state changes **MUST** reflect the `TxStatus` states:
   - `idle → simulating → signing → submitted → mining → success | error`.
5. On success:
   - React Query invalidation **MUST** refresh relevant account state.
6. ERC-20 approvals **MUST** also use `useTx` (via shared hooks) and **MUST NOT** be executed directly in components.

---

## 2.4. Error Model (Shared)

### 2.4.1. Multicall & Read Errors

1. If multicall fails → **page-level error banner** and retry option.
2. UI **MUST NOT** render partially inconsistent state (no "undefined" fragments).
3. Auto-retry is **disabled**; retry is user-initiated.
4. Errors are presented in human-readable format (“Unable to load your account”).

### 2.4.2. Write Errors

1. User-rejected signatures → handled cleanly; no stacktraces.
2. Reverts → mapped to user-readable messages.
3. A failed transaction returns app to `idle` with an error toast.

---

## 2.5. BigInt Handling & Formatting

1. All protocol values **MUST** be `bigint` internally.
2. UI formatting MUST go through shared helpers in `format.ts`.
3. No component may call `.toFixed()` or manual string formatting.

---

## 2.6. Epochs

1. Epoch data **MUST** be read from contracts.
2. The frontend **MUST NOT** compute epoch start/end from local timestamps.
3. Countdown displays use contract-provided epoch end timestamps.

---

## 2.7. Blacklisted Addresses

1. The UI **MUST** display a warning banner if `isBlacklisted = true`.
2. The following actions **MUST** be disabled:

   - stake, unstake, cooldown, withdraw
   - migrate veYFI, stake LLYFI, redeem
   - claim rewards

3. Read-only data still loads normally.

---

## 2.8. Approvals (Shared Logic)

1. A token interaction requires a two-step pattern:

   - **Approve**
   - **Action (Stake / Migrate / Redeem / etc.)**

2. The UI **MUST** determine allowance sufficiency via account state.

3. The domain clients **MUST NOT** auto-approve or abstract approvals inside write calls.

4. `Approve` and `Stake` buttons are distinct.

5. Approvals use **exact amount** for BR#1 (not max approvals).

---

# 3. stYFI & stYFIMax Frontend Requirements

(Part I Domain)

---

## 3.1. Required Reads (stYFI)

The UI MUST fetch and display via `StyfiAccountState`:

- `yfiBalance: bigint`
- `stakedYfi: bigint`
- `cooldownActive: boolean`
- `cooldownStartTimestamp: number | null`
- `cooldownEndTimestamp: number | null`
- `claimableGenericRewards: bigint`
- `claimableBoostedRewards: bigint`
- `accruingGenericRewards: bigint`
- `accruingBoostedRewards: bigint`
- `isBlacklisted: boolean`
- `allowances: { yfiToStyfi, yfiToStyfiMax }`

### 3.1.1. Requirement: Reward Windows

UI must distinguish:

- **Accruing rewards** (in 7-epoch collection window)
- **Claimable rewards** (in payout window)

UI MUST NOT fake reward predictions.

---

## 3.2. Required Reads (stYFIMax ERC-4626)

The UI MUST display:

- `styfiMaxShares: bigint`
- `styfiMaxAssets: bigint` (via `convertToAssets(shares)`)
- `allowances.yfiToStyfiMax: bigint`

### 3.2.1. Vault Semantics

1. UI MUST explain:

   - Shares ≠ YFI.
   - Shares increase in value (PPS) as rewards compound.

2. UI MUST show both:

   - **Shares held**
   - **Underlying YFI value**

---

## 3.3. Actions & Preconditions

### 3.3.1. Stake stYFI

Preconditions:

- Connected wallet
- Correct network
- Not blacklisted
- `allowance >= amount`

Flow:

- If allowance insufficient → show **Approve**
- After approve → show **Stake**
- Stake triggers the tx lifecycle

Postconditions:

- Refresh account state on success

---

### 3.3.2. Stake stYFIMax

Same as above, plus display of shares vs assets.

---

### 3.3.3. Start Cooldown

Conditions:

- Must have staked YFI or stYFIMax
- Not currently in cooldown
- Not blacklisted

Cooldown timestamps come directly from contract.

---

### 3.3.4. Withdraw

Conditions:

- In cooldown AND cooldown period is complete
- Not blacklisted

On submit:

- Tx lifecycle
- Refresh account state

---

### 3.3.5. Claim Rewards

Single unified claim endpoint for:

- Generic stYFI rewards
- Boosted rewards
- stYFIMax rewards (mechanism depends on contract design — see Open Questions)

Requirements:

- Show total `claimableGeneric + claimableBoosted`
- Disabled if zero
- After claim → invalidate data

---

# 4. veYFI & LLYFI Frontend Requirements

(Part II Domain)

---

## 4.1. Required Reads (VeyfiAccountState)

The UI MUST fetch:

- `legacyVeYfiBalance: bigint`
- `migrationEligible: boolean`
- `llyfiBalances: Record<string, bigint>`
- `llyfiAllowances: Record<string, bigint>`
- `cooldownState: CooldownState` (shared cooldown primitive)
- `claimableRewards: bigint`
- `accruingRewards: bigint`
- `redemptionCaps: { globalCap, used, remainingPerToken }`
- `redemptionFeeBps: number`
- `isBlacklisted: boolean`

CooldownState is a shared domain type defined in /lib/clients/shared/types.ts and used by both stYFI and LLYFI domains.

---

## 4.2. Migration

UI MUST:

- Display whether user has legacy veYFI
- Allow migration only if:

  - Not blacklisted
  - migrationEligible = true

- Show “Migrate to veYFI”
- After migrate, refresh account state

---

## 4.3. LLYFI Staking

For each LLYFI token:

- Show balance
- Show allowance
- Use two-step approve → stake flow
- Show rewards accrued and claimable
- Cooldown behaviour same as stYFI (14-day epoch-based)

---

## 4.4. Redemption Panel

UI MUST display:

- User’s LLYFI token balances
- Per-token redeemable YFI
- Redemption cap availability (global + per token)
- Expected fee %
- Expected fee amount
- Net YFI received
- Disabled state when:

  - Not enough cap
  - amount = 0
  - user blacklisted

On redemption:

- Standard tx lifecycle
- Refresh account state post-success

---

# 5. Cross-Domain Behaviour

---

## 5.1. Data Refresh Rules

1. After any write tx:

   - All relevant account queries MUST be invalidated.

2. On wallet switch:

   - Clear old state
   - Fetch new state

---

## 5.2. Loading & Empty States

- Each panel MUST define:

  - loading state
  - empty state
  - error state

- Never show zeroes as placeholders.
- Loading rows / skeletons must be stylistically consistent.

---

# 6. UI MUST NOT Rules (Important)

The frontend:

- MUST NOT compute boosts
- MUST NOT compute epoch windows
- MUST NOT compute PPS for stYFIMax
- MUST NOT guess accrual → claimable timing
- MUST NOT attempt redemptions beyond caps
- MUST NOT perform silent approvals
- MUST NOT fetch directly via wagmi inside components (only via clients)

All calculations involving protocol semantics MUST rely on contract-provided data.

---

# 7. Open Questions & Contract Dependencies

These MUST be resolved before implementing final client logic.

### 7.1. stYFIMax Reward Distribution

- Is reward distribution done via a RewardsDistributor contract?
- Is accounting based on shares or assets?
- How are stablecoins assigned to stYFIMax users?

### 7.2. Epoch Source

- Which contract exposes epoch start/end?
- Confirm that UI must _only_ use contract timestamps.

### 7.3. Blacklist Source

- Which contract exposes blacklist status for stYFI and LLYFI?

### 7.4. Redemption Accounting

- Confirm if redemption accounting uses token balances directly or some alternative measure.

---

# 8. Non-Goals for BR#1 (Explicit Exclusions)

- Proposal voting
- Voting power decay UI
- Governance dashboards
- Historical reward analytics
- veYFI boost visualizations
- Delegation statistics
- P&L dashboards
- YBC flow UI
- Transfer flows (unless explicitly added later)

These belong to later phases.

---

# 9. Versioning & Maintenance

- Every FE change with behavioural impact **MUST** update this FRD in the same PR.
- This FRD tracks the exact contract version deployed.
- Any upstream change to YIP-88 MUST result in:

  - update to `0-normative-spec-yip88.md`, and
  - corresponding changes here.

---

**End of `frontend-frd.md`**
