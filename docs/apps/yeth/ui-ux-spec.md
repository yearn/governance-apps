# yETH Recovery UI/UX Spec

Version: 0.1  
Status: Active draft and implementation guide

This specification defines the yETH recovery interface behavior for `/yeth`.

## 1. Scope and Principles

- Single-page recovery interface.
- Wallet-gated, state-driven rendering.
- Default path emphasizes immediate exit.
- Advanced verification detail available but not forced.

## 2. Page Structure

### 2.1 Header

- Standard Yearn shell header.
- Wallet connect/account control in the right cluster.

### 2.2 Persistent Retirement Banner

Always visible on yETH route:

- "yETH has been retired. This interface is for recovery."
- Link to approved YIP.
- Claim window status plus countdown.

### 2.3 Primary Recovery Card (Eligible Users)

Always visible when wallet is eligible and unclaimed:

- Snapshot loss (ETH)
- ETH claimable now
- Recovery percentage:
  - "Recovered so far: XX.X% of your original loss"
- Claim status
- Claim window end timestamp (UTC)

### 2.4 Action Paths

#### Primary (recommended): Get ETH now

- Atomic claim and exit
- ETH/WETH transferred immediately
- Recovery session complete

#### Secondary: Keep earning yield (higher risk)

- Opens risk acknowledgement modal
- Atomic claim and stay
- User receives Recovery Vault shares

### 2.5 Risk Acknowledgement Modal

Required only for claim-and-stay:

- Explicit smart-contract and strategy risk statement
- User checkbox consent
- Continue button disabled until consent is checked

### 2.6 Post-Claim States

#### Claimed and Exited

- Status confirmation
- ETH amount received
- Recovered total percentage
- Explorer link for transaction
- No further yield participation actions

#### Claimed and Staying

- Recovery Vault share balance
- Current PPS (ETH/share)
- Current ETH-equivalent value
- Updated recovered percentage
- Primary action: Redeem to ETH now

### 2.7 Trust and Verify Drawer

Flat (non-nested) disclosure:

- Contract addresses (Claim, Recovery Vault A, Yield Vault B)
- Explorer links
- Recovery Vault metrics:
  - PPS
  - total assets
  - no strategies
- Yield Vault metrics:
  - TVL
  - 100% performance fee
  - fee recipient
- Yield sources
- Risks
- Late claim/manual settlement guidance

### 2.8 Claim-Ended Behavior

When claim window closes:

- Claim CTA is disabled
- Explicit notice that claim window ended
- Manual late-claim process link is shown

## 3. UX Rules

- Present tense only.
- No performance or optimization promises.
- No comparative urgency language ("claim early to maximize").
- All numbers reflect current state only.

## 4. Current Implementation Notes

Implemented in:

- `app/yeth/YethPageClient.tsx`
- `app/yeth/messages.ts`
- `app/yeth/components/MockControls.tsx`

The current implementation follows this spec in mock mode and includes debug state cycling for QA and product review.
