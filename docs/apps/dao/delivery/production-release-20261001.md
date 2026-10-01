# DAO production candidate — October 1, 2026

This candidate prepares the existing application for production reads, wallet actions, and publication from launch.
The operator owns independent acceptance, master promotion, push, deployment, private configuration, and manual hostname setup.
Follow the [canonical production procedure](../production-release.md) after review.

## Source and review scope

The starting worktree was `/Users/hydra/Developer/yearn/governance-apps.agent.integration`, on `agent/integration`.
The full starting SHA was `937784605df3054e489b852cbdb641c76b909b36`, exactly as requested.
Only the pre-existing untracked `outputs/` directory was present. It remains untouched and unstaged.

The final candidate is the commit that adds this handoff. Resolve its full SHA and exact review range with:

```fish
set release_base 937784605df3054e489b852cbdb641c76b909b36
set release_candidate (git log --diff-filter=A -1 --format=%H -- docs/apps/dao/delivery/production-release-20261001.md)
git show --no-patch --format=fuller "$release_candidate"
git log --reverse --format='%H %s' "$release_base..$release_candidate"
git diff --stat "$release_base" "$release_candidate"
git diff --check "$release_base" "$release_candidate"
```

Commit summary:

- `ac35fc6af4569744cac78931ba2e9a41a7fc9d6a` — production workflow inputs, dispatch SHA, master restriction, and preserved configuration regressions.
- `4206b98e5769e2ac21fa40c0a22fff7bfede3944` — production hostname, exact-origin, and local D1 publication coverage.
- The final documentation commit adds the production procedure, current status, and this validation handoff.

The workflow and regression commits have SSH signatures. Signing configuration remains unchanged.
The documented per-command unsigned fallback remains available only for an actual signer failure.

## Changes and preserved behavior

Validation, Worker build, and deployment now receive the same GitHub DAO variable and complete deployment JSON.
The absent flag still defaults to `false`. The operator sets it to `true` in the existing GitHub `production` environment.
Production mode, disabled mocks, E2E, debugging, DAO review controls, and simulation fallback remain explicit.
Manual deployment requires `refs/heads/master`, and checkout uses the dispatch event SHA.
The workflow records the checked-out SHA and preserves environment approval and concurrency controls.
OpenNext still passes `--keep-vars` to Wrangler.

Production remains Worker `governance-apps` with Wrangler route `app.dao-ops.com`.
The operator configures `dao.yearn.fi` manually after shared-host validation.
Both host forms remain supported by the application. No production routing arrangement was added.
Existing non-DAO application values, both Wrangler files, shared D1 identity, publication policy, schema, and quotas remain unchanged.
The reviewed mainnet JSON retains `supportedProposeHooks`.
The Worker-compatible redirect handling from `9377846` remains intact, including redirect rejection without credential forwarding.

The release procedure starts with publication enabled. Its incident control can disable publication without removing retained reads or accounting.
It requires no new mainnet proposal, upload, transaction, provider acceptance session, or manual UAT campaign.

## Evidence boundaries

**Operator report:** preprod is deployed, with two successful mainnet proposals.
Private Worker configuration, secrets, database contents, and deployed UI behavior were not independently inspected during this preparation.

**Public-feed observation:** the retrieved producer snapshot reports `2026-10-01T12:03:47Z`, block `26097337`, and proposal IDs 0 and 1.
Both use chain 1 and Voting `0x543e8871562a8c53e8b6a26835aeecb3a5a13070`.
The application parser accepts the feed against the reviewed mainnet deployment JSON.
Both content envelopes pass canonical-byte and digest checks. Their snapshot protocol status is `PROPOSED`, displayed as discussion.
The [observation record](evidence/production-release-20261001/public-feed-observation.json) retains identities, content digests/CIDs, titles, transaction hashes, and the raw-feed hash.
This is not an independent onchain revalidation or proof of private provider state.

**Automated validation:** isolated source copies use the installed locked dependencies, synthetic public build inputs, local databases, and offline provider fixtures.
No private environment file was copied or read. The build uses a fake JWT sentinel for client-output isolation checks.
Production fixture tests use synthetic trusted deployments. The final fresh Worker build uses the complete reviewed mainnet JSON.
Synthetic RPC/feed URLs and dummy WalletConnect values are validation inputs only.
No automated test used the shared remote database, uploaded to Pinata, or submitted a blockchain transaction.
Historical [UAT](uat-closeout-20260930.md) and [Pinata acceptance](../publication-acceptance-20260923.md) remain intact. Their retained services were not restarted.

## Validation results

The [validation index](evidence/production-release-20261001/validation.json) records commands, attempts, timings, log hashes, and retained artifacts.
Raw evidence and isolated source copies remain under `/private/tmp/dao-production-release-20261001-AtvYEG`.

| Check | Result |
| --- | --- |
| Typecheck and lint | Passed |
| Complete unit/integration suite | 171 files, 1,749 tests passed |
| Focused workflow, configuration, routing, redirect, and publication regressions | 203 tests passed |
| Production environment validation | Passed with complete reviewed deployment JSON and explicit synthetic inputs |
| Generated-feed and dependency policy | Passed |
| Cloudflare type consistency | Regenerated types match the committed file byte-for-byte |
| Required smoke browser suite | 46 passed, one expected production-only skip |
| Required full browser suite | 41 passed on the unchanged full rerun; the earlier initialization failure and isolated passing retry are retained |
| Enabled production routes | Seven passed, plus the unconfigured-publication case passed in its separate runtime phase; all four production host/viewport cases passed |
| Disabled production routes | Passed; zero upstream requests |
| Fresh DAO-enabled OpenNext build | Passed with the complete reviewed mainnet deployment JSON |
| Production Worker size | 3,376.41 KiB gzip; below the 9,216 KiB repository budget |
| Client publication isolation | 227 artifacts passed after the fresh Worker build |
| Documentation links and fish command syntax | 546 DAO file targets passed; changed-document audit passed 151 links, seven anchors, and fish syntax |
| Source consistency | Both isolated copies match all 806 non-documentation source files; application code, migrations, Wrangler configuration, and locked dependencies are unchanged |
| Whitespace | Passed, including new release files |

Retained attempts and dispositions:

- The first sandbox run timed out during local D1 initialization. The unchanged focused suite passed with local socket access.
- Sandbox DNS resolution failed for the public feed and remote identities. Read-only requests passed with network access.
- A temporary feed inspector expected `valid` instead of the existing content state `available`. The corrected inspector passed all content checks.
- The first production route run collided with this task's smoke-test port. The isolated runner now assigns separate ports.
- The first new hostname browser checks used HTTP. Production CSP upgraded asset requests to HTTPS, which the local HTTP server could not serve.
  The corrected test terminates HTTPS browser requests at the isolated local server and retains the production CSP and response bodies.
- Typecheck caught a new test variable named `document` that shadowed the browser global. Renaming the response variable fixes the test scope.
- The new hostname test expected a back-link label used by the not-found state. It now checks the loaded proposal's existing **Proposals** breadcrumb.
- The local HTTPS interceptor initially forwarded HTTPS to the HTTP listener. Dedicated-host rewrites attempted local TLS connections.
  The corrected interceptor preserves the browser's HTTPS origin and identifies its actual local server connection as HTTP.
- The new authoring check expected the connected-wallet introduction while deliberately disconnected.
  It now checks the existing **Create proposal** heading and **Wallet not connected** state. All four hostname/viewport cases pass.
- One link check ran before the isolated copy contained the new evidence files. After copying those files, all 546 targets passed.
- The first full browser suite passed 40 tests and failed the user-rejected transaction case before the test bridge became available.
  Its trace shows a loading page and a Next.js development-router initialization error.
  The unchanged isolated retry passed, followed by all 41 tests in an unchanged full rerun. The error did not recur in either retry.

No application assertion, timeout, origin rule, redirect rule, or production security header was relaxed.
The validation harness changes do not alter deployed routing.
The Worker build reports dependency-bundle warnings about negative-zero comparison and an empty import glob. It completes successfully.

## Repository identity and release inputs

Read-only public master queries returned:

| Configured remote | Repository | Observed master |
| --- | --- | --- |
| `origin` | `0xPickles/governance-apps` | `2863876b2a06f40fa26f2cbbc9c16b82bcc43d56` |
| `upstream` | `yearn/governance-apps` | `06d9ec46458675e36d72b2165ff80189914efb03` |

Both observed commits are ancestors of the starting candidate. The comparisons showed 262 and 198 integration-only commits, respectively.
These include earlier accepted work beyond this preparation's review range.
No remote reference or Git configuration was changed. The actual deployment repository remains an operator choice until its production environment is checked.
The procedure requires fresh remote identity and master checks before conditional promotion. It never assumes `origin` owns deployment.

Private operator inputs remain the approved RPC and WalletConnect values, existing application configuration, public gateway, and private shared JWT installation.
The operator must record the working Worker version, complete backup, effective runtime values, policy/accounting check, and operational owners.
No credential is requested in chat. The JWT installation command is interactive and creates a Worker deployment.

## Review and next action

No reproducible application or configuration blocker remains from this preparation.
Deployment repository ownership and the private operator inputs above remain prerequisites for operator deployment.
Independent review must accept the exact full candidate range and validation report.
Then follow the [production procedure](../production-release.md) from repository identification through final hostname checks.
Production uses the existing shared records and pins without migration or republication. Browser drafts remain origin-specific.
Preprod access protection and shared retention responsibilities remain in force.
Code rollback preserves the database, counters, policy, retained bytes, and pins referenced by real proposals.

No master merge, push, tag, workflow dispatch, deployment, private configuration change, database mutation, upload, or blockchain transaction occurred.
