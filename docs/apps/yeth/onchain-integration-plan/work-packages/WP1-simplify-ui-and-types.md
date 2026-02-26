# WP1 — Remove `opensAt` and simplify yETH UI state machine

## Objective
Remove the pre-window (`opensAt`) claim state assumption and simplify UI/account logic.

Status in current codebase: **still required**. The current implementation still relies on:
- `claimWindow.opensAt`
- account `eligible` / `claimStatus`
- dedicated ineligible/exited UI branches

## Scope

### 1) Data model
- Update `lib/clients/yeth/types.ts`
  - `YethClaimWindow` becomes `{ closesAt: number }`
  - Replace account state modeling with observable balances:
    - remove `eligible`, `claimStatus`, `exitedEthReceived`, `lastTxHash`
    - keep only what the MVP uses:
      - `snapshotLossEth` (only meaningful when `claimable > 0`)
      - `claimableNowEth`
      - `recoveryVaultShares`
  - Remove unused global fields:
    - `treasuryRecoveryVaultShares`
    - `treasuryYieldShareBps`
- Update any code that depends on removed fields.

### 2) Mock client + mock controls
- Update `lib/clients/yeth/mock.ts`:
  - remove `CLAIM_WINDOW_OPENS_AT`
  - remove pre-window simulation logic
  - adjust presets to the new simplified model:
    - `claimable` (claimable > 0)
    - `recovery_position` (shares > 0)
    - `empty` (both 0)
- Update `app/yeth/components/MockControls.tsx` accordingly:
  - remove any dependence on `claimWindow.opensAt`
  - keep “Ended” and “Real Time” controls

### 3) Page UI flow
Update `app/yeth/YethPageClient.tsx`:
- Claim window phase becomes: `"open" | "closed"`
- Render wallet-specific recovery UI only when:
  - `account.claimableNowEth > 0`, or
  - `account.recoveryVaultShares > 0`
- Remove:
  - `IneligibleCard`
  - `PostClaimExitedCard`
- Ensure `TrustFooter` still renders when global state exists.

### 4) Copy cleanup
Update `app/yeth/messages.ts`:
- remove eligibility/ineligible language that no longer applies to MVP logic
- keep copy aligned to observable states only (`claimable`, `shares`, `closed`)

### 5) Component cleanup
Update:
- `StatsGrid` to remove the “Eligibility” column.

## Dependencies
- WP0 should be merged first (deployment file), but can be developed in parallel.

## Acceptance Criteria
- `/yeth` compiles and runs with mock backend.
- No code references `claimWindow.opensAt`.
- UI renders:
  - Claim flow for claimable wallets
  - Recovery position for share-holding wallets
  - Nothing wallet-specific otherwise
