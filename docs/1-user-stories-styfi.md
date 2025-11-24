# `user-stories-styfi.md`

**User Stories — stYFI & stYFI+**
**Version:** 1.0
**Scope:** Part I of the Governance Apps (stYFI + stYFI+)

---

# 1. Purpose

These user stories define **what users must be able to do** in the `/styfi` section of the governance app.
They describe desired behaviour **from the user’s point of view**, without dictating implementation details.

These stories inform the FE Functional Requirements and the Architecture Blueprint.

---

# 2. Personas

We assume a technically literate DeFi user familiar with:

- Ethereum wallet connections
- Transaction signing
- Staking/cooldown mechanics
- ERC-4626 vault share semantics (but still requiring explicit UI clarity)

---

# 3. User Stories (stYFI)

---

## Story ST-01 — View My stYFI Account State

**As a** stYFI user
**I want** to see my staked position, rewards, cooldown status, and wallet balances
**So that** I understand my current state and available actions

### Acceptance Criteria

- Shows:

  - my wallet YFI balance
  - my staked stYFI amount
  - whether I am in cooldown
  - cooldown start and end timestamps
  - claimable rewards (generic + veYFI-boosted)
  - accruing (not yet claimable) rewards

- If blacklisted:

  - Blocking banner is shown
  - All actions disabled

---

## Story ST-02 — Stake YFI into stYFI

**As a** YFI holder
**I want** to stake YFI into stYFI
**So that** I can earn rewards and participate in the Yearn system

### Acceptance Criteria

- If allowance < input:

  - UI shows an **Approve** button

- After approval:

  - UI shows **Stake** button

- Displays current YFI wallet balance
- Transaction lifecycle surfaced via UI
- After successful stake:

  - Updated staked amount
  - Rewards refresh

- If blacklisted:

  - Action unavailable with explanation

---

## Story ST-03 — Understand stYFI Reward Accrual Windows

**As a** stYFI user
**I want** to clearly understand the difference between accruing and claimable rewards
**So that** I know what to expect after staking

### Acceptance Criteria

- UI distinguishes:

  - accruing rewards (within 7-epoch collection window)
  - claimable rewards (within payout window)

- Newly staked positions show **0 claimable** until eligible
- No speculative or projected reward values

---

## Story ST-04 — Claim stYFI Rewards

**As a** stYFI user
**I want** to claim my eligible rewards
**So that** I can withdraw stablecoin yield

### Acceptance Criteria

- Shows combined claimable rewards
- Button disabled if claimable amount is 0
- After success:

  - claimable resets
  - balances refresh

- If blacklisted:

  - Action disabled with explanation

---

## Story ST-05 — Start Cooldown for stYFI

**As a** stYFI user
**I want** to start the cooldown period
**So that** I can eventually withdraw my YFI

### Acceptance Criteria

- Only visible when user has stYFI staked
- Blocked during cooldown
- Shows cooldown start immediately on success
- Shows cooldown end using contract epoch data
- If blacklisted:

  - disabled

---

## Story ST-06 — Withdraw YFI After Cooldown

**As a** stYFI user
**I want** to withdraw my YFI once cooldown ends
**So that** I can exit the position

### Acceptance Criteria

- Withdraw button only enabled when:

  - cooldown is active
  - cooldown is complete

- After success:

  - staked YFI reduces accordingly
  - wallet balance increases

- If blacklisted:

  - disabled

---

# 4. User Stories (stYFI+ – ERC-4626 Vault)

---

## Story MX-01 — View My stYFI+ Position

**As a** stYFI+ user
**I want** to see the number of vault shares I hold and their underlying YFI value
**So that** I understand my position and how it changes over time

### Acceptance Criteria

- UI shows:

  - number of vault shares (exact)
  - underlying YFI equivalent (assets via `convertToAssets`)

- Clear tooltip explaining:

  - shares ≠ YFI
  - vault PPS increases over time

---

## Story MX-02 — Stake YFI into stYFI+

**As a** user choosing the maximized option
**I want** to deposit YFI into the stYFI+ vault
**So that** I get “set-and-forget” auto-compounding

### Acceptance Criteria

- Approve → Stake two-step process identical to stYFI
- After successful stake:

  - user sees vault shares
  - underlying asset value displayed

- If blacklisted:

  - blocked

---

## Story MX-03 — Understand stYFI+ Reward Handling

**As a** stYFI+ user
**I want** to understand how I receive my rewards
**So that** I’m not confused by the shares mechanic

### Acceptance Criteria

- UI clarifies:

  - Rewards are _not_ immediate transfers; they are incorporated into share value or claimable via unified rewards panel depending on contract mechanism

- If reward mechanism is “claimable”, unified panel shows relevant amounts

---

## Story MX-04 — Start Cooldown (if applicable)

**As a** stYFI+ user
**I want** to begin withdrawal cooldown
**So that** I can redeem my assets later

### Acceptance Criteria

- Same rules as stYFI cooldown
- Reflects timestamps from contract
- If blacklisted:

  - disabled

---

## Story MX-05 — Withdraw from stYFI+

**As a** stYFI+ user
**I want** to redeem my shares for YFI after cooldown
**So that** I can exit my position

### Acceptance Criteria

- Enabled only after cooldown completion
- Withdraw returns YFI (converted via `convertToAssets`)
- After success:

  - wallet balance updates
  - share balance updates

- If blacklisted:

  - disabled

---

# 5. Cross-Cutting `/styfi` User Stories

---

## Story CC-01 — Handle Wallet & Network States

**As a** user
**I want** clear feedback when I’m disconnected or on the wrong network
**So that** I understand why I can’t interact

### Acceptance Criteria

- “Connect Wallet” call to action for disconnected state
- “Wrong Network” banner when chain ≠ Ethereum mainnet
- All actions disabled while on wrong network

---

## Story CC-02 — See Accurate Loading & Error States

**As a** user
**I want** predictable and clear loading / error handling
**So that** I trust the interface

### Acceptance Criteria

- Skeleton states for initial load
- Retry button for errors
- No partial / inconsistent states

---

## Story CC-03 — Unified Transaction Feedback

**As a** user
**I want** consistent transaction feedback
**So that** I know what is happening during a tx

### Acceptance Criteria

- Signing → Submitted → Mining → Success sequence
- Success toast with link to etherscan
- On error, clear message, not raw revert text

---

## Story CC-04 — Blacklist Handling

**As a** restricted user
**I want** to understand why I can’t perform actions
**So that** I’m not confused by disabled buttons

### Acceptance Criteria

- A clear warning banner
- All buttons disabled
- Reads still visible

---

# 6. Non-Goals (for `/styfi`, Part I)

These stories explicitly **not** part of this domain:

- veYFI migration
- LLYFI flows
- Redemption caps
- Governance voting
- Voting power decay visuals
- YBC-specific behaviour
- Historical metrics / analytics
- Transfer UI

---

# 7. Versioning Notes

- This user-story set reflects the frontend behaviour required for BR#1.
- Changes to protocol or FE FRD MUST update this file.
- All stories map 1:1 to FRD sections.
- Cooldown handling uses a shared cross-domain primitive (CooldownState), consistent between stYFI, stYFI+, and LLYFI flows.

---

**End of `user-stories-styfi.md`**
