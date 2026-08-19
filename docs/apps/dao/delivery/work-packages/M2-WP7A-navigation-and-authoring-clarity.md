# M2 WP7A: Navigation and Authoring Clarity

Branch: `agent/dao/m2/wp7a`

## Objective

Apply the returned M2 product-gate changes to proposal navigation, proposal-row
interaction, authoring eligibility, submission-step clarity, and deterministic
local UAT reliability without crossing the mock-product boundary.

## Depends on

- M2 WP7 merged into `agent/integration` at
  `2ad5258c3c5bf51b152834161499122a54766237`.
- The assembled M2 mock UX remains explicitly unaccepted.

## Expected ownership

- DAO board, detail, and authoring route hierarchy
- typed board route-state helpers and proposal return context
- deterministic E2E wagmi connector behavior
- route-local copy, regressions, UAT evidence, and canonical behavior docs

## Scope

- Order board groups as `Upcoming`, `Active`, and `Closed`. When `?group=` is
  absent or invalid, select populated `Active`, then populated `Upcoming`, then
  populated `Closed`, and finally `Active` when every group is empty. A valid
  group always wins, including an empty group. Replace filter URL state without
  adding history entries.
- Carry the source group in proposal links as `?from=<group>`. Detail routes use
  `Proposals / <Group> / <proposal title>` breadcrumbs. The group breadcrumb
  returns to the exact board filter, browser Back preserves it, direct detail
  visits derive the proposal display group, and invalid origins are ignored.
- Make the full proposal row a native stretched-link target following the Teams
  pattern. Keep nested copy, address, and explorer controls independently
  operable above the overlay and show row-level keyboard focus.
- Remove the repeated large `DAO Governance` hero and persistent
  `Proposals` / `Create proposal` route pair. Keep product identity in global
  metadata/header. Use one meaningful route H1: `Proposals` on the board, the
  proposal title on detail, and `Create proposal` on authoring. Give the board a
  compact description/count, quiet forum action, and primary create action.
- Preserve all six affected reward epochs in the domain and debug surfaces. In
  normal eligible UI show only the expected voting epoch and affected reward
  epoch range. Render capacity detail only when blocked, identifying the exact
  full epoch, `64 / 64`, the affected range, and the system-wide rule without
  implying a user quota.
- Present publication and proposal creation as two distinct sequential actions.
  Before publication, Step 1 is current and Step 2 is visibly upcoming and
  unavailable, with copy that publication does not create a proposal or open a
  wallet. After publication, Step 1 is complete with its fingerprint receipt;
  focus moves to a distinct current Step 2 surface that says
  `Content published — proposal not created yet`. After proposal submission,
  both steps are complete and indexing/analysis remains pending. Publication
  failure never reveals Step 2; wallet rejection and proposal revert preserve
  the published content and allow Step 2 retry without republishing.
- In deterministic E2E mode, wrap wagmi's mock connector so it handles exactly
  `eth_accounts` locally and delegates every other request. Preserve the fixed
  connected account and reconnect-on-mount behavior. Non-E2E RainbowKit,
  wallet, RPC, preview, and production behavior must not change.

## Non-goals

- No M3 feed schema, producer, backend, or live read work.
- No real forum validation, IPFS publication, wallet write, or onchain proposal.
- No rollout, host registration, global navigation redesign, or new dependency.
- No change to DAO protocol math, the six-epoch domain contract, or shared
  reconnect semantics.

## Acceptance criteria

- Board order, URL parsing, fallback selection, reload, and Back behavior match
  the typed route-state contract at every empty/populated combination.
- Board-to-detail navigation and breadcrumbs preserve a valid source group and
  safely derive or ignore missing/invalid origin state.
- Proposal rows have one native primary link, row-level focus, and no synthetic
  click or role semantics; nested links and copy controls remain independent.
- Board, detail, and authoring routes each have exactly one meaningful H1 and no
  repeated governance hero or permanent local route toggle.
- Normal authoring eligibility contains no six-row capacity table or success
  notice. A full-capacity fixture exposes the precise blocking epoch and shared
  system rule.
- Publication and onchain creation have distinct current, upcoming, complete,
  failure, focus, and retry states. Publishing alone never reads as proposal
  completion.
- With `.env.local` pointing to an unavailable `127.0.0.1:8546`, deterministic
  E2E UAT emits no failed or unhandled `eth_accounts` request on `/dao`, a
  proposal detail route, or `/dao/propose`. Non-E2E connector behavior remains
  unchanged.
- Required copy and behavior docs, regression tests, and fresh visual evidence
  cover the changed states.

## Validation

- Unit/component tests for group parsing, fallback, hrefs, stretched-row
  semantics, compact headings, capacity states, submission sequence, failure
  preservation, and focus movement.
- Browser E2E for filter URL/reload/Back/breadcrumb behavior, nested row controls,
  one-H1 route hierarchy, publication/onchain transitions, and zero failed
  `eth_accounts` requests across all three DAO route types.
- Visual and interaction review at 390x844, 768x1024, 1280x900, and 1280x600 in
  light and dark themes, including keyboard, reduced motion, 200% root text,
  overflow, and minimum 40-pixel targets.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`,
  serial `npm run test:e2e:full`, default `npm run build`, and a flagged
  production-shaped preview/evidence build.

## Review

Independent frontend/accessibility reviewer and runtime/test-infrastructure
auditor review the complete final range. Any fixes receive a complete-range
re-review before no-fast-forward integration and a renewed M2 user gate.

Do not tag M2 or begin M3 until the user explicitly accepts the revised mock UX.
