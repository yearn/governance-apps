# DAO Beta Review Runbook

Status: operator procedure for the unaccepted M2 mock review candidate.

This runbook covers the mandatory Access boundary for all six governance beta
hosts and the DAO review candidate on the shared preproduction Worker. It does
not authorize a deployment, public production exposure, DNS mutation, Access
mutation, or M3/backend/IPFS/onchain work by itself.

## Safety boundary

- The candidate is deterministic and mock-backed.
- These exact hosts require Cloudflare Access on every path:
  - `styfi-beta.dao-ops.com`
  - `veyfi-beta.dao-ops.com`
  - `yeth-beta.dao-ops.com`
  - `teams-beta.dao-ops.com`
  - `ybc-beta.dao-ops.com`
  - `dao-beta.dao-ops.com`
- Each host remains noncanonical, excluded from discovery, and must return
  `X-Robots-Tag: noindex, nofollow`. Robots policy does not authenticate users.
- Use exact self-hosted application hostnames. Do not use `*.dao-ops.com`, add
  `app.dao-ops.com`, or include a public `*.yearn.fi` host.
- Do not add bypasses for assets, `/_next`, APIs, health checks, or nested app
  routes. Automation needs a separate narrow Service Auth policy and stored
  service token.
- `NEXT_PUBLIC_ENABLE_DAO` gates the shared preproduction deployment, not one
  hostname. While true, `/dao` can also be reached through other hosts served
  by that Worker.
- The production workflow hardcodes `NEXT_PUBLIC_ENABLE_DAO=false` and has no
  DAO custom-domain route. Do not add `dao.yearn.fi` to public Wrangler routes,
  canonical metadata, sitemap, `llms.txt`, or navigation.

## One-time setup

1. Confirm `dao-beta.dao-ops.com` is in `wrangler.preprod.jsonc` with
   `custom_domain: true` and is absent from `wrangler.jsonc`.
2. In the protected GitHub `preprod` environment, set the variable
   `NEXT_PUBLIC_ENABLE_DAO=true`.
3. To expose the DAO fixture controls on `dao-beta.dao-ops.com`, set
   `NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS=true`. This flag is DAO-only and
   does not expose the controls on another beta hostname.
4. Keep these values false:
   - `NEXT_PUBLIC_USE_MOCKS`
   - `NEXT_PUBLIC_E2E`
   - `NEXT_PUBLIC_ENABLE_DEBUG_UI`
5. Supply valid production-shaped `NEXT_PUBLIC_WC_PROJECT_ID`,
   `NEXT_PUBLIC_GLOBAL_DATA_URL`, and comma-separated HTTPS
   `NEXT_PUBLIC_RPC_URLS`. Never use localhost or loopback RPC values.
6. Before sharing any beta hostname, audit the Cloudflare Zero Trust identity
   providers, reusable policies, Access applications, exact hostnames, and rule
   precedence.
7. Use the existing GitHub identity provider and existing reusable internal-beta
   organization/team allow policy only when their configured identity matches
   the intended audience. Never infer an email domain, admit any GitHub user,
   use `Everyone`, or add a public bypass. If the authorized organization/team
   cannot be confirmed, stop and ask for that one decision.
8. Bind that reusable allow policy to six exact self-hosted Access applications,
   or use another API-supported exact-host structure with the same isolation.
   Do not change DNS, TLS, custom domains, Worker routes, or application paths.

Set the public flags in the protected GitHub `preprod` environment before the
workflow build. `NEXT_PUBLIC_*` values are compiled into browser JavaScript;
changing variables later in the Cloudflare Worker dashboard cannot rewrite the
deployed client bundle. Do not use the Worker dashboard to turn on global mock,
E2E, or debug flags.

Wrangler custom-domain deployment provisions hostname routing and managed TLS
within the configured Cloudflare zone. It does not configure Access. Confirm
DNS ownership, certificate issuance, and all six Access applications before UAT.

## Deploy an exact candidate

1. Record the reviewed commit SHA; do not deploy a moving branch reference.
2. Manually dispatch `Deploy Preprod` and pass that SHA in its required `ref`
   input.
3. Confirm dependency policy, typecheck, lint, unit tests, production-env
   validation, OpenNext build, and Worker-size validation all passed before the
   deploy step.
4. Record the workflow run, commit SHA, Worker version, operator, and timestamp
   in the WP7C evidence ledger.

The workflow compiles production runtime with route-local DAO data enabled and,
when requested, DAO-only beta review controls. Global mocks, E2E, the global
debug route, and the Test Bridge remain disabled. Do not override the workflow
with preview runtime or global mock flags.

## Verify after deployment

For each of the six exact hosts, record sanitized Access evidence:

- an unauthenticated incognito request is challenged or redirected before the
  application can be used;
- an approved GitHub organization/team member can enter;
- an unrelated GitHub account is denied;
- a representative nested route is also protected;
- the correct application loads after authentication;
- cross-beta navigation does not lead to an unprotected destination;
- wallet connection and wallet popups still work after authentication; and
- authenticated responses keep the intended noindex and canonical policy.

Also prove that `app.dao-ops.com`, public `*.yearn.fi` hosts, shared path hosts,
and unrelated `dao-ops.com` hosts were not added to the Access applications.
Sanitize identities, emails, cookies, tokens, OAuth secrets, and private policy
data from all evidence. Never mark an unchecked host complete.

Check both `GET` and `HEAD` where applicable:

- `https://dao-beta.dao-ops.com/` renders `Proposals` and clean proposal links.
- `/propose` renders one `Create proposal` H1.
- `/proposals/2` renders its proposal title and contextual breadcrumbs.
- board → detail → Back restores the selected `?group=` URL.
- nested copy and Etherscan controls work without opening the proposal.
- authoring shows separate publish and create steps; normal eligibility has one
  affected range, and blocked capacity names the exact full epoch.
- the `Debug` control is present on `dao-beta.dao-ops.com` when
  `NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS=true`, and is absent from other beta
  hosts.
- no E2E Test Bridge or deterministic E2E wallet is present.
- response headers include CSP, HSTS, and `X-Robots-Tag: noindex, nofollow`.
- there is no DAO canonical link or JSON-LD, and DAO is absent from sitemap and
  `llms.txt`.
- browser network/console logs contain no request to `127.0.0.1:8546`, no
  `eth_accounts` failure, and no unhandled wallet/RPC error.
- production-mode checks with the flag false return 404 for `/dao`,
  `/dao/propose`, and `/dao/proposals/2`.

Treat the list above as manual operator UAT against the deployed host. Do not
run the normal Playwright smoke suite against this E2E-off deployment: that
suite expects the local Test Bridge and deterministic account. For a
non-mutating header check, run `curl -fsSI https://dao-beta.dao-ops.com/` and
repeat it for `/propose` and `/proposals/2`; inspect the rendered routes and
client navigation in a normal browser. The Playwright beta hostname resolver is
intentionally disabled for remote URLs.
Production CSP upgrades insecure requests, so a locally mapped
`http://dao-beta.dao-ops.com:<port>` cannot hydrate assets from an HTTP-only
Next server. Do not weaken CSP or add a production exception for local testing.
Use the local production response to verify beta status, robots policy,
canonical absence, and clean server-rendered hrefs; use development-host E2E
for hydrated clean-path navigation; then repeat the complete gate against the
deployed managed-HTTPS hostname.

## Troubleshooting

If the DAO shell renders but changes from loading to **Proposal data is
unavailable**, the Worker route and browser bundle were built with different
DAO flag values. Set both `NEXT_PUBLIC_ENABLE_DAO=true` and, if desired,
`NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS=true` in the protected GitHub
`preprod` environment, then run a new `Deploy Preprod` build for the exact
candidate SHA. A Worker-dashboard-only change cannot fix the browser bundle.

If the route loads but `Debug` is absent, confirm the DAO review-controls flag
was present during the GitHub build and that the browser hostname is exactly
`dao-beta.dao-ops.com`. Keep `NEXT_PUBLIC_USE_MOCKS`, `NEXT_PUBLIC_E2E`, and
`NEXT_PUBLIC_ENABLE_DEBUG_UI` false.

If Access configuration cannot be inspected or changed with the available
authorized tooling, do not weaken the requirement. Record the six exact
application bindings, reusable GitHub organization/team policy, allow and deny
checks, and rollback steps as operator work. Keep the external gate blocked.

## Roll back

Access rollback is separate from application rollback. Disable or delete only
the six exact Access application bindings and any policy object created for this
change. Do not remove DNS records, custom domains, TLS, or Worker routes. If the
reusable policy predated this work, detach it but do not delete it.

1. Set the protected preproduction `NEXT_PUBLIC_ENABLE_DAO` value to `false`.
   Set `NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS=false` as well.
2. Re-dispatch `Deploy Preprod` for the approved rollback commit/ref.
3. Verify DAO root, authoring, and detail requests return 404 and that the other
   preproduction apps remain healthy.
4. Record the workflow run and verification in the evidence ledger.

The preproduction Worker is shared. Rolling back its Worker version affects all
beta hosts, so prefer the DAO flag-off rebuild when other apps are healthy.
