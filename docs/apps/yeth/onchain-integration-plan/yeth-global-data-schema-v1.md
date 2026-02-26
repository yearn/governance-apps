# yETH Global Data Feed Schema (v1)

This is the proposed standalone payload for `/yeth` disconnected-wallet global rendering.

## Why separate
- yETH evolves independently from stYFI/veYFI.
- schema failures in one app should not break the others.
- smaller payload and clearer ownership.

## MVP scope
Dynamic values only. Static text/links remain in app code for now.

Excluded on purpose in v1:
- governance links (`approvedYipUrl`, `manualLateClaimUrl`)
- trust copy (`yieldSources`, `risks`)
- contract addresses (already in `lib/clients/yeth/deployment.json`)
- treasury fields (not displayed in current UI)

## Type shape

```ts
type YethGlobalDataV1 = {
  version: 1;
  chainId: 1;
  generatedAt: number; // unix seconds
  blockNumber: number;
  claim: {
    closesAt: number; // unix seconds
  };
  yieldVault: {
    tvlEth: string; // wei, base units
  };
  recoveryVault: {
    pps: string; // wei, assets per 1e18 shares
    totalAssetsEth: string; // wei
    totalShares: string; // wei shares (1e18 decimals)
  };
};
```

## Mock payload (send to external dev)

```json
{
  "version": 1,
  "chainId": 1,
  "generatedAt": 1772126400,
  "blockNumber": 24700000,
  "claim": {
    "closesAt": 1774804800
  },
  "yieldVault": {
    "tvlEth": "2134200000000000000000"
  },
  "recoveryVault": {
    "pps": "1143200000000000000",
    "totalAssetsEth": "512700000000000000000",
    "totalShares": "448500000000000000000"
  }
}
```

## Producer validation rules
- all token amounts are base-unit integer strings (no decimals, no scientific notation)
- `generatedAt`, `blockNumber`, `closesAt` are integers
- `chainId` must be `1` for mainnet feed
- payload is atomic per snapshot (all fields correspond to same block)
