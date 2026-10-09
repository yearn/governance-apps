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


## Accepted verification

The final live snapshot uses Ethereum block **26,156,858** and contains 370 positive holdings.
It prices **112 holdings**, compared with 50 in the previous preview.
The main tables have **3 unpriced positions**, compared with 16 before this pass.
These are SAFE, SLP-KP3R-WETH, yvCurve-reUSD-scrvUSD-f.

The feed retains 258 unpriced balances in total.
That total includes 247 other balances and 8 reviewed lookalikes.
An unpriced balance is not assumed worthless or unsolicited.

The producer now follows reviewed direct and composite feeds, nested vault conversions, proportional Curve pool assets, and bounded Curve EMA quotes.
The ysyBOLD path converts through yBOLD into BOLD, then uses the reviewed BOLD/USDC pool quote.
The BOLD quote uses the indexed StableSwap-NG oracle and its price timestamp, with explicit liquidity, age, and ratio bounds.
No dollar peg is assumed.

The [independent verification](evidence/asset-pricing-verification.json) checks all 370 emitted raw balances and all 112 priced rows.
It reconstructs USD values, YFI exclusion, observation times, redemption funding, and both headline totals from recorded RPC inputs.
The snapshot SHA-256 is `214bd81872e84f22564d1d3a0a4ced70dfae9c360f865e173a071af06fdee67f`.

The [live browser record](evidence/asset-live-browser.json) verifies the exact producer payload through the frontend API.
It covers loaded icons, eight lookalikes, funding labels, exact redemption payment details, YFI exclusion, address filters, OTC context, tab-specific notes, and retained data after an outage.
Desktop and 320-pixel views were inspected. No page errors occurred.

| Check | Result |
| --- | --- |
| Frontend typecheck and lint | Passed |
| Full frontend unit suite | 1,903 tests passed across 181 files |
| Browser smoke suite | 47 passed and one expected skip; one unchanged DAO initialization failure passed on isolated rerun |
| Broad browser suite | 43 passed; two unchanged navigation/timing failures passed on isolated rerun |
| Final treasury browser cases | All five passed; the new redemption test needed a selector correction for the qualified value cell |
| Mobile polish regression | Redemption and maximum-length metadata cases passed after the pill adjustment |
| Rust checks | Formatting, complete tests, strict Clippy, and release packaging passed |
| Shared contract | Schema, registry, example, and 61 acceptance cases have exact byte parity |
| Independent review | No remaining code or accounting blocker; provider capacity remains an operational prerequisite |

## Integration and rollout

The accepted milestone is `integration/treasury-m2` in both repositories' `agent/integration` lanes.
The frontend consumer must be released with the paired producer because older strict consumers reject redemption metadata.
The completed consumer code is `8817254bf6bb30ae950754736765774623e89d45`; the final documentation commit adds this evidence.
No production deployment or remote publication occurred.

The expanded snapshot needs a capacity-qualified RPC endpoint or local IPC for scheduled operation.
An anonymous public endpoint returned HTTP 429 during the first acquisition.
Verification used a temporary recording proxy with an 85-millisecond request gap; this proxy is not part of the shipped service.
The final acquisition took 323.994 seconds for 3,701 requests.
The recorded capture validates the financial output, not unattended public-provider capacity.
Invalid acquisition preserves the last valid snapshot.

The local preview remains `http://127.0.0.1:3339/treasury` with the recorded snapshot.
It is a temporary testing view and marks that capture stale as it ages.
