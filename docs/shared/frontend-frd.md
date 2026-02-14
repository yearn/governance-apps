# `frontend-frd.md`

**Frontend Functional Requirements — stYFI, stYFIx, veYFI, LLYFI**
**Version:** 0.7
**Applies to:** `governance-apps` repository
**Scope:** Part I (stYFI/stYFIx) and Part II (veYFI/LLYFI).  
**Note:** yETH recovery has dedicated product specs under `docs/apps/yeth/`.

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

5. Read policy (hybrid):

   - Global (non-account) stats **MUST** load from the S3 JSON (`NEXT_PUBLIC_GLOBAL_DATA_URL`) and **MAY** load before connect.
   - Account-specific reads **MUST** remain gated on a connected address and **MUST** use the wallet-backed RPC (EIP‑1193).
   - `NEXT_PUBLIC_RPC_URLS` is optional and only used to seed wagmi transports for local/dev or fork testing.

---

## 2.1.1. Remote Stats Message (MOTD)

1. The app **MAY** load a per-app stats bar message from a small S3 JSON blob (`NEXT_PUBLIC_MOTD_URL`).
2. The message **MUST NOT** block render and **MUST** be ignored if the JSON is missing, invalid, or unreachable.
3. If a `label` is missing, the UI **MUST** default to `State`.
4. If `value` is missing/empty, the message **MUST NOT** render.

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

1. Epoch data **MUST** be derived client-side from immutable `GENESIS` and `EPOCH_LENGTH` (from `deployment.json` → `lib/constants.ts`).
2. The frontend **MUST NOT** call on-chain `epoch()` for UI timing; compute epoch start/end from a **canonical clock** vs `GENESIS` using shared helper logic.
3. Canonical clock sources (priority order):
   - **Connected wallet:** latest block timestamp (chain time).
   - **Pre-connect:** S3 `meta.timestamp` (snapshot time) with a local offset.
   - **Fallback:** local system time.
   - **Mock-mode exception (`NEXT_PUBLIC_USE_MOCKS=true`):** use local mock clock only and bypass chain/S3 sources so debug time travel is deterministic.
4. Countdown displays use locally derived epoch end timestamps from `EpochInfo` helpers based on the canonical clock.

---

## 2.7. Blacklisted Addresses

1. The UI **MUST** display a warning banner if `isBlacklisted = true`.
2. Blacklist restrictions **MUST** apply only when status is explicitly `blocked`.
3. If blacklist status resolves to `unknown`, UI **MUST** stay silent and **MUST NOT** disable actions on that basis.
4. The following actions are blacklist-restricted in the current UI:

   - stYFI/stYFIx staking
   - LLYFI stake/trade actions
   - stYFI rewards claim

5. Read-only data still loads normally.

---

## 2.8. Approvals (Shared Logic)

1. A token interaction requires a two-step pattern:

   - **Approve**
   - **Action (Stake / Migrate / Redeem / etc.)**

2. The UI **MUST** determine allowance sufficiency via the **`useTokenAllowance` hook** for the specific token/spender pair.

   - While `AccountState` provides a snapshot of allowances, interaction buttons **MUST** use the dedicated hook to allow for immediate `refetch()` and UI updates after an approval transaction confirms, without waiting for a full account re-indexing.

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
  styfiUnlocked: bigint; // Funds finished streaming but not withdrawn
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

  - `yfiBalance` (displayed in input fields or Account Summary).
  - _Note:_ Global Header balance display is removed.

- **stYFI section** must show:

  - `styfiActive` (active staked amount)
  - `styfiInCooldown` (amount currently in cooldown)
  - `styfiUnlocked` (amount fully liquid but not withdrawn)
  - `styfiCooldown` (`CooldownState` — amount + `endsAt`)

- **stYFIx section** must show:

  - `styfiX` (see below)

- **Rewards section** must show:
  - `claimableGenericRewards` + `claimableBoostedRewards`

### 3.1.2. `StyfiXPosition`

```ts
type StyfiXPosition = {
  sharesActive: bigint; // stYFIx shares
  sharesInCooldown: bigint;
  assetsActive: bigint; // underlying YFI equivalent
  assetsInCooldown: bigint;
  assetsUnlocked: bigint; // underlying YFI finished streaming
  assetsWithdrawable: bigint; // Contract maxWithdraw (Source of Truth)
  cooldown: CooldownState;
};
```

`stYFIx` is 1:1 with YFI. It is **NOT** auto-compounding. Rewards accrue separately and must be claimed manually via the RewardClaimer.

UI requirements:

- Show both **share-level** exposure and **underlying YFI** (likely identical).
- `assetsWithdrawable` determines if the Withdraw button is enabled.

### 3.1.3. Reward Reading Strategy (Simulation)

The contract `pending_rewards` storage is often stale.
The Onchain Client **MUST** use `eth_call` (simulation) to call `RewardClaimer.claim(user)` to fetch the accurate pending reward amount without executing a transaction.

### 3.1.4. `EpochInfo`

```ts
type EpochInfo = {
  currentEpoch: number;
  epochEnd: number; // unix seconds
  nextEpochStart: number; // unix seconds
};
```

UI requirements:

- Countdown timers and “current epoch” displays **MUST** rely on these fields.
- Epoch fields **MUST** be derived locally from `GENESIS` + `EPOCH_LENGTH` (see `getEpochInfo` in `lib/format.ts`).

### 3.1.5. `StyfiAllowances`

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

### 3.1.6. Reward Windows

The Client MUST provide:

- **Accruing rewards** — `accruingGenericRewards` and `accruingBoostedRewards`
- **Claimable rewards** — `claimableGenericRewards` and `claimableBoostedRewards`

**UI Note:** The frontend MAY hide the "Accruing" values to simplify the dashboard and focus users on the actionable "Claimable" amount. However, the data must remain available in the domain state for potential future use or detailed tooltips.

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
  - **Re-lock Side Effect:** If user already had withdrawable/liquid funds, those funds are re-locked into the refreshed cooldown stream. The timer resets for the full in-cooldown amount (existing + added), and withdrawable returns to `0` immediately after the reset.

UI:

- Show **Linear Progress Bar** (Labeled "Cooldown Status") reflecting liquid vs streaming ratio.
- **Progressive Disclosure:** If cooldown is active, hide the cooldown input behind a "Start new cooldown" button.
- **Warning:** If `withdrawable > 0` and the cooldown form is visible, show a warning banner:
  - Title: "Re-locking liquid funds"
  - Body: "You have **{formattedLiquid} {symbol}** available to withdraw. Starting a new cooldown will re-lock these funds for the full duration."
- **No Blocking:** Keep the "Start new cooldown" button enabled when valid; warning is informational.

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

## 4. veYFI & LLYFI Frontend Requirements

(Part II Domain)

## 4.1. Required Reads (veYFI)

### 4.1.1. `VeyfiAccountState` (User)

```ts
type LlyfiTokenState = {
  // ...
  redemption: {
    capacity: bigint;
    used: bigint;
    inventory: bigint;
    fee: bigint;
  };
};
```

**Normalization Requirement:**

- LLYFI tokens may have different internal representations (e.g., upYFI is 69,420:1).
- The `LlyfiTokenState` exposed to the UI **MUST** be normalized to **Assets** (token amounts) rather than **Shares** (vault accounting).
- `stakedBalance`, `cooldownBalance`, and `withdrawable` must all be expressed in the token's native units (e.g., upYFI amount) so the UI displays consistent values.

UI requirements:

- **Redemption Tab:**
  - Sell (Redeem): Max = `min(WalletBalance, CapacityRemaining * Rate)`.
  - Buy (Mint): Max = `Inventory / Rate`.
- **LLYFI Ledger (Table):**
  - MUST render before wallet connect using S3 global data.
  - **Locker Status** MUST display `global.veyfi.tokens[].redemption.capacity` (YFI locked).
  - **Effective APR** MUST use `llyfi[].current.aprBps` (or `projected.aprBps` when `epoch == 0`), which already includes boost + ratio.
  - **Base stYFI APR** uses `styfi.current.aprBps` (or `styfi.projected.aprBps` when `epoch == 0`), matching the migration card.
  - **veYFI boost** uses the same legacy-lock boost logic as the migration card when connected; when disconnected, fall back to `global.maxBoostBps`.
  - **APR tooltip breakdown** MUST show base stYFI APR, boost multiplier, and the staked ratio derived from `llyfi[].staked + llyfi[].unstaking` over capacity.

### 4.1.2. `VeyfiGlobalStats` (System)

**New Requirement (Phase 6):** The client **MUST** expose global health metrics for the top bar.

```ts
type VeyfiGlobalStats = {
  migratedYfi: bigint;
  lockedYfi: bigint;
  maxBoostMultiplier: number; // e.g., 1.5 or 15000 bps
  totalLlyfiStakedPercent: number; // 0-1 (or bps)
};
```

UI requirements:

- Stats bar MUST derive its values from this object.
- `RedemptionCaps` (fee, utilization) are read from the Account State (as they might arguably be user-specific in some designs, though globally identical usually).

## 4.2. Actions & Preconditions

### 4.2.1. Migration

- Call `prepareMigrateVeYfi()`.
- Only visible if `veYfi.legacyBalance > 0` and `migrationEligible`.

### 4.2.2. Redemption (Trade Tab)

- **Minting (YFI -> LLYFI):**
  - Ideally just a wrap/deposit function.
  - No fee.
- **Redeeming (LLYFI -> YFI):**
  - **Constraints:**
    - Check `RedemptionCaps.globalLimit - globalUsed`.
    - Check `RedemptionCaps.perToken[symbol].limit - used`.
  - **Fee:** Display exit fee (bps) deducted from output.
  - **Precondition:** User must have _liquid_ LLYFI (wallet balance).

### 4.2.3. LLYFI Staking / Unstaking

- Follows the exact same **Linear Streaming** behavior as stYFI.
- `LlyfiTokenState` contains the `CooldownState`.

### 4.2.4. Rewards

- UI directs users to `/styfi` dashboard.
- Fallback `prepareClaimLlyfiRewards()` exists if needed.

---

# 9. Versioning & Maintenance

- Every FE change with behavioural impact **MUST** update this FRD in the same PR.
- This FRD tracks the exact contract version deployed.
- Any upstream change to YIP-88 MUST result in:

  - update to `normative-spec-yip88.md`, and
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
