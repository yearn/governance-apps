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
- Implementation and gate source tip:
  `b03133b6817bcb1872c7651a431828d75e9a8dec`
- Final exact candidate tip: the commit containing this ledger. A commit cannot
  record its own SHA. Integration status and handoff must record that SHA and
  the independently reviewed range.
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
| Beta-host header hydration coverage | `611f332` |
| Deterministic inherited smoke fixture | `b03133b` |

The evidence commit is the exact candidate tip. This ledger does not self-name
that commit or claim that independent review has approved its range.

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

## Sanitized Access observation

Observation date: 2026-08-26. These were read-only, unauthenticated checks. No
Cloudflare, DNS, Worker, custom-domain, GitHub, or deployment state changed.

| Exact host | `/` | `/proposals/2` | Fake static asset | `/api/global-data` |
| --- | ---: | ---: | ---: | ---: |
| `styfi-beta.dao-ops.com` | 302 | 302 | 302 | 302 |
| `veyfi-beta.dao-ops.com` | 302 | 302 | 302 | 302 |
| `yeth-beta.dao-ops.com` | 302 | 302 | 302 | 302 |
| `teams-beta.dao-ops.com` | 302 | 302 | 302 | 302 |
| `ybc-beta.dao-ops.com` | 302 | 302 | 302 | 302 |
| `dao-beta.dao-ops.com` | 200 | 200 | 404 | 200 |

These status codes show that the first five exact beta hosts redirected every
probe to Access while `dao-beta.dao-ops.com` did not. The Cloudflare dashboard
session was unauthenticated, so it could neither inspect protected policy
details nor make an Access change. The exact GitHub organization/team identity,
approved-member allow result, and unrelated-account deny result remain
unverified. The six-host gate is blocked and must not be marked complete.

Operator work remains:

1. Confirm the intended reusable GitHub organization/team policy.
2. Bind it to `dao-beta.dao-ops.com` without changing the five protected apps,
   or reconcile all six exact applications if the audit finds drift.
3. Run every sanitized allow, deny, nested-route, cross-beta, wallet, noindex,
   canonical, and unrelated-host check in the beta runbook.
4. Record rollback. Disable or remove only package-created exact-host bindings
   or policies; do not touch DNS, TLS, custom domains, or the Worker.

## Source gates

| Command | Result |
| --- | --- |
| `npm run validate:deps` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test` | 139 files and 1,191 tests passed |
| `npm run test:e2e:full -- --workers=1` | 34 of 34 passed |
| `npm run build` | Passed |

These full source gates ran before `b03133b`. The later commit changes one smoke
test only; it does not change product code. The affected seam and final smoke
suite were then checked at `b03133b`:

| Check at `b03133b` | Result |
| --- | --- |
| `npm run test:e2e` | 43 passed, 5 skipped |
| Typed-bridge exact case, first isolated run | Passed |
| Typed-bridge exact case, second isolated run | Passed |
| ESLint for `tests/e2e/smoke/dao-shell.spec.ts` | Passed |
| `npm run typecheck` | Passed |
| `git diff --check` | Passed |

Before `b03133b`, the complete smoke run failed because the typed-bridge test
derived its clock from wall time. The isolated case failed the same way on the
package candidate and on the exact frozen base. Commit `b03133b` changed only
that test to use `DAO_MOCK_NOW`; it kept the exact `Voting` assertion. The exact
case passed twice before the complete smoke suite passed.

## Compiled production proof

| Mode | Build | Standalone proof | Result |
| --- | --- | --- | --- |
| DAO enabled | Passed | 1 passed, 2 mode skips | The compiled DAO route was enabled and did not expose the mock debug bridge. |
| DAO disabled | Passed | 1 passed, 2 mode skips | Compiled GET and HEAD requests failed closed without a 5xx response. |

## Interactive browser inspection

Eight browser captures were inspected inline. The browser sandbox could not
persist them, so this ledger records capture metadata without invented artifact
paths.

| Viewport | Theme | Capture record |
| --- | --- | --- |
| 390×844 | Light | Inspected inline |
| 390×844 | Dark | Inspected inline |
| 768×1024 | Light | Inspected inline |
| 768×1024 | Dark | Inspected inline |
| 1280×900 | Light | Inspected inline |
| 1280×900 | Dark | Inspected inline |
| 1280×600 | Light | Inspected inline |
| 1280×600 | Dark | Inspected inline |

The inspection found:

- Proposal #19 showed `Execution blocked`, `Approved`, `Executable`, then
  `Stored script hash does not match the proposed event script.` on both the
  board and detail view. Board executable actions were absent, while the lower
  detail explanation had one live region.
- Proposal #22 showed no false blocker and kept its executable actions.
- The native application home link measured at least 44 pixels high on mobile
  and 40 pixels on desktop, had a visible focus ring, and caused no overflow.
  Escape closed the mobile menu and restored focus to its opener. The long YBC
  label fit at 390 pixels. No viewport showed horizontal overflow.
- The visible review controls supported `Rejected` to `Success` to `Indexed`
  and kept an identical content fingerprint. The final identity exposed Copy
  and Open actions with a stable receipt-derived href.
- No console errors appeared during the matrix.

The 34-of-34 Playwright run covered 200% text, reduced motion, and coarse
pointer behavior. This ledger does not claim that the interactive browser
emulated those modes. Focused Playwright cases covered shared-host and beta-host
home-link targets; the interactive browser could not inject a `Host` header.

## Evidence limits and integration handoff

- Integration status and handoff must record the exact ledger commit SHA and
  its independently reviewed frozen-base-to-tip range.
- Authenticated Access policy inspection, mutation, allow, and deny checks are
  still outstanding.
- Merge, post-merge gates, deployment, and product acceptance are not part of
  this evidence commit.

No deployment, push, tag, merge, Access change, DNS change, Worker change, or M2
acceptance is claimed here.
