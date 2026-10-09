# Treasury preprod and production rollout

The release adds a read-only Treasury app and a separate Treasury producer.
Repository preparation does not publish feeds, deploy Workers, or register domains.
The user will associate `treasury.yearn.fi` with Cloudflare manually after shared-host validation.

## Targets and configuration

| Setting | Preprod | Production |
| --- | --- | --- |
| Worker | `governance-apps-preprod` | `governance-apps` |
| GitHub environment | `preprod` | `production` |
| Build flag | `NEXT_PUBLIC_ENABLE_TREASURY=true` | `NEXT_PUBLIC_ENABLE_TREASURY=true` |
| Server runtime URL | `https://data.dao-ops.com/staging/treasury.json` | `https://data.dao-ops.com/prod/treasury.json` |
| Initial app URL | Protected shared Worker URL plus `/treasury` | `https://app.dao-ops.com/treasury` |
| App hostname | `treasury-beta.dao-ops.com`, after association | `treasury.yearn.fi`, associated by the user |

Confirm the existing R2 bucket and its delivery domain before using these proposed feed URLs.
The public flag defaults to `false` in both workflows. Set it in the matching GitHub environment before building.
`TREASURY_DATA_URL` is a Worker runtime value. It is not a public variable or a browser-side R2 credential.
The frontend fetches the JSON through `/api/treasury-data`. It needs no R2 binding, wallet permission, or new database.

Both deployments retain their current production runtime, mock, and E2E settings.
Preserve every existing app value, Cloudflare binding, secret, and preprod access rule.

## 1. Select and verify the release

Record accepted frontend and producer commits after the M3 review.
Promote the reviewed history through each repository's existing release process.
Inspect the actual deployment repository and current remote branch before pushing.
The verified deployment repository is `yearn/governance-apps`, with `preprod` and `production` environments.
On October 9, its latest successful [production run](https://github.com/yearn/governance-apps/actions/runs/37335071319) used source `e205438942f7ff76b26ffe554e202b4b8ab7353a`.
Its current remote `master` was `33b553b424a3857f8dbfc7676e2e2813a2d63570`. Recheck it before promotion.
The local `origin` fork is not the observed production deployment repository.
Review concurrent remote changes and retain them.
Make the candidate commit available on a reviewed branch in that repository before preprod dispatch.
Production `master` promotion follows preprod acceptance; the preprod workflow can check out the candidate branch or full SHA.

Complete the repository checks:

```fish
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:e2e:full
npm run test:e2e:treasury-rollout
npm run test:e2e:treasury-rollout -- --disabled
```

The last two commands build production output and check shared paths, Treasury hostname roots, and disabled behavior locally.
It does not register those domains or contact the live feed.
The existing deployment workflows run typecheck, lint, unit tests, environment validation, Worker build, and Worker size checks.
Run browser release checks explicitly; CI does not currently include them.

Use the producer's `docs/treasury/deployment.md` for artifact verification, service paths, R2 publication, and recovery.
Build one accepted Linux artifact for the actual host architecture. Record its checksum and reviewed configuration hashes.

## 2. Publish the staging feed

Install the producer in its separate staging release directory and service.
Use prefix `staging`, isolated state, and the capacity-qualified RPC or IPC source.
Acquire and validate locally before the first remote publication.

Publish once, then compare the local file with the normal public URL byte for byte.
The stable object is `staging/treasury.json`.
Audit objects use `staging/treasury-snapshots/<sha256>.json`.
Verify that cache rules honor the producer's `no-store` response metadata.

Start the staging service and observe two successful publication cycles and one restart.
Each cycle waits 900 seconds after acquisition and publication finish.
Check actual cadence and freshness under the complete pricing configuration.

## 3. Deploy and validate preprod

Record the previous preprod Worker version and its runtime configuration privately.
Set `TREASURY_DATA_URL` on `governance-apps-preprod` to the accepted staging feed URL.
Set the GitHub `preprod` flag to `true`. Keep mocks and E2E disabled.

Dispatch `deploy-preprod.yml` using the accepted full frontend commit as its `ref`.
Record the workflow source, checked-out commit, resulting Worker version, and deployment time.

Use an existing protected shared Worker or version URL with `/treasury`.
Verify its access protection before sharing it.
The existing `dao-beta.dao-ops.com` hostname rewrites paths into DAO and cannot act as a shared Treasury URL.
The application understands `treasury-beta.dao-ops.com`, but repository changes do not create its DNS or Worker association.
Associate and protect that hostname before accepting navigation from the other beta apps; their Treasury links use this hostname.
The shared Worker path remains suitable for initial isolated validation.

Check:

- The API returns a valid live feed with the staging block, observation time, and registry revision.
- Portfolio totals reconcile with the producer. YFI exclusion and dYFI reference status remain visible.
- Curve receipts show quoted underlying assets and their source details without counting receipt and underlying twice.
- Loans, accountable teams, OTC inventory, and closed history appear in the correct tab.
- The app works on mobile, and hostname-root navigation starts and continues feed polling.
- A failed refresh retains the last good snapshot and reports the failure. Old data becomes visibly stale.
- Existing DAO, Teams, YBC, stYFI, veYFI, and yETH routes still work.

Test failure states locally or on isolated preprod configuration, then restore the accepted staging URL.
The consumer marks data stale after 45 minutes and polls visible Treasury pages once per minute.

## 4. Publish the production feed

After preprod acceptance, install the same verified producer artifact in the separate production Treasury release directory.
Use prefix `prod` and production-only state. Keep the existing governance and DAO service pointers unchanged.
Acquire locally, publish once, validate exact public readback, and start the production Treasury service.
Observe a complete scheduled update before activating the production app.

The live object is `prod/treasury.json`; immutable audit objects remain under `prod/treasury-snapshots/`.
Keep R2 credentials on the producer host. No credential is needed in frontend build variables.

## 5. Deploy production on the shared host

Record the previous production Worker version, source commit, runtime URL, and rollback owner.
Set `TREASURY_DATA_URL` on `governance-apps` to the accepted production URL.
Set `NEXT_PUBLIC_ENABLE_TREASURY=true` in the GitHub `production` environment.

Promote the accepted source to the deployment repository's `master` through its existing history-preserving process.
The production workflow runs only from `master` and checks out the dispatch's exact source SHA.
If promotion produces a different merge commit, validate that result before dispatch.
Record the resulting Worker version and source.

Validate `https://app.dao-ops.com/treasury` and `https://app.dao-ops.com/api/treasury-data`.
Repeat the financial and route checks against the production feed.
This release requires no DAO database migration or existing feed rewrite.

## 6. Associate the final hostname

The user adds `treasury.yearn.fi` to the production Worker through Cloudflare.
Coordinate this immediately after shared-host validation: enabled links from the other production apps already use this hostname.
A DNS record alone does not establish the Worker association.
Verify TLS, `https://treasury.yearn.fi/`, `/api/treasury-data`, app navigation, and polling after the change.

The source contains hostname routing and header behavior for Treasury.
Wrangler route files remain unchanged.
[Wrangler manages configured routes](https://developers.cloudflare.com/workers/wrangler/configuration/), so check the manual association after every deployment.
`--keep-vars` preserves runtime variables; it does not promise to preserve manually added routes.
[Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) describes the dashboard association.

## Monitoring and rollback

Record publication age, valuation coverage, repeated source failures, and service restarts.
A healthy service process does not prove that new snapshots are reaching R2.
Investigate a missed expected cycle before the frontend reaches its 45-minute stale threshold.

Rollback the producer and frontend separately.
For the producer, stop its service, restore a compatible prior binary and configuration, preserve state, and acquire a fresh snapshot.
Do not overwrite the current R2 object with an older audit snapshot.

For the frontend, restore its recorded Worker version and matching runtime configuration.
On the first release, a prior version without Treasury is a valid rollback.
The public feature flag is compiled into the build; changing it requires a new deployment.
Check final hostname associations after rollback.

## Inputs still needed before remote execution

Record the producer host and architecture, service owner, qualified RPC or IPC source, and existing R2 bucket.
Reconfirm `yearn/governance-apps`, the protected preprod URL, and current Worker versions before execution.
Supply private credentials through the existing secret-management process, never through chat or public build variables.
These are operational inputs. They do not change the approved Treasury scope.
