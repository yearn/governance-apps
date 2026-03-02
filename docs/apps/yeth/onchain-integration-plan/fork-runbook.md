# yETH Mainnet Fork Runbook (MVP)

This runbook validates the onchain integration against a **fork of Ethereum mainnet**
while keeping Chain ID **1** (to satisfy app network guards).

## 1) Start a forked node

Using anvil (example):

```bash
anvil --fork-url $MAINNET_RPC_URL --chain-id 1 --port 8545
```

Set app env:

```bash
export NEXT_PUBLIC_RPC_URLS="http://127.0.0.1:8545"
export NEXT_PUBLIC_ENABLE_YETH="true"
export NEXT_PUBLIC_YETH_GLOBAL_DATA_URL="https://<your-bucket>/yeth-global.json"
export NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK="true"
```

Then run the app normally.

## 2) Seed a test wallet with claimable balance (fork-only)

Because this MVP does not ship a snapshot list, most wallets will show no yETH state.
To test the flows, seed claimability in the fork:

1. Read the yETH Claim contract management address:
   - call `management()` on `YETH_CLAIM`

2. Impersonate that management address in your fork node (method depends on tool):
   - Hardhat: `hardhat_impersonateAccount`
   - Anvil: `anvil_impersonateAccount`

3. Ensure the impersonated management address has ETH for gas.
   - If needed, fund it in the fork (example: `anvil_setBalance`).

4. Verify the exact admin method names in the deployed ABI.
   - Common names are `set_claimable` and `set_deadline`, but confirm first.

5. Call `set_claimable([yourAddress], [amountWei])` as management.

Suggested seed amount:
- `amountWei = 1e18` (represents 1 ETH of base claimable before recovery_rate)

Then confirm in the UI:
- `claimableNowEth > 0` and the claim cards render.

## 3) Test claim & exit

- Click “Claim X ETH & Exit”
- Confirm tx
- After confirmation:
  - claimable should become 0 (UI will no longer render yETH wallet-specific content in this MVP)

## 4) Test claim & stay + redeem

Seed claimability again (step 2), then:
- Click “Deposit claim into Recovery Vault”
- Confirm tx
- UI should now show Recovery Vault position (shares > 0)
- Click “Exit with X ETH”
- Confirm tx
- After redeem, shares should return to 0 (UI will no longer render wallet-specific content)

## 5) Test claim deadline closed behavior

Impersonate management and call the verified deadline admin method
(commonly `set_deadline(now - 1)`) on the Claim contract.
Reload:
- Banner should show “Claim ended”
- Claim action should be disabled / replaced by manual link
