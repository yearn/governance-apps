# WP3 — OnchainYethClient: Writes (Claim + Redeem)

## Objective
Implement prepared write transactions for yETH:

- Claim & Exit
- Claim & Stay
- Redeem Recovery Vault shares

## Scope

### 1) Claim writes
In `OnchainYethClient` implement:

- `prepareClaimAndExit()` → calls `Claim.claim(true)`
- `prepareClaimAndStay()` → calls `Claim.claim(false)`

Implementation pattern should match stYFI/veYFI clients:
- use `getAccount(wagmiConfig)` + `assertMainnetAccount`
- simulate via `simulateContract(wagmiConfig, ...)`
- submit via `writeContract(wagmiConfig, simulation.request)`

### 2) Redeem writes
Implement `prepareRedeemToEth()`:
- query `shares = RecoveryVault.balanceOf(account)`
- if `shares == 0` throw
- simulate + write `RecoveryVault.redeem(shares, account, account)`

### 3) UX guardrails
- If claim window is closed, UI should disable claim actions (WP1), but also:
  - client should revert naturally; do not try to “force” transactions.
- Ensure errors are normalized by the existing tx error pipeline; do not add custom toasts here.

## Dependencies
- WP2 (ABIs + read helpers)
- WP1 (type shape if method signatures changed)

## Acceptance Criteria
- On a mainnet fork, a seeded account can:
  - claim & exit successfully
  - claim & stay successfully
  - redeem successfully
- Transactions show as confirmed through `useTx` flow.

