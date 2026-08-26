# M2 WP7C Evidence

Status: repository implementation evidence recorded; product acceptance and the
six-host Access gate remain incomplete.

## Package identity

- Branch: `agent/dao/m2/wp7c`
- Frozen base and merge-base:
  `18019c38e27c84c9a9900a390c5b03ff4ddf8103`
- Accepted WP7B merge in the base:
  `c2931f7714ab96ff2531e4192e9ef4a49595057a`
- Refined scope tip before implementation:
  `527493f`
- Final package tip: pending final gates and review
- Reviewed range: pending final tip
- Merge and post-merge ledger: pending; this package does not update
  `docs/apps/dao/delivery/status.md`
- Product gate: not accepted

## Repository changes by concern

| Concern | Commits |
| --- | --- |
| Red regressions | `3feb3d9`, `650ac75`, `5f5784d`, `5758564`, `a8919e4` |
| Execution readiness | `ead398e`, `b422142` |
| Host-aware header links | `df13d9d`, `dff7bd8`, `acc18ee` |
| Typed authoring outcomes | `ab4c850` |
| Indexing recovery | `66f1e54` |
| Visible-control Playwright coverage | `568dfa3` |
| Canonical behavior docs | `a3ab330` |
| Access and shared security docs | `acbee9d` |

The evidence commit is the commit containing this ledger. Root must record the
exact final tip after all gates and review fixes finish.

## Execution-readiness evidence

`DaoProposalExecutionReadiness` is derived from proposal type and exact script
bytes/hash only.

| Proposal condition | Derived readiness | Hard badge |
| --- | --- | --- |
| Stored hash mismatch, including proposal #19 | `integrity_blocked / stored_script_hash_mismatch` | Yes |
| Exact event script unavailable | `integrity_blocked / exact_script_unavailable` | Yes |
| Verified executable | `integrity_ready` | No |
| Scheduled executable | `integrity_ready` | No |
| Guarded executable | `integrity_ready` | No |
| Signal | `not_applicable` | No |
| Vetoed or flagged executable with verified bytes | `integrity_ready` | No |
| Executed or expired executable with verified bytes | `integrity_ready` | No |
| Disconnected, wrong-network, non-operator, delayed, or simulation-failed account state | Unchanged from proposal bytes/hash | No |

When script bytes exist, the stored `hashVerified` fact must equal the actual
keccak comparison. It is `null` only when exact bytes are absent. Proposal #19
renders `Execution blocked`, `Approved`, then `Executable`; its static reason
follows immediately, `Executable actions` is absent on the board, and the lower
detail integrity explanation remains.

## Header and authoring evidence

- Branded beta hosts take precedence over stale path segments and link the
  application label to `/`.
- Shared hosts resolve exact path boundaries and link to each app path. Lookalike
  paths such as `/daofoo` do not match.
- Desktop and mobile use native links with visible focus. The desktop target is
  at least 40 pixels high; mobile uses 44 pixels and closes the modal menu.
- Proposal submission receives one explicit `{ review, publication, outcome,
  latencyMs? }` request. Forum topics `1003` and `1004` are ordinary topics.
- Rejection, revert, and network failure keep the exact review and publication
  but create no hash, receipt, identity, proposal record, pending action, feed
  proposal/event, proposal link, session record, or index state.
- Changing Rejected to Success reuses the publication, reaches Indexed, and
  exposes working Copy and Open actions.
- Registration waits before persistence. `Retry indexing` re-registers and
  indexes the same receipt-derived reference without duplicate proposal records
  or `propose` events.

## Sanitized pre-change Access observation

Observation date: 2026-08-26. These were read-only, unauthenticated checks. No
Cloudflare, DNS, Worker, custom-domain, GitHub, or deployment state changed.

| Exact host | Pre-change observation |
| --- | --- |
| `styfi-beta.dao-ops.com` | Access protection present |
| `veyfi-beta.dao-ops.com` | Access protection present |
| `yeth-beta.dao-ops.com` | Access protection present |
| `teams-beta.dao-ops.com` | Access protection present |
| `ybc-beta.dao-ops.com` | Access protection present |
| `dao-beta.dao-ops.com` | Unprotected; application reachable without an Access challenge |

The available session could not inspect authenticated Zero Trust policy details
or make a safe Access mutation. It therefore did not confirm the reusable
policy's GitHub organization/team identity, application precedence, approved
member entry, unrelated-account denial, nested-route coverage, cross-beta
coverage, or authenticated wallet behavior. The six-host gate is blocked and
must not be marked complete.

Operator work remains:

1. Confirm the intended reusable GitHub organization/team policy.
2. Bind it to `dao-beta.dao-ops.com` without changing the five protected apps,
   or reconcile all six exact applications if the audit finds drift.
3. Run every sanitized allow, deny, nested-route, cross-beta, wallet, noindex,
   canonical, and unrelated-host check in the beta runbook.
4. Record rollback. Disable or remove only package-created exact-host bindings
   or policies; do not touch DNS, TLS, custom domains, or the Worker.

## Checks recorded before this ledger

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run test -- tests/unit/lib/clients/dao.domain.test.ts tests/unit/lib/header-nav.test.ts tests/unit/app/dao/propose/authoring.test.ts tests/components/HeaderHomeLinks.test.tsx tests/components/DaoProposalBoard.test.tsx tests/components/DaoProposalDetail.test.tsx tests/components/DaoProposalAuthoringForm.test.tsx` | 7 files, 136 tests passed |
| `npm run test:e2e -- tests/e2e/smoke/dao-authoring.spec.ts --grep 'uses visible review controls'` | 1 passed; visible Rejected to Success to Indexed flow |
| `npm run test:e2e -- tests/e2e/smoke/dao-authoring.spec.ts --grep 'keeps publication after every failed'` | 1 passed; rejection, revert, and network failure |

The first failure-matrix browser run reached the correct network-error UI but
used a non-exact text locator that matched the title, body, and live region. The
test was tightened to the exact title and passed on rerun. This was a test
selector correction, not a product-state fix.

## Pending final evidence

Root must replace these entries after the exact clean final tip is known:

- final package tip and frozen-base-to-tip reviewed range;
- `npm run validate:deps`, typecheck, lint, full Vitest, smoke Playwright, full
  Playwright with one worker, and build results;
- 390×844, 768×1024, 1280×900, and 1280×600 checks in light and dark, plus
  keyboard, 200% root text, reduced motion, and coarse pointer;
- screenshots or metadata for proposal #19 board/detail, normal executable,
  header links, failed authoring retry, and Indexed identity;
- contract/domain, frontend/accessibility, and security/runtime reviewer
  verdicts; and
- post-merge SHA, ledger commit, and post-merge gate results if the package is
  approved for integration.

No deployment, push, tag, merge, Access change, DNS change, Worker change, or M2
acceptance is claimed here.
