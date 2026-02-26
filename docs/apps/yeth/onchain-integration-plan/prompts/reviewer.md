# Reviewer Prompt — yETH Onchain MVP (Simplified)

You are reviewing a PR implementing yETH onchain support for `/yeth`.

## Non-negotiable requirements
- No `opensAt` remains in types/UI/mocks.
- No snapshot hosting/loading code exists.
- No event/log scanning exists.
- Wallet-specific UI appears only when:
  - `claimableNowEth > 0`, or
  - `recoveryVaultShares > 0`.

## Review checklist

### Correctness
- Reads:
  - `claimableNowEth = claimableRaw * recovery_rate / 1e18` (BigInt-safe)
  - PPS uses ERC4626 `convertToAssets(1e18)` or equivalent (BigInt-safe)
- Writes:
  - Claim exit uses `claim(true)`
  - Claim stay uses `claim(false)`
  - Redeem uses `redeem(shares, account, account)` after checking shares > 0

### UX / state machine
- No ineligible or exited screens.
- Claim actions are disabled when deadline has passed.
- Global content (trust footer) still renders when global state is available.

### Architecture
- yETH deployment config is separate (not added to `lib/deployment.json`).
- OnchainYethClient does not require a connected wallet to load global state.
- Protocol wiring sets `yethUsesMockBackend` correctly.

### Tests
- Updated tests cover changed copy/UI assumptions.
- `pnpm test` passes locally.

## What to request if missing
- A fork test checklist and/or evidence (tx hashes, screenshots).
- Reduced ABI surface if ABI includes unnecessary functions.
- Clear error handling for missing RPC / missing public client.

