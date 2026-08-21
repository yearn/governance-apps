# M2 WP7A Evidence

Status: implementation evidence complete; revised mock UX awaits explicit user
acceptance.

Package: [`M2-WP7A navigation and authoring clarity`](../../work-packages/M2-WP7A-navigation-and-authoring-clarity.md)

## Before and after

| Before | After |
| --- | --- |
| Repeated `DAO Governance` hero plus permanent local route buttons | Compact route-specific H1, contextual actions, and product identity retained in global header metadata |
| `Active / Upcoming / Closed` with transient local selection | `Upcoming / Active / Closed`, typed URL fallback, replacement, reload, detail-origin, and Back preservation |
| Small title target opened a proposal | Whole row uses one stretched native link; address copy and explorer controls remain independent |
| Detail navigation lost the source list | `Proposals / <Group> / <proposal title>` returns to the exact group and safely derives direct visits |
| Detail wallet notice preceded route context | Breadcrumb and proposal title establish the page first; disconnected guidance remains in the contextual action panel |
| Six reward-epoch rows dominated normal eligibility | Expected epoch plus one affected range; exact full epoch and `64 / 64` appear only when blocked |
| Publish and create actions looked equivalent | Two explicitly required steps with current/upcoming/complete states, receipts, focus transfer, and retry semantics |
| E2E mock account discovery fetched the configured RPC | E2E-only connector resolves exactly `eth_accounts` locally and delegates all other mock-provider methods |
| DAO was path-only outside production runtime | Guarded, noncanonical `dao-beta` review host supports clean paths; public production remains hard-disabled |

The interface pass follows the shared minimal-shell, semantic-link, one-H1,
focus-management, 40-pixel-target, reduced-motion, and tabular-number guidance.

## Navigation matrix

| Case | Expected evidence |
| --- | --- |
| Invalid/absent group | Populated Active → Upcoming → Closed; all-empty Active |
| Valid empty group | URL selection wins and empty state renders |
| Filter changes | Query params preserved, history length unchanged, reload restores group |
| Board to detail | Proposal href includes `?from=<group>` |
| Breadcrumb | Group link returns the exact board filter |
| Browser Back | Restores original board URL and selected tab |
| Direct/invalid origin | Proposal display group is used safely |
| Beta host | `/`, `/propose`, and `/proposals/:id` remain clean client paths |

## Interaction and authoring matrix

- Blank row area opens the proposal and the row receives the visible focus ring.
- Proposer copy stays on the board and reports `Copied`; the Etherscan link opens
  independently in a new page.
- Normal eligibility exposes no six-row capacity table or capacity-success
  message.
- Full capacity identifies the blocking epoch, `64 / 64`, affected range, and
  system-wide rule.
- Before publication, Step 2 is unavailable and says publishing does not create
  the proposal or open a wallet.
- Publication success retains the fingerprint and moves focus to Step 2.
- Publication failure does not expose Step 2.
- Wallet rejection and revert retain publication and allow Step 2 retry.
- Submission moves focus to a stable completion heading; one status region
  announces only `Awaiting proposal indexing and analysis.`

## RPC and runtime evidence

- The user reported, and the package's local baseline audit observed at accepted
  commit `2ad5258c3c5bf51b152834161499122a54766237`, unhandled viem
  `HttpRequestError` requests to
  `http://127.0.0.1:8546/` with body `{"method":"eth_accounts"}`.
- Connector unit coverage proves local `eth_accounts`, delegated provider
  methods, wagmi/core reconnect to the deterministic account with zero fetches,
  and explicit-disconnect reconnect semantics with zero fetches.
- Hydrated board, detail, and authoring browser coverage observes zero
  `eth_accounts` request bodies, loopback requests/failures, page errors, and
  console errors while the local RPC sentinel is dead.
- A direct production response for `/dao?group=closed` renders the compact
  route heading and loading state, but no board tabs or selected group. The
  board first renders after hydration from the browser URL, so its server
  snapshot cannot visibly flash the fallback group; reload and Back coverage
  then proves the requested Closed group is selected.
- The flag-on production build hydrates `/dao`, `/dao/propose`, and
  `/dao/proposals/2` with the route-local DAO mock while the Debug control is
  absent. A local beta-host request proves HTTP 200, `noindex, nofollow`, no
  canonical, and clean server-rendered `/propose` links.
- Production CSP intentionally upgrades insecure requests. Consequently, a
  locally mapped `http://dao-beta.dao-ops.com:<port>` cannot hydrate its JS
  assets from an HTTP-only Next server; development-host E2E proves hydrated
  clean-path navigation, and deployed managed HTTPS remains the operator gate.
- Production-runtime flag-on/flag-off and production workflow results are
  recorded in the final gate table below.

## Visual evidence

Fresh screenshots live in [`screenshots`](screenshots/). The ledger records the
route, runtime/fixture, theme, viewport, text scale, reduced-motion setting, and
focus state for each image. Representative captures cover 390 × 844,
768 × 1024, 1280 × 900, and 1280 × 600 in light/dark.

The final captures come from `next build` artifacts with both the Debug control
and Next development indicator absent in every saved frame. Production-runtime,
flag-on, E2E-off output supplies the board, detail, and disconnected authoring
states. The four deterministic mutable states use a separate
production-compiled preview-runtime artifact with `NEXT_PUBLIC_E2E=true`,
global mocks false, and the debug flag false. Preview normally exposes its
Debug trigger; the capture harness removes only that trigger after fixture
setup, then asserts both the trigger and `nextjs-portal` are absent before each
screenshot. This evidence-only artifact is not a preproduction or rollout
configuration, and production runtime continues to reject E2E at its security
invariant.

| Image | Route and state | Runtime / fixture | Presentation | Input state |
| --- | --- | --- | --- | --- |
| [`board-active-light-1280x900.png`](screenshots/board-active-light-1280x900.png) | `/dao?group=active`; compact board and stretched rows | Production, DAO on, E2E off; default feed | Light; 1280 × 900; 100% text | Motion default; no forced focus |
| [`detail-breadcrumb-dark-768x1024.png`](screenshots/detail-breadcrumb-dark-768x1024.png) | `/dao/proposals/2?from=active`; contextual hierarchy | Production, DAO on, E2E off; proposal 2 | Dark; 768 × 1024; 100% text | Motion default; no forced focus |
| [`authoring-eligibility-light-390x844.png`](screenshots/authoring-eligibility-light-390x844.png) | `/dao/propose`; disconnected route hierarchy | Production, DAO on, E2E off | Light; 390 × 844; 100% text | Motion default; no forced focus |
| [`authoring-epoch-range-light-390x844.png`](screenshots/authoring-epoch-range-light-390x844.png) | `/dao/propose`; compact eligible range | Evidence preview; eligible proposer | Light; 390 × 844; 100% text | Reduced motion; no forced focus |
| [`authoring-capacity-full-light-768x1024.png`](screenshots/authoring-capacity-full-light-768x1024.png) | `/dao/propose`; blocking epoch and `64 / 64` | Evidence preview; capacity-full proposer | Light; 768 × 1024; 100% text | Reduced motion; no forced focus |
| [`authoring-two-actions-light-1280x600.png`](screenshots/authoring-two-actions-light-1280x600.png) | `/dao/propose`; reviewed Step 1 current, Step 2 upcoming | Evidence preview; eligible valid Signal | Light; 1280 × 600; 100% text | Reduced motion; no forced focus |
| [`authoring-content-published-light-1280x600.png`](screenshots/authoring-content-published-light-1280x600.png) | `/dao/propose`; published receipt and current Step 2 | Evidence preview; publication success | Light; 1280 × 600; 100% text | Reduced motion; keyboard focus on Step 2 heading |

Separate browser regressions verify keyboard traversal/focus handoff, reduced
motion, 200% root text, document overflow, and 40-pixel targets. Those checks
cover board, detail, and authoring at the required widths without implying that
every combination is represented by a saved PNG.

## Gate ledger

| Gate | Result |
| --- | --- |
| Typecheck | Pass |
| Lint | Pass after replacing effect-driven URL state with an external-store subscription |
| Vitest | 134 files, 1,077 tests passed |
| Focused smoke | Authoring, URL/reload/Back, stretched row/nested controls, dead RPC, beta clean paths passed |
| Complete smoke | Pass: 41 passed / 2 production-only skipped / 0 failed, serial, 7.3 minutes |
| Serial full E2E | Pass: 31 / 31, serial, 9.0 minutes; stale pre-WP7A H2 and valid-empty-group assertions corrected before the authoritative run |
| Default build | Pass: unflagged `npm run build` |
| Flagged preview/evidence build | Pass: production-compiled preview artifact; four mutable-state captures; Debug/dev chrome absent from every saved frame |
| Production runtime DAO=true | Pass for the WP7A capture configuration: shared routes hydrated; the then-disabled DAO review controls were absent; beta Host 200/noindex/no canonical/clean SSR hrefs |
| Production runtime DAO=false | Pass: GET and HEAD return 404 for root/create/detail; beta Host returns 404 |

## Rollout boundary

The preproduction flag is deployment-wide and the custom domain is not access
control. See the [`DAO beta review runbook`](../../dao-beta-runbook.md). No
deployment, GitHub/Cloudflare state change, DNS change, push, public production
route, canonical promotion, M3, backend feed, real forum/IPFS, or onchain work is
part of this package. The user must explicitly accept the revised mock UX before
the integration lane can tag M2 or begin M3.

The later beta deployment follow-up adds a separately gated DAO-only review
control on `dao-beta.dao-ops.com`. It does not change the provenance or contents
of the seven WP7A screenshots above.

## 2026-08-20 beta deployment follow-up

An operator deployment rendered the DAO shell but failed client proposal reads.
The deployed Worker had the DAO route enabled at runtime while the browser
bundle had been compiled without `NEXT_PUBLIC_ENABLE_DAO=true`. Setting
`NEXT_PUBLIC_USE_MOCKS` or `NEXT_PUBLIC_E2E` in the Worker dashboard could not
repair the already-built browser JavaScript, and those global flags remain
intentionally false in the production-shaped preproduction workflow.

The follow-up propagates `NEXT_PUBLIC_ENABLE_DAO` through the protected GitHub
preproduction build and adds the independent
`NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS` flag. The latter exposes only the DAO
fixture controls on `dao-beta.dao-ops.com`; global debug, E2E wiring, and the
Test Bridge remain off. Public production hardcodes both DAO flags false.

Follow-up gates: typecheck and lint passed; Vitest passed 134 files / 1,080
tests; serial smoke passed 41 tests with 2 production-only skips; the
production-shaped flagged build embedded DAO and review-controls `true` while
global debug remained `false`; and the final unflagged production build passed.
