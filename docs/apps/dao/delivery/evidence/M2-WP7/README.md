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
- Fixture coverage navigated to each proposal route first, reacquired the
  document-local bridge, applied the fixture, and read back its selected
  identity before checking fixture-specific contract, action, or trust facts.
- Every screenshot ran a document-width assertion before capture.

## Fixture checklist

Every proposal fixture was selected through `setDaoFixture` in the same document
as its target route and rendered at the 390-by-844 phone viewport. Each row
passed selected-fixture and selected-proposal identity, its expected title or
safe fallback, display status, action-panel reachability, and horizontal
containment. The sweep also pins unavailable-content trust, hash mismatch,
post-veto participation voting, and permissionless execution facts.

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

The capacity fixture is an authoring eligibility state, not another proposal ID;
its selected-fixture identity, blocker copy, and `64 / 64` fact are checked after
same-document mutation. Advancing runtime time by eight days also proves expected
voting epoch `202` and the six labels `202` through `207` across the store,
shared bridge, and rendered authoring table without changing the capacity facts.
The focused sweep is in
`tests/e2e/full/dao-mock-uat.spec.ts`.

## Surface and recovery checklist

| Surface | States exercised | Evidence | Result |
| --- | --- | --- | --- |
| Proposal board | ready, all filters, active-empty shortcuts, loading, empty, cold error, last-good outage, retry, disconnected | `DaoRouteShells.test.tsx`, `dao-shell.spec.ts`, `dao-proposal-read.spec.ts` | Pass |
| Proposal detail | ready, loading, not found, missing-from-current-feed, error, disconnected | `DaoRouteShells.test.tsx`, `dao-shell.spec.ts`, `dao-proposal-read.spec.ts` | Pass |
| Content trust | available, unavailable, invalid, analysis pending, partial decode, simulation failure, hash mismatch, unverified discussion | `dao-proposal-read.spec.ts`, `dao-actions.spec.ts` | Pass |
| Proposal rules | no quorum, approval threshold, `of votes cast`, signal/non-executable, decay, veto participation | `dao-proposal-read.spec.ts`, `dao-actions.spec.ts` | Pass |
| Shared debug controls | fixture/persona/account/role/guard/outcome, loading/empty/error, time, pending indexing, reset | live browser, `dao-shell.spec.ts`, action and authoring specs | Pass |
| Debug time provenance | runtime time drives lifecycle copy separately; sub-12-second changes preserve the full canonical tuple, while slot crossings and indexing advance coherent identity | `dao.store.test.ts`, `dao.actions.test.ts`, bridge fixture evidence | Pass |
| Account identity | roles and one-vote overlays are normalized to the exact queried actor | `dao.actions.test.ts`, `dao-actions.spec.ts` | Pass |
| Normal-route language | no internal mock, fixture, prototype, QA, or implementation-status copy | static scan and `dao-proposal-read.spec.ts` | Pass |
| Production boundary | DAO remains path-only in preview and fails closed in production runtime | `dao-shell.spec.ts`, runtime invariant tests | Pass |

## Action and outcome checklist

| Flow | States exercised | Result |
| --- | --- | --- |
| Vote | Yea/Nay selection, review, no selection, zero weight, already voted, disconnected, wrong network, closed, late-vote decay | Pass |
| Content confirmation | one acknowledgement for unavailable content; two for invalid content | Pass |
| Veto behavior | early veto blocks voting; open post-vote veto preserves participation voting; closed-window copy does not claim voting remains open | Pass |
| Lifecycle actions | retract, flag with reason, veto with reason, permissionless execute, guarded execute | Pass |
| Transaction lifecycle | submitted, wallet rejection, revert, network error, awaiting indexing, deterministic index | Pass |
| Canonical read model | totals, status, and events stay unchanged until the pending action is indexed | Pass |
| Action dialog behavior | focus trap, Tab, Shift-Tab, Escape, backdrop/cancel, trigger focus restoration | Pass |
| Mobile navigation dialog | label, initial focus, Tab/Shift-Tab trap, Escape/Close/navigation restoration, inert background, scroll lock | Pass |

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
| 390 × 500 phone | mobile navigation header/footer containment and scrollable body | Pass |
| 768 × 1024 tablet | detail/action hierarchy, dark theme, post-veto participation | Pass |
| 1280 × 900 desktop | board, detail columns, authoring review, light and dark themes | Pass |
| 1280 × 600 short desktop | non-sticky side panel, scrollable dialog, execution action | Pass |
| Keyboard | board tabs, authoring entry, dialog Tab/Shift-Tab/Escape, focus restoration | Pass |
| Reduced motion | board, action controls, dialogs, mobile entrance and accordion, authoring progress | Pass |
| Coarse pointer | technical copy controls and explorer links | Pass |
| 200% root font size | CSS root-font scaling on board, proposal 17, and authoring without document overflow; not a browser-zoom claim | Pass |
| Touch targets and identity height | board filters, copy controls, authoring and dialog actions at least 40 px; read-only header identity 40 px desktop/44 px mobile | Pass |
| Assistive technology | one textual Yea/Nay breakdown; duplicate visual bar hidden; mobile background isolated | Pass |
| Contrast | computed effective foreground/background in both themes for status, both vote purposes, integrity/signal states, and representative proposal, board, action, and authoring feedback | Pass |

The browser-computed light/dark contrast ratios were 5.62/10.30 for voting
status; 4.82/5.62 for both decision- and participation-purpose badges;
5.31/12.42 for script integrity; 5.40/9.07 for hash mismatch, analysis error,
board content warning, and moderation error; 7.13/12.42 for the approved signal;
5.62/9.60 for the authoring eyebrow; 5.62/10.30 for the active authoring step;
and 8.36/9.07 for authoring validation. Every measured pair is at least 4.5:1.

## Screenshots

| File | State | Viewport/theme |
| --- | --- | --- |
| [`board-desktop-light.png`](screenshots/board-desktop-light.png) | ready board and Active filter | 1280 × 900, light |
| [`voting-phone-light.png`](screenshots/voting-phone-light.png) | proposal 2 vote action and results | 390 × 844, light |
| [`post-veto-tablet-dark.png`](screenshots/post-veto-tablet-dark.png) | proposal 13 veto record and participation action | 768 × 1024, dark |
| [`execution-short-desktop-light.png`](screenshots/execution-short-desktop-light.png) | proposal 22 content, lifecycle, and execute action | 1280 × 600, light |
| [`authoring-review-desktop-light.png`](screenshots/authoring-review-desktop-light.png) | validated forum and exact immutable review | 1280 × 900, light |

## Accepted polish findings

1. Fixture UAT used to set state before navigation, allowing a new document to
   recreate the default store. It now navigates first, applies state in that
   document, reads back exact fixture/proposal identity, and asserts distinguishing
   contract, action, and trust facts.
2. Proposer, operator, and guardian booleans used to survive an address
   replacement. Role and capability reads now scope those facts to the exact
   normalized actor; authorized indexed events retain that actor, while
   permissionless execution remains permissionless.
3. Hand-authored proposal epochs and timings were replaced by one genesis and a
   derived 14-day `N` to `N + 1` geometry. Authoring uses the same derivation,
   recomputes its expected epoch and six capacity labels whenever runtime time
   changes, preserves capacity facts, and keeps equal voting windows in one
   voting epoch.
4. Mobile navigation now has a dialog name, initial focus, a bidirectional focus
   trap, Escape/Close/navigation focus restoration, inert background, scroll
   lock, short-height containment, and reduced-motion overrides.
5. E2E fallback wallet identity is now explicitly read-only. DAO desktop and
   mobile presentations use the same actor, connection, and network facts as
   the current route without changing real non-E2E wallet semantics.
6. Unsafe small-text Yearn-blue, success-green, and error-red pairs were
   replaced locally for status, authoring, script-integrity, approved-signal,
   active-purpose, and DAO error/warning states. Browser-computed effective
   contrast is checked in both themes without changing shared color tokens.
7. The decorative vote bar is hidden from assistive technology because the
   adjacent textual breakdown already exposes the same semantic value.
8. Debug time travel no longer rewrites a canonical timestamp beneath an
   unchanged number and hash. Runtime time remains separate, sub-block changes
   preserve the complete tuple, lifecycle copy uses the runtime clock, and
   12-second slot crossings or indexing derive coherent provenance.
9. Post-veto confirmation claims participation stays open only during an open
   voting window. Closed-window copy says the window ended and is not reopened.
10. The evidence ledger now states exactly what was exercised: same-document
    fixture proof and 200% root-font scaling. Changed production-shaped views
    were recaptured and checked for dimensions, overflow, and hidden debug UI.

## Validation record

The complete assembled branch diff produced these results:

| Gate | Result |
| --- | --- |
| Interface detector and static scans | Pass: detector returned `[]`; diff, normal-route language, and touched-transition scans were clean |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test` | Pass: 132 files, 1,048 tests |
| Focused WP7 E2E | Pass: 8 of 8 fixture, wallet, mobile-dialog, and computed-contrast cases |
| `npm run test:e2e` | Pass: 36 tests, 2 intentional environment-scoped skips, 0 failures |
| `npm run test:e2e:full` | Pass in the authoritative serial run: 31 of 31 tests in 4.4 minutes |
| `npm run build` | Pass with the unflagged default production configuration and the flagged preview/evidence configuration |
| Production screenshot capture | Pass: 5 production-compiled artifacts, exact dimensions, no horizontal overflow, hidden debug UI |

Expected local review noise is limited to absent-local-RPC `eth_accounts`
warnings from the shared wallet stack. DAO state remains deterministic and
mock-backed for this gate. User acceptance is still pending.
