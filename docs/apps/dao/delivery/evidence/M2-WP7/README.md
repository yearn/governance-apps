# M2 WP7 Mock UAT Evidence

Date: 2026-08-19

Branch: `agent/dao/m2/wp7`

Accepted integration base: `fe846a673caaee4a28e56ecc42acab1daf48db04`

This evidence covers the assembled M2 mock proposal board, detail, authoring,
voting, and lifecycle-action product. It does not accept the M2 user gate. Feed,
backend, RPC, IPFS, contract, host, rollout, and M3 work remain stopped until the
user explicitly accepts the assembled mock UX.

## Review method

- Live interactive review used the in-app browser against the local M2 preview.
- Durable screenshots used a production-compiled preview with
  `NEXT_PUBLIC_RUNTIME_MODE=preview`, `NEXT_PUBLIC_E2E=true`, and
  `NEXT_PUBLIC_USE_MOCKS=true`.
- The shared debug trigger was hidden only while taking production-shaped
  screenshots. Its panel, fixture selection, time controls, reset behavior, and
  focus handling were reviewed separately.
- Automated coverage used the shared typed test bridge. No alternate DAO-only
  test control or route was introduced.
- Every screenshot ran a document-width assertion before capture.

## Fixture checklist

Every proposal fixture was selected through `setDaoFixture` and rendered at the
390-by-844 phone viewport. Each row passed its expected title or safe fallback,
display status, action-panel reachability, and horizontal-containment check.

| Fixture | Proposal | Expected presentation | Result |
| --- | ---: | --- | --- |
| `discussion` | 1 | Discussion · Adopt the contributor budget policy | Pass |
| `voting` | 2 | Voting · Fund protocol research | Pass |
| `late-voting` | 3 | Voting · Renew security operations | Pass |
| `approved-signal` | 4 | Approved · Approve the contributor charter | Pass |
| `approved-executable` | 5 | Approved · Update treasury policy | Pass |
| `executed` | 6 | Executed · Execute the treasury migration | Pass |
| `rejected` | 7 | Rejected · Increase the operations budget | Pass |
| `no-votes` | 8 | Rejected · Record a proposal with no votes | Pass |
| `expired` | 9 | Expired · Expired executable proposal | Pass |
| `retracted` | 10 | Retracted · Retracted contributor request | Pass |
| `flagged` | 11 | Flagged · Malformed proposal | Pass |
| `early-veto` | 12 | Vetoed · Vetoed before participation | Pass |
| `post-vote-veto` | 13 | Vetoed · Vetoed after participation began | Pass |
| `content-unavailable` | 14 | Voting · safe `Proposal #14` fallback | Pass |
| `content-invalid` | 15 | Voting · safe `Proposal #15` fallback | Pass |
| `analysis-pending` | 16 | Voting · Proposal awaiting analysis | Pass |
| `partial-decode` | 17 | Approved · partial decoded-call analysis | Pass |
| `simulation-failed` | 18 | Approved · historical simulation failure | Pass |
| `hash-mismatch` | 19 | Approved · script-hash mismatch warning | Pass |
| `direct-proposal` | 20 | Discussion · unverified forum provenance | Pass |
| `guarded-execution` | 21 | Approved · operator execution guard | Pass |
| `permissionless-execution` | 22 | Approved · eligible-account execution | Pass |
| `proposal-capacity-full` | N/A | authoring blocker and `64 / 64` shared capacity | Pass |

The capacity fixture is an authoring eligibility state, not another proposal ID.
The focused sweep is in `tests/e2e/full/dao-mock-uat.spec.ts`.

## Surface and recovery checklist

| Surface | States exercised | Evidence | Result |
| --- | --- | --- | --- |
| Proposal board | ready, all filters, active-empty shortcuts, loading, empty, cold error, last-good outage, retry, disconnected | `DaoRouteShells.test.tsx`, `dao-shell.spec.ts`, `dao-proposal-read.spec.ts` | Pass |
| Proposal detail | ready, loading, not found, missing-from-current-feed, error, disconnected | `DaoRouteShells.test.tsx`, `dao-shell.spec.ts`, `dao-proposal-read.spec.ts` | Pass |
| Content trust | available, unavailable, invalid, analysis pending, partial decode, simulation failure, hash mismatch, unverified discussion | `dao-proposal-read.spec.ts`, `dao-actions.spec.ts` | Pass |
| Proposal rules | no quorum, approval threshold, `of votes cast`, signal/non-executable, decay, veto participation | `dao-proposal-read.spec.ts`, `dao-actions.spec.ts` | Pass |
| Shared debug controls | fixture/persona/account/role/guard/outcome, loading/empty/error, time, pending indexing, reset | live browser, `dao-shell.spec.ts`, action and authoring specs | Pass |
| Normal-route language | no mock, fixture, prototype, QA, or implementation copy | static scan and `dao-proposal-read.spec.ts` | Pass |
| Production boundary | DAO remains path-only in preview and fails closed in production runtime | `dao-shell.spec.ts`, runtime invariant tests | Pass |

## Action and outcome checklist

| Flow | States exercised | Result |
| --- | --- | --- |
| Vote | Yea/Nay selection, review, no selection, zero weight, already voted, disconnected, wrong network, closed, late-vote decay | Pass |
| Content confirmation | one acknowledgement for unavailable content; two for invalid content | Pass |
| Veto behavior | early veto blocks voting; post-vote veto preserves participation voting | Pass |
| Lifecycle actions | retract, flag with reason, veto with reason, permissionless execute, guarded execute | Pass |
| Transaction lifecycle | submitted, wallet rejection, revert, network error, awaiting indexing, deterministic index | Pass |
| Canonical read model | totals, status, and events stay unchanged until the pending action is indexed | Pass |
| Dialog behavior | focus trap, Tab, Shift-Tab, Escape, backdrop/cancel, trigger focus restoration | Pass |

Automated action evidence is in `tests/e2e/full/dao-actions.spec.ts`. Live browser
review repeated the short-height vote dialog keyboard path.

## Authoring checklist

| Flow | States exercised | Result |
| --- | --- | --- |
| Entry | connected eligibility, blacklisted, insufficient weight, cooldown, shared capacity, disconnected, error | Pass |
| Forum validation | accepted topics 1001–1005; not found 404; wrong category 2002; unavailable 503 | Pass |
| Signal proposal | edit, exact immutable review, acknowledgement, publication, wallet, awaiting indexing | Pass |
| Executable proposal | full raw script, structural parsing, call count, exact script and hash review | Pass |
| Failure recovery | publication failure, wallet rejection, proposal revert, retry without losing publication | Pass |
| Immutability | exact whitespace retained; edit locked during and after publication | Pass |
| Focus | Start/Draft proposal moves focus below the sticky header | Pass |

Automated authoring evidence is in `tests/e2e/smoke/dao-authoring.spec.ts`.

## Viewport and accessibility checklist

| Review condition | Routes and controls | Result |
| --- | --- | --- |
| 390 × 844 phone | board, all proposal fixtures, vote action, authoring, dialog, mobile navigation, debug panel | Pass |
| 768 × 1024 tablet | detail/action hierarchy, dark theme, post-veto participation | Pass |
| 1280 × 900 desktop | board, detail columns, authoring review, light and dark themes | Pass |
| 1280 × 600 short desktop | non-sticky side panel, scrollable dialog, execution action | Pass |
| Keyboard | board tabs, authoring entry, dialog Tab/Shift-Tab/Escape, focus restoration | Pass |
| Reduced motion | board, action controls, dialogs, authoring progress | Pass |
| Coarse pointer | technical copy controls and explorer links | Pass |
| 200% text size | board, proposal 17, and authoring without document overflow | Pass |
| Touch targets | board filters, copy controls, authoring actions, header wallet control, dialog actions at least 40 px | Pass |

## Screenshots

| File | State | Viewport/theme |
| --- | --- | --- |
| [`board-desktop-light.png`](screenshots/board-desktop-light.png) | ready board and Active filter | 1280 × 900, light |
| [`voting-phone-light.png`](screenshots/voting-phone-light.png) | proposal 2 vote action and results | 390 × 844, light |
| [`post-veto-tablet-dark.png`](screenshots/post-veto-tablet-dark.png) | proposal 13 veto record and participation action | 768 × 1024, dark |
| [`execution-short-desktop-light.png`](screenshots/execution-short-desktop-light.png) | proposal 22 content, lifecycle, and execute action | 1280 × 600, light |
| [`authoring-review-desktop-light.png`](screenshots/authoring-review-desktop-light.png) | validated forum and exact immutable review | 1280 × 900, light |

## Accepted polish findings

1. The deterministic E2E account was actionable on detail and authoring routes,
   while the board and detail shell still announced that no wallet was
   connected. Board and detail now treat the E2E account consistently.
2. The global desktop wallet control and mobile navigation still showed
   `Connect wallet` while DAO eligibility used the deterministic E2E account.
   Both shared presentations now display that account in E2E only, while real
   non-E2E wallet behavior is unchanged.
3. The affected header wallet target measured 32 pixels high. Its disconnected,
   wrong-network, and connected presentations now retain at least a 40-pixel
   target. The touched opacity transition was narrowed from `transition-all`.

## Validation record

The complete assembled branch diff produced these results:

| Gate | Result |
| --- | --- |
| Interface detector and static scans | Pass: detector returned `[]`; diff, normal-route language, and touched-transition scans were clean |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test` | Pass: 132 files, 1,036 tests |
| Focused WP7 and shared-header E2E | Pass: 5 WP7 cases and 1 unchanged non-DAO onboarding case |
| `npm run test:e2e` | Pass: 36 tests, 2 intentional environment-scoped skips, 0 failures |
| `npm run test:e2e:full` | Pass in the authoritative serial run: 28 of 28 tests in 3.8 minutes |
| `npm run build` | Pass with preview screenshot flags and with the unflagged default production configuration |

The default parallel full-E2E attempts produced only Playwright navigation
aborts: 26 tests passed with 2 aborts, then 25 passed with 3 aborts. No product
assertion failed. The exact two initially affected cases passed 2 of 2 when
rerun serially, and the complete serial suite passed 28 of 28. This is the same
parallel-only classification recorded for the exact accepted base
`fe846a673caaee4a28e56ecc42acab1daf48db04`; no test or worker setting was
weakened.

Expected local review noise is limited to absent-local-RPC `eth_accounts`
warnings from the shared wallet stack. DAO state remains deterministic and
mock-backed for this gate. User acceptance is still pending.
