# `03-frontend-frd.md`

**Frontend Functional Requirements — stYFI, stYFIx, veYFI, LLYFI**
**Version:** 0.3
**Applies to:** `governance-apps` repository
**Scope:** Part I (stYFI/stYFIx) and Part II (veYFI/LLYFI)

---

# 1. Purpose

This document defines the **frontend functional requirements** for the Yearn Governance App that supports:

- stYFI staking, cooldown, withdrawal
- stYFIx ERC-4626 vault staking
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
   - `useTx` is responsible for waiting for the receipt (via `waitForTransactionReceipt`) and driving the status state.
4. `TxStatus` **MUST** support at least:

   - `idle → signing → submitted → mining → success | error`

   The optional `simulating` state **MAY** be introduced later when we add client-side simulations.

5. Toasts and CTA state changes **MUST** reflect the `TxStatus` states once the shared toast system is wired in. For **BR#1 Phase 2**, `useTx` **MUST** at minimum expose the current `status` and `error` details so callers can drive UI.
6. On success:
   - React Query invalidation **MUST** refresh relevant account state (callers pass invalidation callbacks into `useTx`).
7. ERC-20 approvals **MUST** also use `useTx` (via shared hooks) and **MUST NOT** be executed directly in components.

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

   - `useTokenAllowance` (wagmi `useReadContract`) is for on-chain mode only; in mock mode it returns a stub and callers **must** rely on allowances exposed by domain account state.

3. The domain clients **MUST NOT** auto-approve or abstract approvals inside write calls.

4. `Approve` and `Stake` buttons are distinct.

5. Approvals use **exact amount** for BR#1 (not max approvals).

---

# 3. stYFI & stYFIx Frontend Requirements

(Part I Domain)

All stYFI / stYFIx reads come from `StyfiAccountState` and associated types defined in
`/lib/clients/styfi/types.ts` and shared cooldown type in `/lib/clients/shared/types.ts`.

---

## 3.1. Required Reads (stYFI & stYFIx)

The UI **MUST** use the following domain shapes:

### 3.1.1. `StyfiAccountState`

From the client:

```ts
type StyfiAccountState = {
  address: Address;
  isBlacklisted: boolean;

  // Wallet
  yfiBalance: bigint;

  // stYFI
  styfiActive: bigint;
  styfiInCooldown: bigint;
  styfiCooldown: CooldownState;

  // stYFIx
  styfiX: StyfiXPosition;

  // Rewards
  claimableGenericRewards: bigint;
  claimableBoostedRewards: bigint;
  accruingGenericRewards: bigint;
  accruingBoostedRewards: bigint;

  allowances: StyfiAllowances;
  epoch: EpochInfo;
};
```

UI requirements:

- **Wallet section** must show:

  - `yfiBalance`

- **stYFI section** must show:

  - `styfiActive` (active staked amount)
  - `styfiInCooldown` (amount currently in cooldown)
  - `styfiCooldown` (`CooldownState` — amount + `endsAt` if a cooldown is active, `null` otherwise)

- **stYFIx section** must show:

  - `styfiX` (see below)

- **Rewards section** must show:

  - `claimableGenericRewards`
  - `claimableBoostedRewards`
  - `accruingGenericRewards`
  - `accruingBoostedRewards`

- **Allowances**:

  - `allowances.yfiToStyfi`
  - `allowances.yfiToStyfiX`
  - These drive Approve vs Stake button states.

- **Epoch info**:

  - `epoch.currentEpoch`
  - `epoch.epochEnd`
  - `epoch.nextEpochStart`

### 3.1.2. `StyfiXPosition`

```ts
type StyfiXPosition = {
  sharesActive: bigint; // stYFIx shares
  sharesInCooldown: bigint;
  assetsActive: bigint; // underlying YFI equivalent
  assetsInCooldown: bigint;
  cooldown: CooldownState;
};
```

UI requirements:

- Show both **share-level** exposure (`sharesActive`, `sharesInCooldown`) and **underlying YFI** (`assetsActive`, `assetsInCooldown`).
- Explain via copy that:

  - Shares ≠ YFI.
  - Vault PPS increases over time (auto-compounding / rewards).

### 3.1.3. `EpochInfo`

```ts
type EpochInfo = {
  currentEpoch: number;
  epochEnd: number; // unix seconds
  nextEpochStart: number; // unix seconds
};
```

UI requirements:

- Countdown timers and “current epoch” displays **MUST** rely on these fields.
- The frontend **MUST NOT** derive epochs from local wall-clock time.

### 3.1.4. `StyfiAllowances`

```ts
type StyfiAllowances = {
  yfiToStyfi: bigint;
  yfiToStyfiX: bigint;
};
```

UI requirements:

- For stYFI stake:

  - Compare desired stake amount to `yfiToStyfi`.

- For stYFIx stake:

  - Compare desired stake amount to `yfiToStyfiX`.

---

### 3.1.5. Reward Windows

The UI must distinguish:

- **Accruing rewards** — `accruingGenericRewards` and `accruingBoostedRewards`

  - These represent rewards inside the 7-epoch **collection** window and are **not yet claimable**.

- **Claimable rewards** — `claimableGenericRewards` and `claimableBoostedRewards`

  - These represent rewards inside the **payout** window and can be claimed.

The UI **MUST NOT**:

- Fabricate projections or APR-based predictions.
- Guess future claimable values from accrual; it should only surface the values provided by the client.

---

## 3.2. Actions & Preconditions (stYFI & stYFIx)

All write actions use `StyfiClient` methods:

- `prepareStake(mode, amount)`
- `prepareStartCooldown(mode, amount)`
- `prepareWithdraw(mode)`
- `prepareClaimRewards()`

with:

```ts
type StyfiStakeMode = "stYFI" | "stYFIx";
```

### 3.2.1. Stake stYFI

Preconditions:

- Connected wallet
- Correct network (Ethereum mainnet)
- `isBlacklisted = false`
- `amount > 0`
- `allowances.yfiToStyfi >= amount`

Flow:

1. If `allowances.yfiToStyfi < amount`:

   - Show **Approve** CTA (uses shared approve helper + `useTx`).

2. After approval:

   - Show **Stake** CTA.

3. On Stake:

   - Call `prepareStake("stYFI", amount)` → `PreparedTransaction`
   - Execute via `useTx`.

4. On success:

   - Invalidate Styfi account queries and refresh `StyfiAccountState`.

---

### 3.2.2. Stake stYFIx

Same as stYFI stake, with:

- Allowance source: `allowances.yfiToStyfiX`.
- Mode: `prepareStake("stYFIx", amount)`.
- UI must additionally show:

  - **Shares minted** (via `StyfiXPosition.sharesActive` delta after refresh).
  - **Underlying YFI** via `assetsActive`.

---

### 3.2.3. Start Cooldown (Unified Unstake Logic)

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- For stYFI:

  - `styfiActive > 0`

- For stYFIx:

  - `styfiX.sharesActive > 0`

Flow:

- Call `prepareStartCooldown("stYFI" | "stYFIx", amountOrFullPosition)`.
- Execute via `useTx`.
- On success:

  - `styfiInCooldown` / `styfiX.sharesInCooldown` and their `CooldownState` are updated in `StyfiAccountState`.
  - **Auto-claim Side Effect:** If user already had a cooldown active with unlocked (liquid) funds, those funds are automatically claimed to the wallet **before** the timer resets for the remaining stream. UI must reflect this balance update.

UI:

- Show **Linear Progress Bar** reflecting liquid vs streaming ratio.
- **Progressive Disclosure:** If cooldown is active, hide the "Start Cooldown" input behind a "+ Unstake more" button.
- **Warning:** If adding to an existing cooldown, warn that the 14-day timer will reset for the streaming portion and liquid funds will be claimed.

---

### 3.2.4. Withdraw

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- For stYFI:

  - `styfiCooldown !== null` and `liquid > 0` (calculated via linear stream progress)

- For stYFIx:

  - `styfiX.cooldown !== null` and `liquid > 0`

Flow:

- Call `prepareWithdraw("stYFI" | "stYFIx")`.
- Execute via `useTx`.
- On success:

  - `styfiInCooldown` reduced
  - `yfiBalance` increased
  - `CooldownState` persists if remaining streaming balance exists.

- Refresh `StyfiAccountState`.

UI:

- Withdraw button **MUST** be enabled as soon as `liquid > 0` (linear streaming).
- UI must calculate liquid amount using `CooldownState.totalAmount` vs time elapsed, or use client-provided `claimable` if available.

---

### 3.2.5. Claim Rewards

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- `totalClaimable = claimableGenericRewards + claimableBoostedRewards > 0`

Flow:

- Call `prepareClaimRewards()`.
- Execute via `useTx`.
- On success:

  - Claimable fields reset to zero (or reduced by claimed amount).
  - Underlying wallet stablecoin / reward balances are reflected in external wallet.
  - Refresh `StyfiAccountState`.

UI:

- Shows:

  - `accruingGenericRewards`, `accruingBoostedRewards`
  - `claimableGenericRewards`, `claimableBoostedRewards`

- “Claim Rewards” button disabled if total claimable is zero.
- Must not split claim into multiple txs; this is a single unified claim-all for the domain.

---

# 4. veYFI & LLYFI Frontend Requirements

(Part II Domain - unchanged from v0.2)

---

# 9. Versioning & Maintenance

- Every FE change with behavioural impact **MUST** update this FRD in the same PR.
- This FRD tracks the exact contract version deployed.
- Any upstream change to YIP-88 MUST result in:

  - update to `0-normative-spec-yip88.md`, and
  - corresponding changes here.

## 9.1. Changelog

- **0.3 — 2025-11-28**

  - Updated Cooldown logic to reflect **Linear Streaming** (partial withdrawals possible).
  - Updated `StartCooldown` to include **Auto-Claim** behavior on reset.
  - Refined UI requirements for the Unified Unstake Tab (Progress Bar, Progressive Disclosure).

- **0.2 — 2025-11-20**

  - Aligned required read shapes with `StyfiAccountState`.

- **0.1**

  - Initial FE FRD draft.

---

**End of `frontend-frd.md`**
