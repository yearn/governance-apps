# Treasury frontend

The treasury app is a read-only route at `/treasury`. It uses the shared Yearn header, controls, surfaces, and theme.

## Views

Portfolio shows balances at configured treasury addresses and attributable Robo Treasury inventory. The producer supplies every displayed valuation.

Priced holdings appear in descending value order. Curated unpriced positions remain visible. Other unpriced holdings stay in a collapsed group.

The value summary covers all addresses. Address and team filters change the list only. The YFI control changes valuations, but retains asset balances.

Purpose and withdrawal conditions are separate. Strategic capital is part of the portfolio, but the app does not describe portfolio value as spendable capital.

Loans & allocations shows original funding, expected returns, and current amounts separately. Pending allocations show planned funding. Unknown amounts remain unknown.

Closed positions remain in a collapsed list. Each item has a disposition, a short note, and an evidence link.

## Data boundary

The domain client reads `/api/treasury-data`. The endpoint reads the fixed server configuration `TREASURY_DATA_URL` and validates the complete feed.

Both transport layers limit each request to ten seconds and two MiB. They reject malformed UTF-8, invalid accounting relationships, and example data.

The endpoint requires HTTPS in production. Preview configuration can use HTTP on exactly `localhost`, `127.0.0.1`, or `[::1]`. Credentials and redirects are not accepted.

Failed requests retain the last valid snapshot. Older publications and conflicting publications cannot replace it. A lower block or a conflicting block hash or timestamp also fails validation. Observations more than one minute ahead are rejected.

The app marks stale snapshots after 45 minutes. It checks publication time and block time. Asset details also show the valuation source and observation time.

The app polls each minute while the route is visible. The producer publishes each 15 minutes.

## Local examples

1. Use Node.js 24.
2. Install the locked dependencies with `npm ci`.
3. Start the app with `env NEXT_PUBLIC_USE_MOCKS=true npm run dev`.
4. Open `/treasury`.

The example banner remains visible. Example balances do not represent current treasury values.

The optional `scenario` query selects deterministic review states:

| Query | State |
| --- | --- |
| `?scenario=ready` | Example portfolio and allocations |
| `?scenario=partial` | Unknown prices with known balances |
| `?scenario=stale` | Old observation |
| `?scenario=empty` | No portfolio holdings |
| `?scenario=error` | No valid snapshot |
| `?scenario=loading` | Loading state |
| `?scenario=long-metadata` | Maximum-length metadata for mobile review |

Scenario queries have no effect in the live client. A failed live request never selects examples.

## Local producer integration

1. Publish a valid `mode: "live"` feed through a local HTTP server.
2. Set `TREASURY_DATA_URL` to that server's loopback URL.
3. Set `NEXT_PUBLIC_USE_MOCKS=false`.
4. Start the frontend.
5. Open `/treasury`.
6. Check the observation time, coverage notes, accounts, and asset balances.
7. Stop the feed server.
8. Refresh the app.
9. Check that the previous snapshot remains visible with the refresh notice.

## Rollout

Production keeps the route, endpoint, and navigation link disabled unless `NEXT_PUBLIC_ENABLE_TREASURY=true`. Mocks remain disabled in production.

This package does not add a treasury hostname or deployment configuration. Release approval remains a separate step.

## Validation

The unit tests cover transport bounds, deadlines, publication ordering, precise amount formatting, filters, and unknown values. Browser tests cover keyboard tabs, mobile layout, enlarged text, and failure states.

Required checks:

```sh
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:e2e:full
```

## Integration notes

Merge the feed contract before this frontend package. The example and parser are shared with the producer. No dependency changes are necessary.

The first release includes portfolio and allocation reads. Historical valuation, write actions, and detailed Robo auction tracking remain outside this package.
