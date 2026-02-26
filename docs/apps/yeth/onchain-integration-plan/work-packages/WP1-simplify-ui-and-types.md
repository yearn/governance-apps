# WP1 — Remove `opensAt` and simplify yETH UI state machine

## Objective
Remove the pre-window (`opensAt`) claim state assumption and simplify UI/account logic.

## Scope

### 1) Data model
- Update `lib/clients/yeth/types.ts`
  - `YethClaimWindow` becomes `{ closesAt: number }`
  - Replace account state modeling:
    - remove `eligible`, `claimStatus`, `exitedEthReceived`, `lastTxHash`
    - keep only what the MVP uses:
      - `snapshotLossEth` (only meaningful when `claimable > 0`)
      - `claimableNowEth`
      - `recoveryVaultShares`
- Update any code that depends on removed fields.

### 2) Mock client + mock controls
- Update `lib/clients/yeth/mock.ts`:
  - remove `CLAIM_WINDOW_OPENS_AT`
  - remove `not_open` logic
  - adjust presets to the new simplified model:
    - `claimable` (claimable > 0)
    - `recovery_position` (shares > 0)
    - `empty` (both 0)
- Update `app/yeth/components/MockControls.tsx` accordingly:
  - remove “Not Open” button
  - keep “Ended” and “Real Time” (optional “Open”)

### 3) Page UI flow
Update `app/yeth/YethPageClient.tsx`:
- Claim window phase becomes: `"open" | "closed"`
- Render wallet-specific recovery UI only when:
  - `account.claimableNowEth > 0`, or
  - `account.recoveryVaultShares > 0`
- Remove:
  - `IneligibleCard`
  - `PostClaimExitedCard`
  - `claimNotOpen` UI variant
- Ensure `TrustFooter` still renders when global state exists.

### 4) Copy cleanup
Update `app/yeth/messages.ts`:
- remove `claimNotOpen` copy and `upcomingStatus`
- adjust fields (remove “Claim Starts”)

### 5) Component cleanup
Update:
- `StatsGrid` to remove the “Eligibility” column (optional but recommended).

## Dependencies
- WP0 should be merged first (deployment file), but can be developed in parallel.

## Acceptance Criteria
- `/yeth` compiles and runs with mock backend.
- No code references `claimWindow.opensAt`.
- UI renders:
  - Claim flow for claimable wallets
  - Recovery position for share-holding wallets
  - Nothing wallet-specific otherwise

