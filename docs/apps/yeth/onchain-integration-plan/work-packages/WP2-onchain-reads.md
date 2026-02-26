# WP2 — OnchainYethClient: Reads (Global + Account)

## Objective
Implement the onchain read layer for yETH with a minimal surface area.

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
- Reads should use `publicClient.multicall` when available.

**Global state (`getGlobalState`)**
Return:
- `asOf` = canonical now (chain block timestamp if you already have a helper, else local time)
- `claimWindow.closesAt` from `Claim.deadline()`
- contracts from deployment.json
- recoveryVault.pps via `convertToAssets(1e18)`
- recoveryVault.totalAssetsEth, totalShares
- yieldVault.tvlEth via `totalAssets()`
- hardcode the remaining static fields (risks, yieldSources, URLs) the same as mock for now.

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
- If reads fail, return a safe zeroed global/account state (do not crash the route).
- Keep console warnings, but avoid noisy spam during polling.

## Dependencies
- WP0 (deployment config file)
- WP1 (type shape)

## Acceptance Criteria
- Global state loads without needing a connected wallet.
- Account state loads with a connected wallet and updates via polling.
- No references to snapshots or event queries exist in the yETH client.
