# Treasury M3: Curve pricing and release preparation

## Accepted scope

Extend reviewed yvCurve pricing and prepare the existing application and producer for staged release.
Keep the current dashboard layout, portfolio perimeter, allocation registry, and read-only behavior.

The pricing pass examines all 123 yvCurve rows that lacked valuations in the M2 snapshot.
Their 118 distinct receipt contracts passed identity and share-conversion probes.
Only complete supported price graphs enter the shipped configuration.
Unsupported rows retain their raw balances and remain outside priced totals.

The producer adds reviewed legacy Curve LP identities, native ETH legs, Compound receipt conversions, and rate-aware StableSwap-NG quotes.
It also adds exact-token price sources and nested wrapper paths.
In particular, reUSD/scrvUSD requires a rate correction to avoid counting scrvUSD yield twice.

## Acceptance criteria

- Supported Curve positions use snapshot-pinned share conversions and reviewed prices for every pool asset.
- Receipt shares and their underlying value contribute once to the portfolio.
- Missing, stale, or invalid prices remain unknown.
- Every originally unpriced yvCurve row appears in the coverage audit with its result or missing dependency.
- Identity metadata does not imply a strategic purpose or promote unpriced remnants into primary tables.
- The headline reports every unpriced holding, including collapsed rows, independently of filters.
- The Treasury host root starts and continues feed reads.
- Build flags explicitly control the page, API, and navigation in each deployment environment.
- Staging and production producers use separate release pointers, environment files, state, and output paths.
- Current production application history remains in the candidate.

## Snapshot and independent review

The final capture uses Ethereum block **26,157,098** and contains 370 positive holdings.
It prices **140 holdings**, up from 112, with no previously priced holding losing its valuation.
Of the original 123 unpriced yvCurve rows, **27 now price successfully**, totaling **$183,913.25** at this block.
Another 94 lack complete supported paths. Two supported paths fail their configured $1,000 pool floor.

The priced portfolio is **$16,126,834.53**, or **$14,689,119.82** excluding YFI.
These are dated snapshot values, not current balance promises.
The [independent verification](evidence/curve-pricing-verification.json) reconciles all 370 balances, 105 emitted underlying conversions, and all 140 valuations.

The capture made 5,475 recorded requests in 476.81 seconds.
It completed within the 900-second acquisition limit, with 423.19 seconds remaining.
The test used a temporary recorder throttle; scheduled deployment still needs a capacity-qualified RPC or IPC source.
The sleep interval begins after the cycle finishes, so this test's acquisition time would add about eight minutes to the 15-minute interval.

Snapshot SHA-256: `3346459286c4c52b9fbd2aac1ebc7053ec4426197d791156c319ec62a4c984ae`.

The full coverage audit is `docs/treasury/curve-coverage-review-20261009.md` in the producer repository.
Its companion `evidence/m3-receipt-coverage.json` lists all 123 rows.
Research catalog estimates help order follow-up work but never enter live totals.
Residual positions include material assets such as INV, RSUP, GEAR, and newer stablecoin variants; they are not all dust.

The final feed remains V1. Registry and wire-contract files keep exact cross-repository parity.
The independent review checks raw balances, emitted conversions, pricing arithmetic, source freshness, and YFI exclusion.
This review is implementation assurance, not a formal protocol audit or a withdrawal guarantee.

## Verification

| Check | Result |
| --- | --- |
| Final typecheck, lint, dependency policy | Passed |
| Final frontend unit suite | 2,099 tests across 190 files |
| Broad browser smoke | 49 passed, one expected skip, one DAO loading timeout; that unchanged case passed on retry |
| Full browser suite after production merge | 46 passed |
| Focused Treasury smoke/full after the coverage-label fix | 8 passed |
| Production-build host gates | Six passed across enabled and disabled builds |
| OpenNext rollout build and both Worker size gates | Passed; measured gzip size 3,284.72 KiB against the 9,216 KiB budget |
| Producer formatting, strict Clippy, tests | Passed; 118 tests, including 61 portable acceptance cases |
| Producer release packaging | Passed for both isolated Treasury services |
| Live feed through the final preview | Exact API match; new Curve rows, global coverage count, YFI toggle, allocations, 320-pixel layout, and retained data after failure passed |
| Shared contract files | Four files match byte for byte across repositories |

The [live browser record](evidence/curve-live-browser.json) binds the final snapshot and checked frontend source.
The host and Worker build gates preceded the final count-only correction.
That correction then passed typecheck, lint, the complete unit suite, focused browsers, and the actual-feed browser check.
The deployment workflows will rebuild the accepted source with the actual environment values before remote rollout.

## Integration and rollout

| Repository | Accepted implementation |
| --- | --- |
| Frontend | `899c5ca3bd8c9c0a681a8a5cf07a5dc7733c8ed8` |
| Producer | `8dbb352` |

The final frontend handoff commit adds documentation and evidence only.
Both accepted-work lanes use `agent/integration` and the milestone tag `integration/treasury-m3`.

The frontend candidate preserves current production master `33b553b424a3857f8dbfc7676e2e2813a2d63570`.
That merge retains the recent DAO, dependency, and alert changes.
Release testing also fixed Treasury host polling and the global headline coverage count.

Both workflows pass the default-false Treasury flag through validation, build, and deployment.
Host routing supports `treasury.yearn.fi` and `treasury-beta.dao-ops.com`.
This does not create DNS records or Worker associations.
A protected beta association is required before accepting links from the other preprod apps.

Follow the [ordered rollout](production-rollout.md) for staging publication, preprod validation, production activation, and manual hostname association.
Install only the Treasury binary from the producer artifact into its separate release directories.
No existing governance or DAO binary pointer needs to change.
No remote push, R2 publication, service installation, Worker deployment, or DNS change occurred during this pass.

The local review URL remains `http://127.0.0.1:3339/treasury`.
It reads a captured live snapshot and will become stale as that capture ages.
