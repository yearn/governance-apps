# M7 WP18: Preproduction and Controlled Rollout

Branch: `agent/dao/m7/wp18`

## Objective

Validate the accepted system in preproduction, prepare monitoring and rollback,
and expose production only after explicit approval.

The M2 WP7A host is only an unaccepted, mock-backed review seam. This package
must revalidate beta with the accepted live feed, forum/IPFS, wallet-write, and
onchain system; it does not inherit mock-beta evidence as launch evidence.

## Depends on

- User-accepted M6 fork evidence.
- Final deployed contracts and producer production configuration.
- IPFS retention and operational ownership.

## Scope

- `/dao` shared-host smoke before subdomain exposure.
- Beta host, wallet, network, feed, content, analysis, and write smoke.
- Production feature gate, environment validation, host routing, sitemap, and
  discovery choices.
- Feed freshness, IPFS failure, decode coverage, simulation failure, and write
  report monitoring.
- Rollback rehearsal and post-deploy smoke.
- Explicit stYFI Snapshot-to-DAO cutover copy and links.

## Non-goals

- No change to `gov.yearn.fi` forum URLs.
- No production exposure before the approval record.
- No destructive removal of historical Snapshot proposal access.

## Acceptance criteria

- Path route passes before `dao.yearn.fi` is enabled.
- Production configuration cannot enable DAO with missing required feed/RPC
  inputs.
- Rollback disables exposure without deleting indexed proposal data.
- Monitoring owners and alert thresholds are recorded.
- Snapshot cutover links preserve access to history.
- Product, contract, security, operations, and integrator sign-offs are recorded.

## Validation

- Production environment and dependency checks.
- Beta and production smoke.
- Rollback rehearsal.
- Full release checklist and worker build/size gate.

## Review

Release reviewer, security reviewer, operations owner, and final integrator. Tag
M7 only after production approval.
