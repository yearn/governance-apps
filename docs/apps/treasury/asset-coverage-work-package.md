# Treasury asset coverage and identity

## Scope

Improve token icons, recognised asset pricing, wrapper conversion, and contract identity grouping.
Clarify OTC inventory and keep supporting sections within their relevant tabs.
The existing compact table design and feed V1 contract remain in place.

## Acceptance

- ENS, SAFE, cbBTC, CVX, and supported Yearn assets use verified icon sources.
- Icon selection uses chain and address, never a ticker match.
- Pricing uses reviewed identities, dated observations, and verified conversions.
- Nested vault shares retain their balances and receive converted underlying valuations where supported.
- Unsupported or expired valuations remain unknown.
- Eight reviewed lookalikes appear in a separate disclosure without altering balances or totals.
- OTC inventory explains unreconciled funding and the two separate current token balances.
- Closed positions appear only in Loans & allocations. Snapshot details appear only in Portfolio.
- Mobile layout, keyboard navigation, filters, and retained snapshots still work.

## Contract identity

The frontend recognises eight observed lookalike contracts by exact Ethereum address.
The evidence compares token metadata with the issuer's published Ethereum contract.
This classification does not assert malicious intent or assign a value.

| Issuer | Published contract | Observed lookalike contracts |
| --- | --- | --- |
| [Circle USDC](https://developers.circle.com/stablecoins/usdc-contract-addresses) | `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` | `0x211c1eb92d74cbda58ba82116502fd02dd8f319e`, `0xa04a3a553548090a7b81d2de75b8a08ee45860e1`, `0x89d3ac7c32aa14bee6fa90e041241dc4eebbdfb3` |
| [Tether USD₮](https://tether.to/en/supported-protocols/) | `0xdac17f958d2ee523a2206206994597c13d831ec7` | `0x94a2a4d842f522dac0e793f2f9ad08058997d06d`, `0xb44d28295e3d7c898c087a1cb209a444ded5e4c1`, `0xff3a7ee33203f5d3c69c309b5425b0e3fefb736b`, `0x0b39bb088f03b0baea1aac64aaeab85e714c76e2` |
| [Safe](https://safefoundation.org/token) | `0x5afe3855358e112b5647b952709e6165e1c1eeee` | `0x9ae357521153fb07be6f5792ce7a49752638fbb7` |

Two observed contracts use visually similar non-Latin letters.
Renamed metadata does not affect the address decision. Canonical tokens and unrelated contracts remain outside this group.
Yearn vault names that contain USDC or USDT do not establish a lookalike.

## Icon sources

Eighteen mappings use revision-pinned files from [Yearn tokenAssets](https://github.com/yearn/tokenAssets/tree/614e8aa9acf30ed66575ed2e38ae27d9779a165d/tokens/1).
Four mappings use image references from [Uniswap's Ethereum list](https://github.com/Uniswap/default-token-list/blob/583cb696cc15778536fe0ddd416de5bd81be2023/src/tokens/mainnet.json).
All 22 URLs returned decodable images during verification.
No token-supplied image URL enters the component. A failed image shows initials.

## OTC inventory evidence

The position remains treasury-owned settlement inventory managed by yLockers.
Its current amounts are separate balances: st-yCRV vault shares and liquid yCRV at the swapper.
The UI does not add shares to liquid tokens or infer a loan repayment amount.

[PR1444](https://github.com/yearn/chief-multisig-officer/pull/1444) funds the initial swapper.
[PR1450](https://github.com/yearn/chief-multisig-officer/pull/1450) adds inventory.
[PR1530](https://github.com/yearn/chief-multisig-officer/pull/1530) changes the swapper and vault-share handling.
[PR1569](https://github.com/yearn/chief-multisig-officer/pull/1569) adds more inventory.
These events do not establish a reconciled aggregate funding amount.

The [deployed swapper](https://etherscan.io/address/0x1B7e6fB817112b036EAa4AE85479fF1C2E9330A2#code) redeems shares when needed and transfers liquid yCRV to buyers.
It deposits sale proceeds into the configured treasury vault. Authorised management can sweep residual tokens to ychad.

The shared registry changes explanatory fields and evidence links only.
The new registry SHA-256 is `ab1492554b8486cd5e765e51fab589e31798dec1e833ed6ea645b8c7a56100b0`.
Amounts, team assignments, ownership, and return terms remain unchanged.


## dYFI redemption reference

The user selected inclusion of the redemption reference with its funding status.
The producer values the holding as YFI received minus the required ETH payment, with a minimum value of zero.
It reads the exact payment for the actual holding at the snapshot block.
The entire reference is excluded from the value without YFI.

This reference does not promise immediate redemption or establish a secondary-market sale price.
When the contract lacks YFI, the row says “Awaiting YFI funding.”
The headline identifies included redemption references. Expanded details show the required ETH and the available YFI.
A disabled contract or invalid quote does not produce a reference valuation.

The [Yearn address registry](https://docs.yearn.fi/developers/addresses/veyfi-contracts) identifies the current contract:
`0x4707C855323545223fA2bA4150A83950F6F53b6E`.
The [veYFI documentation](https://docs.yearn.fi/contributing/governance/veyfi) describes the right to receive YFI against an ETH payment.
The producer follows the current contract's verified source and oracle requirements.
Its payment-feed maximum age is 24 hours; an older local contract copy used one hour.

The [legacy site](https://legacy-veyfi.yearn.fi/) still references the older contract:
`0x7dC3A74F0684fc026f9163C6D5c3C99fda2cf60a`.
At research block 26,156,726, the old contract was disabled and held no YFI.
The current contract was enabled but also held no YFI.
It quoted 0.010208084974058498 ETH for the treasury's 0.041430173248806861 dYFI.
These observations are recorded in [redemption research](evidence/dyfi-redemption-research.json).
They are dated observations, not continuing funding guarantees.
