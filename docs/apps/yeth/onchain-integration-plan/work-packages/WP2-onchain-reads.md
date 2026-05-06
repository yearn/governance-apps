# WP2 — yETH Reads (R2-backed Global + Onchain Account)

## Objective
Implement yETH read paths with minimal surface area:
- global state from dedicated yETH R2/static JSON feed
- account state from chain

## Scope

### 1) Add ABIs
Create new ABI modules under `lib/abis/`:
- `YethClaim.ts` exporting `YethClaimAbi`
  - must include: `deadline`, `recovery_rate`, `claimable`, `claim`
- `Erc4626.ts` exporting `Erc4626Abi` (or reuse an existing one if present)
  - must include: `totalAssets`, `totalSupply`, `convertToAssets`, `balanceOf`, `redeem`

Before finalizing ABI names/signatures, verify them against the deployed bytecode ABI
used in production/fork to avoid selector mismatches.

### 2) Implement client
Add `lib/clients/yeth/onchain.ts`:
- `class OnchainYethClient implements YethClient`
- Account reads should use `publicClient.multicall` when available.

**Global state (`getGlobalState`)**
Return:
- `asOf` from yETH global feed metadata (`generatedAt`), fallback local time
- `claimWindow.closesAt` from yETH global feed
- contracts from deployment.json
- recoveryVault fields from yETH global feed (`pps`, `totalAssetsEth`, `totalShares`)
- yieldVault.tvlEth from yETH global feed
- keep static trust/display fields in app constants for MVP:
  - `approvedYipUrl`
  - `manualLateClaimUrl`
  - `yieldSources`
  - `risks`

Optional freshness overlay (non-blocking):
- when chain client is available, allow live deadline override from `Claim.deadline()`.
- if overlay fails, keep feed value.

**Account state (`getAccountState`)**
Reads:
- `claimableRaw = Claim.claimable(address)`
- `recoveryRate = Claim.recovery_rate()`
- `shares = RecoveryVault.balanceOf(address)`

Compute:
- `claimableNowEth = claimableRaw * recoveryRate / 1e18`

Populate account state:
- `snapshotLossEth = claimableRaw` (only meaningful if >0)
- `claimableNowEth`
- `recoveryVaultShares = shares`

No logs, no snapshot list, no eligibility inference.

### 3) Error/fallback behavior
- If yETH global feed is unavailable/invalid, return safe global fallback (do not crash route).
- If account chain reads fail, return safe zeroed account state.
- Keep console warnings, but avoid noisy spam during polling.

## Dependencies
- WP0 (deployment config + yETH global feed contract)
- WP1 (type shape)

## Acceptance Criteria
- Global state loads without needing a connected wallet.
- Account state loads with a connected wallet and updates via polling.
- No references to snapshots or event queries exist in the yETH client.
- yETH global state does not depend on shared stYFI/veYFI global JSON shape.
