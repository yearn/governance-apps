# `user-stories-veyfi.md`

**User Stories — veYFI & LLYFI**
**Version:** 1.1
**Scope:** Part II of the Governance Apps (veYFI migration + LLYFI staking/cooldown/redemption)

---

# 1. Purpose

These user stories define the behaviour required in the `/veyfi` section of the governance app.
They describe what users must be able to do with:

- legacy veYFI migration → new veYFI
- staking LLYFI tokens
- claiming rewards
- initiating cooldowns
- redeeming LLYFI for YFI
- understanding redemption caps and fees

They provide the behavioural foundation for the FE Functional Requirements and the Architecture Blueprint.

---

# 2. Personas

Target user:

- Familiar with wallets
- Has LLYFI tokens from the legacy locker
- Possibly holds legacy veYFI
- Expects predictable cooldown, redemption and reward flows
- Needs clarity around caps, redemption fees, and staking mechanics

---

# 3. veYFI User Stories (Migration)

---

## Story VE-01 — View My veYFI Migration Eligibility

**As a** legacy veYFI holder
**I want** to see whether I can migrate to new veYFI
**So that** I know whether an action is required

### Acceptance Criteria

- Shows legacy veYFI balance
- Shows migration eligibility state
- If no legacy balance: no CTA
- If blacklisted: migration unavailable with clear explanation

---

## Story VE-02 — Migrate to New veYFI

**As a** legacy veYFI holder
**I want** to migrate my tokens to the new veYFI
**So that** I can participate in the new governance and rewards system

### Acceptance Criteria

- CTA visible only if:

  - legacy balance > 0
  - migrationEligible = true
  - user not blacklisted

- Uses standard tx lifecycle
- After success:

  - legacy veYFI balance becomes 0
  - new veYFI state updates

---

## Story VE-03 — Understand Post-Migration State

**As a** newly migrated veYFI user
**I want** to see my new balances and cooldown state
**So that** I know what I can do next

### Acceptance Criteria

- Shows LLYFI balances and cooldown states
- Shows reward accrual/claimable
- Makes clear that legacy behavior is no longer relevant

---

# 4. LLYFI User Stories (Staking & Rewarding)

---

## Story LY-01 — View All My LLYFI Tokens

**As a** LLYFI holder
**I want** to see my balances across all LLYFI tokens
**So that** I understand my position before deciding what to do

### Acceptance Criteria

- UI lists each LLYFI token
- Shows:

  - balance
  - allowance
  - rewards (accruing & claimable)
  - cooldown status

- If blacklisted:

  - actions disabled
  - read-only data still shown

---

## Story LY-02 — Stake LLYFI

**As a** LLYFI holder
**I want** to stake any of the LLYFI tokens I hold
**So that** I can start earning rewards

### Acceptance Criteria

- For each LLYFI token:

  - If allowance < amount → show **Approve**
  - After approval → show **Stake**

- On success:

  - staked amount updates
  - reward accrual begins

- If blacklisted:

  - disabled

---

## Story LY-03 — Understand LLYFI Rewards

**As a** LLYFI staker
**I want** a clear breakdown of rewards
**So that** I understand how much I have earned and how

### Acceptance Criteria

- Distinguish:

  - accruing rewards (in 7-epoch collection window)
  - claimable rewards

- Rewards are shown aggregated or per-token (UX decision), but:

  - Claiming MUST include all for simplicity

- No speculative projections

---

## Story LY-04 — Claim LLYFI Rewards

**As a** LLYFI staker
**I want** to claim my rewards
**So that** I receive the yield my stake generated

### Acceptance Criteria

- Button disabled when claimable amount = 0
- Claims all rewards across LLYFI tokens in a single action
- After success:

  - claimable resets
  - balances refresh

- If blacklisted:

  - disabled

---

# 5. LLYFI Cooldown User Stories

---

## Story LC-01 — Start Cooldown for LLYFI

**As a** LLYFI staker
**I want** to initiate or add to a cooldown
**So that** I can eventually withdraw or redeem

### Acceptance Criteria

- Only visible if user has staked balance.
- **Progressive Disclosure:** Input is hidden behind a "Start new cooldown" button if a cooldown is already active.
- **Re-lock Warning (Non-blocking):** If I add to an existing cooldown while `Withdrawable > 0`:
  - I am explicitly warned in-context that the withdrawable amount will be re-locked for a full new cooldown.
  - The warning includes the exact withdrawable amount (`{formattedLiquid} {symbol}`).
  - The "Start new cooldown" button remains enabled.
- **Cooldown Reset Behavior:** Starting a new cooldown resets the timer for the full in-cooldown amount (existing stream + new amount). Liquid funds are **not** auto-claimed.
- If blacklisted: disabled.

---

## Story LC-02 — Monitor & Withdraw LLYFI (Linear Streaming)

**As a** LLYFI user
**I want** to see my funds unlocking over time and withdraw them as they become available
**So that** I don't have to wait for the full 14 days to access some liquidity

### Acceptance Criteria

- **Unified Tab:** Withdraw logic lives in the same tab as Cooldown logic ("Unstake").
- **Cooldown Status:** A "Cooldown Status" bar visualizes the ratio of Liquid vs. Streaming funds (Pink/Brand color).
- **Linear Access:** Withdraw button enabled as soon as `Liquid > 0`.
- **Clarity:** UI distinguishes between:
  - "Available to Withdraw" (Liquid)
  - "Streaming" (Still locked, with time remaining)
- After withdrawal success:
  - Liquid amount reduces/zeros
  - Wallet balance increases

---

# 6. Redemption User Stories (LLYFI → YFI)

These are the most complex Part II behaviours.

---

## Story RD-01 — View Redemption Options and Caps

**As a** LLYFI holder
**I want** to understand how much YFI I can redeem and what the caps are
**So that** I can plan my redemptions

### Acceptance Criteria

UI shows:

- Global redemption cap
- Global cap usage
- Per-token redemption availability
- Per-token “remaining YFI redeemable”
- Redemption fee (%)
- Clear language on how caps constrain redemptions

If blacklisted:

- All redeem flows disabled

---

## Story RD-02 — Preview Redemption Outcome

**As a** LLYFI user considering redemption
**I want** to preview how much YFI I will receive
**So that** I can make an informed decision

### Acceptance Criteria

Preview displays:

- amount of LLYFI entered
- YFI to be received
- redemption fee (amount + %)
- net amount after fees
- cap availability (global and token-specific)
- disabled state when caps insufficient

---

## Story RD-03 — Redeem LLYFI for YFI

**As a** LLYFI user
**I want** to redeem LLYFI for YFI
**So that** I can exit my LLYFI position into YFI

### Acceptance Criteria

- Two-stage interaction:

  - Approve LLYFI (if needed)
  - Redeem

- Disable redeem if:

  - cooldown not completed (if applicable)
  - caps exceeded
  - blacklisted
  - amount = 0

- Transaction lifecycle visible
- After success:

  - wallet YFI increases
  - LLYFI decreases
  - caps update

---

## Story RD-04 — Handle Cap Exhaustion

**As a** user
**I want** clear feedback when caps are exhausted
**So that** I know the action is impossible until refreshed

### Acceptance Criteria

- If global cap = 0:

  - UI shows “No YFI available for redemption right now”

- If a specific token’s cap is exhausted:

  - That token shows disabled “Redeem” with tooltip

---

# 7. Cross-Cutting `/veyfi` User Stories

These mirror the shared stYFI stories and apply across migration, LLYFI staking, cooldown, and redemption.

---

## Story CC-01 — Wallet & Network Handling

**As a** user
**I want** clear messaging for disconnected or wrong network states
**So that** I understand why I cannot act

### Acceptance Criteria

- “Connect Wallet” CTA
- “Wrong Network” banner
- All CTAs disabled until network fixed

---

## Story CC-02 — Consistent Loading & Error States

**As a** user
**I want** consistent and predictable UI behaviour
**So that** I trust the app’s reliability

### Acceptance Criteria

- Loading skeletons
- Non-intrusive error banners
- Retry button
- No inconsistent partial data

---

## Story CC-03 — Consistent Transaction UX

**As a** user
**I want** consistent tx lifecycle visuals
**So that** I know exactly what is happening

### Acceptance Criteria

- Signing → Submitted → Mining → Success
- Consistent toasts
- Etherscan link on success
- Graceful error messages

---

## Story CC-04 — Blacklist Handling

**As a** restricted user
**I want** clarity when my address cannot interact
**So that** I understand the restrictions

### Acceptance Criteria

- Warning banner
- All write actions disabled
- All read data visible

---

# 8. Non-Goals (Part II)

These behaviours are **not** part of `/veyfi`:

- stYFI staking/cooldown/withdrawal
- stYFIx ERC-4626 semantics
- Governance voting
- Voting power decay UI
- YBC flows
- Delegation UI
- Transfer flows
- Onchain scripts

---

# 9. Versioning Notes

- These stories are the behavioural baseline for BR#1.
- Any change to contract ABI or protocol rules requires updates.
- All FE FRD changes MUST propagate to this file.
- Cooldown handling uses a shared cross-domain primitive (CooldownState), consistent between stYFI, stYFIx, and LLYFI flows.

---

**End of `user-stories-veyfi.md`**
