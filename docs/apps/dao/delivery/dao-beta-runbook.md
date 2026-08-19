# DAO Beta Review Runbook

Status: operator procedure for the unaccepted M2 mock review candidate.

This runbook configures `dao-beta.dao-ops.com` on the shared preproduction
Worker. It does not authorize a deployment, public production exposure, DNS
mutation, or M3/backend/IPFS/onchain work by itself.

## Safety boundary

- The candidate is deterministic and mock-backed.
- `dao-beta.dao-ops.com` is noncanonical, excluded from discovery, and must
  return `X-Robots-Tag: noindex, nofollow`.
- A Cloudflare custom domain is publicly reachable. “Internal” means unlisted
  unless Cloudflare Access or equivalent authentication is configured.
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
3. Keep these values false:
   - `NEXT_PUBLIC_USE_MOCKS`
   - `NEXT_PUBLIC_E2E`
   - `NEXT_PUBLIC_ENABLE_DEBUG_UI`
4. Supply valid production-shaped `NEXT_PUBLIC_WC_PROJECT_ID`,
   `NEXT_PUBLIC_GLOBAL_DATA_URL`, and comma-separated HTTPS
   `NEXT_PUBLIC_RPC_URLS`. Never use localhost or loopback RPC values.
5. Decide whether the review needs access control. If yes, configure and test a
   Cloudflare Access policy before sharing the hostname.

Wrangler custom-domain deployment provisions the hostname routing and managed
TLS within the configured Cloudflare zone. Confirm DNS ownership, certificate
issuance, and policy status in Cloudflare before UAT.

## Deploy an exact candidate

1. Record the reviewed commit SHA; do not deploy a moving branch reference.
2. Manually dispatch `Deploy Preprod` and pass that SHA in its required `ref`
   input.
3. Confirm dependency policy, typecheck, lint, unit tests, production-env
   validation, OpenNext build, and Worker-size validation all passed before the
   deploy step.
4. Record the workflow run, commit SHA, Worker version, operator, and timestamp
   in the WP7A evidence ledger.

The workflow compiles production runtime with route-local DAO enabled, while
global mocks, E2E, and debug UI remain disabled. Do not override the workflow
with preview runtime or global mock flags.

## Verify after deployment

Check both `GET` and `HEAD` where applicable:

- `https://dao-beta.dao-ops.com/` renders `Proposals` and clean proposal links.
- `/propose` renders one `Create proposal` H1.
- `/proposals/2` renders its proposal title and contextual breadcrumbs.
- board → detail → Back restores the selected `?group=` URL.
- nested copy and Etherscan controls work without opening the proposal.
- authoring shows separate publish and create steps; normal eligibility has one
  affected range, and blocked capacity names the exact full epoch.
- no DAO debug control or Test Bridge is present.
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

## Roll back

1. Set the protected preproduction `NEXT_PUBLIC_ENABLE_DAO` value to `false`.
2. Re-dispatch `Deploy Preprod` for the approved rollback commit/ref.
3. Verify DAO root, authoring, and detail requests return 404 and that the other
   preproduction apps remain healthy.
4. Record the workflow run and verification in the evidence ledger.

The preproduction Worker is shared. Rolling back its Worker version affects all
beta hosts, so prefer the DAO flag-off rebuild when other apps are healthy.
