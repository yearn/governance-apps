# `03-frontend-frd.md`

**Frontend Functional Requirements — stYFI, stYFIMax, veYFI, LLYFI**
**Version:** 0.2
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

3. The domain clients **MUST NOT** auto-approve or abstract approvals inside write calls.

4. `Approve` and `Stake` buttons are distinct.

5. Approvals use **exact amount** for BR#1 (not max approvals).

---

# 3. stYFI & stYFIMax Frontend Requirements

(Part I Domain)

All stYFI / stYFIMax reads come from `StyfiAccountState` and associated types defined in
`/lib/clients/styfi/types.ts` and shared cooldown type in `/lib/clients/shared/types.ts`.

---

## 3.1. Required Reads (stYFI & stYFIMax)

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

  // stYFIMax
  styfiMax: StyfiMaxPosition;

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

- **stYFIMax section** must show:

  - `styfiMax` (see below)

- **Rewards section** must show:

  - `claimableGenericRewards`
  - `claimableBoostedRewards`
  - `accruingGenericRewards`
  - `accruingBoostedRewards`

- **Allowances**:

  - `allowances.yfiToStyfi`
  - `allowances.yfiToStyfiMax`
  - These drive Approve vs Stake button states.

- **Epoch info**:

  - `epoch.currentEpoch`
  - `epoch.epochEnd`
  - `epoch.nextEpochStart`

### 3.1.2. `StyfiMaxPosition`

```ts
type StyfiMaxPosition = {
  sharesActive: bigint; // stYFIMax shares
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
  yfiToStyfiMax: bigint;
};
```

UI requirements:

- For stYFI stake:

  - Compare desired stake amount to `yfiToStyfi`.

- For stYFIMax stake:

  - Compare desired stake amount to `yfiToStyfiMax`.

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

## 3.2. Actions & Preconditions (stYFI & stYFIMax)

All write actions use `StyfiClient` methods:

- `prepareStake(mode, amount)`
- `prepareStartCooldown(mode, amount)`
- `prepareWithdraw(mode)`
- `prepareClaimRewards()`

with:

```ts
type StyfiStakeMode = "stYFI" | "stYFIMax";
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

### 3.2.2. Stake stYFIMax

Same as stYFI stake, with:

- Allowance source: `allowances.yfiToStyfiMax`.
- Mode: `prepareStake("stYFIMax", amount)`.
- UI must additionally show:

  - **Shares minted** (via `StyfiMaxPosition.sharesActive` delta after refresh).
  - **Underlying YFI** via `assetsActive`.

---

### 3.2.3. Start Cooldown

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- For stYFI:

  - `styfiActive > 0`

- For stYFIMax:

  - `styfiMax.sharesActive > 0`

- No currently active cooldown for the given mode:

  - stYFI: `styfiCooldown === null` or `styfiCooldown.amount === 0`
  - stYFIMax: `styfiMax.cooldown === null` or `styfiMax.cooldown.amount === 0`

Flow:

- Call `prepareStartCooldown("stYFI" | "stYFIMax", amountOrFullPosition)` as defined by contract semantics.
- Execute via `useTx`.
- On success:

  - `styfiInCooldown` / `styfiMax.sharesInCooldown` and their `CooldownState` are updated in `StyfiAccountState`.

UI:

- Must show cooldown start and end using `CooldownState.endsAt`.
- Must use contract timestamps (no local derivation).

---

### 3.2.4. Withdraw

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- For stYFI:

  - `styfiCooldown !== null` and `now >= styfiCooldown.endsAt`

- For stYFIMax:

  - `styfiMax.cooldown !== null` and `now >= styfiMax.cooldown.endsAt`

Flow:

- Call `prepareWithdraw("stYFI" | "stYFIMax")`.
- Execute via `useTx`.
- On success:

  - stYFI:

    - `styfiInCooldown` reduced
    - `yfiBalance` increased

  - stYFIMax:

    - `styfiMax.sharesInCooldown` reduced
    - `yfiBalance` increased via `assetsInCooldown` conversion

- Refresh `StyfiAccountState`.

UI:

- Withdraw button **MUST** be disabled until cooldown is fully complete.
- For partial withdraw semantics (if supported later), follow updated client contract.

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

(Part II Domain)

All veYFI / LLYFI reads come from `VeyfiAccountState` and related types defined in `/lib/clients/veyfi/types.ts` plus the shared `CooldownState`.

---

## 4.1. Required Reads (`VeyfiAccountState`)

The UI **MUST** rely on the following domain structure:

```ts
type VeYfiMigrationState = {
  legacyBalance: bigint;
  migrationEligible: boolean;
  migrated: boolean;
};

type LlyfiTokenId = "sdYFI" | "upYFI" | "coveYFI"; // extensible

type LlyfiTokenState = {
  symbol: LlyfiTokenId;
  name: string;
  decimals: number;

  walletBalance: bigint;
  stakedBalance: bigint;
  cooldownBalance: bigint;
  cooldown: CooldownState;

  claimableRewards: bigint;
  accruingRewards: bigint;

  allowance: bigint;
};

type RedemptionCaps = {
  globalLimit: bigint;
  globalUsed: bigint;
  perToken: {
    symbol: LlyfiTokenId;
    limit: bigint;
    used: bigint;
  }[];
  feeBps: number; // 0–10_000
};

type VeyfiAccountState = {
  address: Address;
  isBlacklisted: boolean;

  veYfi: VeYfiMigrationState | null;
  llyfiTokens: LlyfiTokenState[];
  redemptionCaps: RedemptionCaps;
};
```

UI requirements:

- **Migration state:**

  - If `veYfi === null`, show “No legacy veYFI” / no migration CTA.
  - If `veYfi.legacyBalance > 0`, show balance and eligibility.
  - Use `veYfi.migrationEligible` and `veYfi.migrated` flags to drive CTA states.

- **LLYFI tokens:**

  - List all `llyfiTokens` rows, each showing:

    - `symbol`, `name`
    - `walletBalance`
    - `stakedBalance`
    - `cooldownBalance`
    - `cooldown` (via shared `CooldownState`: amount & `endsAt`)
    - `claimableRewards`
    - `accruingRewards`
    - `allowance`

- **Redemption caps:**

  - Use `redemptionCaps.globalLimit` and `redemptionCaps.globalUsed` to compute remaining global capacity.
  - For each token:

    - Show remaining per-token capacity from `limit - used`.

  - Use `redemptionCaps.feeBps` as the redemption fee rate for all tokens (unless contract later provides per-token overrides).

---

## 4.2. Migration

Migration uses:

- `VeyfiAccountState.veYfi`
- `VeyfiClient.prepareMigrateVeYfi()`

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- `veYfi !== null`
- `veYfi.legacyBalance > 0`
- `veYfi.migrationEligible = true`
- `veYfi.migrated = false`

Flow:

1. Show card with:

   - Legacy balance (`veYfi.legacyBalance`)
   - Eligibility state

2. On CTA click:

   - Call `prepareMigrateVeYfi()` → `PreparedTransaction`
   - Execute via `useTx`.

3. On success:

   - `veYfi.migrated` becomes `true` (as reflected by refreshed state).
   - Any new veYFI / LLYFI state is reflected by updated `VeyfiAccountState`.

UI:

- If blacklisted → disabled CTA with clear explanation.
- If not eligible → show reason (e.g. “Migration not yet enabled for your position”).

---

## 4.3. LLYFI Staking

Staking uses:

- `VeyfiAccountState.llyfiTokens[]`
- `VeyfiClient.prepareStakeLlyfi(symbol, amount)`

Preconditions (per token):

- Connected wallet
- Correct network
- `isBlacklisted = false`
- Selected token has `walletBalance > 0`
- `amount > 0`
- `allowance >= amount`

Flow for each `LlyfiTokenState`:

1. Show row with:

   - `walletBalance`
   - `stakedBalance`
   - `cooldownBalance`
   - `claimableRewards`, `accruingRewards`

2. If `allowance < amount`:

   - Show **Approve** CTA (ERC-20 approve via shared helper).

3. After approval:

   - Show **Stake** CTA.

4. On Stake:

   - Call `prepareStakeLlyfi(symbol, amount)`.
   - Execute via `useTx`.

5. On success:

   - `walletBalance` decreases.
   - `stakedBalance` increases.
   - Rewards begin accruing.

UI:

- Staking is per-token.
- Approve/Stake CTAs are per-token and **must not** auto-approve during staking.

---

## 4.4. LLYFI Cooldown

Cooldown uses:

- `VeyfiClient.prepareStartCooldownLlyfi(symbol, amount)`
- `LlyfiTokenState.cooldown` (shared `CooldownState`)

Preconditions (per token):

- Connected wallet
- Correct network
- `isBlacklisted = false`
- `stakedBalance > 0`
- Either:

  - No active cooldown (`cooldown === null || cooldown.amount === 0`), or
  - UI honours contract semantics for multiple cooldown tranches (if supported later).

Flow:

1. Show “Start Cooldown” CTA for each token with staked balance.
2. On click:

   - Call `prepareStartCooldownLlyfi(symbol, amountOrFullPosition)`.
   - Execute via `useTx`.

3. On success:

   - `cooldownBalance` and `cooldown` (amount + `endsAt`) are updated.

UI:

- Show countdown (`endsAt`) based on contract timestamp.
- MUST NOT compute epoch windows locally; only display what client provides via `CooldownState`.

---

## 4.5. LLYFI Withdraw

Withdraw uses:

- `VeyfiClient.prepareWithdrawLlyfi(symbol)`

Preconditions (per token):

- Connected wallet
- Correct network
- `isBlacklisted = false`
- `cooldown !== null` and `now >= cooldown.endsAt`
- `cooldownBalance > 0`

Flow:

1. Show “Withdraw” CTA once cooldown is complete.
2. On click:

   - Call `prepareWithdrawLlyfi(symbol)`.
   - Execute via `useTx`.

3. On success:

   - `cooldownBalance` reduced.
   - `walletBalance` increased.
   - `cooldown` updated or cleared.

UI:

- Disable Withdraw CTA while cooldown is still active.
- Error messaging if user attempts pre-mature withdraw.

---

## 4.6. LLYFI Rewards (Claim-All)

Rewards use:

- Per-token `claimableRewards` and `accruingRewards`
- `VeyfiClient.prepareClaimLlyfiRewards()` (claim-all)

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- Sum of `claimableRewards` across all tokens > 0.

Flow:

1. Aggregate claimable across `llyfiTokens[]`.

2. Show:

   - Per-token breakdown (optional).
   - Aggregate “Claimable rewards” total.

3. Claim CTA:

   - Disabled if aggregate claimable is zero.

4. On click:

   - Call `prepareClaimLlyfiRewards()`.
   - Execute via `useTx`.

5. On success:

   - Per-token `claimableRewards` reset or reduced.
   - Underlying reward balance shows up in wallet.
   - `VeyfiAccountState` refreshed.

UI:

- Distinguish between **accruing** and **claimable** as in stYFI.
- No speculative APR projections or future claim estimates.

---

## 4.7. Redemption Panel (LLYFI → YFI)

Redemption uses:

- `VeyfiAccountState.llyfiTokens[]`
- `VeyfiAccountState.redemptionCaps`
- `VeyfiClient.prepareRedeemLlyfi(symbol, amount)`

### 4.7.1. Cap & Fee Visibility

UI **MUST** show:

- Global redemption usage:

  - `globalLimit`
  - `globalUsed`
  - `globalRemaining = globalLimit - globalUsed` (masked as necessary if close to 0).

- Per-token caps:

  - For each `perToken` entry:

    - token `symbol`
    - `limit`, `used`
    - remaining capacity `limit - used`

- Redemption fee:

  - Derived from `redemptionCaps.feeBps`:

    - `feePct = feeBps / 10_000`.

If `globalRemaining <= 0`:

- Show that no YFI is available for redemption (global exhaustion).

### 4.7.2. Redemption Preview

For each token:

Given user input `amount` (in LLYFI units):

UI must compute and show:

- Input LLYFI amount.
- **Gross YFI** to be received before fees (per the client-provided rate/contract semantics; UI should not invent its own conversion logic beyond what the client exposes).
- **Fee**:

  - Amount: `grossYfi * feeBps / 10_000`.
  - Percent: `feeBps / 10_000`.

- **Net YFI** after fees.
- Cap availability:

  - Redemption cannot exceed:

    - `globalRemaining`
    - token-specific remaining from `perToken[matchingSymbol].limit - used`.

### 4.7.3. Redeem Flow

Preconditions:

- Connected wallet
- Correct network
- `isBlacklisted = false`
- Selected token has sufficient:

  - `walletBalance` or `stakedBalance` / `cooldownBalance` according to contract rules.

- `amount > 0`
- Per-token and global caps are sufficient for `amount`.
- Allowance for that token is sufficient (if redemption pulls directly from wallet/staked token).

Flow:

1. Approve step (if required by contract; FE will use `LlyfiTokenState.allowance` to determine):

   - If `allowance < amount` → show **Approve** CTA.
   - Approval uses shared helper + `useTx`.

2. Redeem step:

   - CTA disabled if:

     - `amount = 0`
     - caps insufficient
     - user blacklisted

   - On click:

     - Call `prepareRedeemLlyfi(symbol, amount)`.
     - Execute via `useTx`.

3. On success:

   - `llyfiTokens` balances (`walletBalance` / `stakedBalance` / `cooldownBalance`) updated as per contract.
   - `redemptionCaps.globalUsed` and relevant `perToken[].used` updated in the refreshed state.
   - `yfi` balance (in wallet) increased appropriately (on Styfi side or generic wallet view).

### 4.7.4. Cap Exhaustion UX

- If `globalRemaining <= 0`:

  - Show “No YFI available for redemption right now” at the panel level.
  - Disable all Redeem CTAs.

- If a specific token’s remaining capacity is zero:

  - Its Redeem CTA is disabled.
  - Tooltip/message explaining “Redemption cap for this token is exhausted.”

---

# 5. Cross-Domain Behaviour

---

## 5.1. Data Refresh Rules

1. After any write tx:

   - All relevant account queries **MUST** be invalidated.
   - At minimum:

     - `StyfiAccountState` after stYFI/stYFIMax writes.
     - `VeyfiAccountState` after veYFI/LLYFI writes.

2. On wallet switch:

   - Clear old state.
   - Fetch new state for the selected address.

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

- MUST NOT compute boosts.
- MUST NOT compute epoch windows.
- MUST NOT compute PPS for stYFIMax.
- MUST NOT guess accrual → claimable timing.
- MUST NOT attempt redemptions beyond caps.
- MUST NOT perform silent approvals.
- MUST NOT fetch directly via wagmi inside components (only via clients).
- MUST NOT introduce additional fields or shape deviations from the domain types defined in `/lib/clients/**/types.ts` for protocol-critical values.

All calculations involving protocol semantics MUST rely on contract-provided data (as exposed by the domain clients).

---

# 7. Open Questions & Contract Dependencies

These MUST be resolved before implementing final on-chain client logic.

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

- Confirm if redemption accounting uses token balances directly or some alternative measure (e.g. time-weighted amounts).

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

## 9.1. Changelog

- **0.2 — 2025-11-20**

  - Aligned required read shapes with `StyfiAccountState`, `StyfiMaxPosition`, `StyfiAllowances`, `EpochInfo`.
  - Aligned veYFI/LLYFI reads with `VeyfiAccountState`, `VeYfiMigrationState`, `LlyfiTokenState`, `RedemptionCaps`.
  - Explicitly documented shared `CooldownState` usage for stYFI, stYFIMax and LLYFI.

- **0.1**

  - Initial FE FRD draft for stYFI/stYFIMax/veYFI/LLYFI.

---

**End of `frontend-frd.md`**
