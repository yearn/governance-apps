# Treasury MVP testing handoff

The latest accepted pass is [Curve pricing and release preparation](curve-rollout-work-package.md), tagged `integration/treasury-m3` in both repositories. It extends nested Curve pricing, preserves current production history, and prepares the staged rollout.
The sections below preserve the initial MVP record. Its snapshot values and test counts are historical.

The dashboard and producer are integrated for testing. Production deployment and remote publication have not started.

## Accepted code

| Repository | Integration branch | Accepted code commit |
| --- | --- | --- |
| governance-apps | `agent/integration` | `d18390f` |
| gov-apps-stats | `agent/integration` | `17fa1fc` |

Both repositories use the milestone tag `integration/treasury-m0` after this handoff is recorded.
The final handoff commits add documentation and evidence only.

The shared [specification](planning-spec.md), [schema](feed.schema.json), [registry](registry.json), and acceptance cases match across repositories.
The registry hash is `c3642464d46a05052627a88ff5d9d372b14bb62aa8fcdb46df523e2a5fdbc37c`.

## Included scope

- Ethereum holdings at ychad, treasury.ychad, the Robo destination, and attributable active Robo custody.
- Portfolio values with and without priced YFI exposure, address and team filters, and explicit valuation gaps.
- Eight loan or allocation records, including pending Stonk funding. Four research positions map to portfolio holdings.
- The agreed accountable teams, original funding, provisional returns, measured amounts, and compact history for twenty closed or excluded cases.
- A read-only producer with snapshot-pinned reads, bounded discovery, reviewed pricing, local output, and isolated conditional publication.

## Validation

| Check | Result |
| --- | --- |
| Frontend typecheck and lint | Passed after review fixes |
| Complete frontend unit suite | 1,852 tests passed across 176 files |
| Treasury schema validation | 65 tests passed, including 42 shared acceptance cases |
| Browser smoke suite | 48 passed; one expected production-only skip |
| Full browser suite | 38 passed initially; six navigation/timing failures all passed unchanged on sequential rerun |
| Dedicated treasury browser cases | Two smoke and four full cases passed |
| Rust formatting, tests, strict Clippy | Passed; 98 tests, including shared acceptance cases |
| Rust release build and packaging | Passed for all existing binaries and the new treasury binary |
| Cross-repository contract files | Exact byte parity confirmed |
| Real producer through frontend API | Parsed output matched the actual producer snapshot |
| Live dashboard interaction | Desktop, mobile, filters, tabs, YFI toggle, and retained data after outage passed |

The browser check included a 320-pixel viewport with all inventory and position details expanded.
No page errors occurred during the live acceptance run.

The independent review checked accounting, attribution, metadata safety, request bounds, publication ordering, and rollout gates.
It found no remaining blocking issue after fixes. This is a code review, not a formal protocol audit.

## Recorded chain evidence

The [independent pinned verification](evidence/pinned-verification.json) used Ethereum block **26,155,891**.
It verified eleven balances, three vault conversions, five allocation readings, nine oracle identities, and all twenty-eight priced valuations.
It also checked all twelve additional Robo custody accounts, including both splitter children.

The [browser acceptance record](evidence/live-browser.json) used a later producer snapshot at block **26,155,942**.
That snapshot contains fifteen accounts and 370 positive holdings. Twenty-eight holdings are priced; 342 are unpriced.
Two unreadable unsolicited token/account balances are excluded with coverage warnings. Required reviewed balances succeeded.

The snapshot SHA-256 is `428407181cc6a5eeaa619773720c53c2a9f0c180a445c6e529e3a1b3a554c02c`.
These are dated verification records, not current balance promises.

## Local preview

The initial review session uses `http://127.0.0.1:3339/treasury`.
Its source is the captured live snapshot at `http://127.0.0.1:3340/treasury.json`.
The preview is local and temporary. It does not publish to R2 or automatically acquire new chain snapshots.
The dashboard will mark this capture stale as it ages.

To reproduce a current local snapshot, configure `TREASURY_RPC_URL` with a capacity-qualified Ethereum endpoint. Then run from the producer repository. The expanded inventory can exceed anonymous public-provider limits.

```fish
env TREASURY_RPC_TRANSPORT=http cargo run --locked --bin gov-apps-treasury -- local packaging/treasury-config.example.json /tmp/treasury-state /tmp/treasury.json
```

Use `run` instead of `local` for repeated local acquisition. The interval is 900 seconds after each completed cycle.
Serve the output through a loopback HTTP server. Then start the frontend with its URL:

```fish
env NEXT_PUBLIC_RUNTIME_MODE=development NEXT_PUBLIC_USE_MOCKS=false NEXT_PUBLIC_ENABLE_TREASURY=true TREASURY_DATA_URL=http://127.0.0.1:3340/treasury.json npm run dev -- --hostname 127.0.0.1 --port 3339
```

For deterministic examples, set `NEXT_PUBLIC_USE_MOCKS=true`. The example banner must remain visible.
Failed live reads never select example data.

## Remaining boundaries

- Unsupported LPs and wrappers, including yCRV and ysyBOLD, retain balances without guessed prices. WBTC pricing is also deferred.
- Sherlock's refundable amount remains unknown. Aerodrome's original-asset return target remains provisional.
- YBC is returnable through a YIP; its original 200 YFI does not guarantee an exact redemption amount.
- Stonk remains pending until the registry records verified execution and attributable custody.
- New or retired Robo deployment paths need configuration review. Detailed auction history and DCA campaign tracking remain P2.
- Actual R2 publication, service installation, and production hosting have not been tested or enabled.

The route, API, and navigation remain disabled in production unless `NEXT_PUBLIC_ENABLE_TREASURY=true`.
No treasury subdomain was introduced.

The publication adapter uses conditional writes and exact readback. The supported conditions were checked against the current [Cloudflare R2 S3 API reference](https://developers.cloudflare.com/r2/api/s3/api/).
Before staging publication, verify the configured R2 target and credentials with the staging service procedure.
