# Teams and YBC preprod UAT

Use this checklist for the reported Teams and YBC fixes. Transaction tests also follow
[`teams-ybc-fork-smoke-plan.md`](teams-ybc-fork-smoke-plan.md).

## Prerequisites

- [ ] Test the exact frontend build proposed for preprod.
- [ ] Use Ethereum Mainnet or the approved Mainnet fork.
- [ ] Keep production feature flags off until sign-off.
- [ ] Test desktop and a 360–375px mobile viewport.
- [ ] Use a fresh browser profile for first-visit and local-name tests.
- [ ] Record the feed URL, snapshot block, wallet role, and failed checks.

## Teams

### Directory and navigation

- [ ] `/teams` opens the directory without selecting a default team.
- [ ] Table rows and cards open their team across the full surface.
- [ ] Enter, modifier-click, and open-in-new-tab retain native link behavior.
- [ ] Nested owner, contract, and copy controls do not open the team.
- [ ] A workspace shows `/teams / <team-id>` and uses `/teams` as the clear back action.
- [ ] The team address and section persist through refresh, back, and forward.
- [ ] Invalid or unknown team addresses return safely to the directory.
- [ ] The hero changes from `Team Finances` to the selected team name.

### Overview and identity

- [ ] Owner, contract, token, depositor, and transaction identities open the correct
  Mainnet Etherscan page.
- [ ] Compact explorer actions stay crisp and do not shift their row on hover or focus.
- [ ] Owner, team id, and contract values align consistently.
- [ ] Pending ownership is absent when there is no transfer.
- [ ] A pending transfer adds one visible warning and one linked pending owner.
- [ ] Current-period and lifetime cards each show revenue, cost, and one signed net.
- [ ] Headers do not repeat the same eyebrow, title, or description.

### Revenue, funding, and bonus

- [ ] A disconnected user can connect; a non-Mainnet user can switch networks.
- [ ] If refresh or freshness verification fails, the last accepted snapshot may remain
  visible; actions stay disabled and the rejected payload does not replace it.
- [ ] DAI, USDC, and other token symbols stay on one line in choices and amount inputs.
- [ ] Converter routes show the converter contract and never invent an output token.
- [ ] Direct routes remain labelled direct.
- [ ] Deposit preview values and long ledger records stay inside their cards.
- [ ] Live deposits do not promise a pre-submit USD credit; recorded credit appears
  after protocol accounting publishes it.
- [ ] Transaction history links the transaction and depositor, then shows the log index.
- [ ] Mock-only records say `Local preview` and do not show a dead hash-like link.
- [ ] Financial-history rows have no hover invitation, pointer cursor, or click action.
- [ ] Funding rows show `Approval #<index>`, not fixture ids.
- [ ] Past approvals are expired and actionless; future approvals are scheduled.
- [ ] Current-period claim and return limits use exact raw token units.
- [ ] Bonus math stays inside its card and viewport at narrow widths.
- [ ] User-facing dates render in UTC.

## YBC

- [ ] Each member shows one resolved name and one linked canonical address.
- [ ] Name order is local preference, verified Mainnet ENS, then stable pseudonym.
- [ ] The UI does not show `Local`, `ENS`, or `Generated` badges.
- [ ] Clicking the name, Enter, or Space opens the local-name editor.
- [ ] The secondary pencil appears only on fine-pointer hover or keyboard focus and
  stays crisp without shifting the row.
- [ ] Save, cancel, reset, and Escape return focus to the member name.
- [ ] A saved local name survives refresh and remains local to that browser profile.
- [ ] Clearing a local name restores ENS or the pseudonym.
- [ ] A local name never hides the canonical address or changes an action.
- [ ] Duplicate pseudonyms receive stable ordinals.
- [ ] Member, proposer, target, operator, contract, and transaction links open the
  correct Mainnet Etherscan page.
- [ ] Proposal, reward, operator, and last-updated dates render in UTC.
- [ ] Proposal actions appear only for the connected wallet's current verified state.
- [ ] If refresh or freshness verification fails, the last accepted snapshot may remain
  visible; actions stay disabled and the rejected payload does not replace it.
- [ ] Reward claims continue to the shared stYFI rewards route.

## Responsive and cross-app checks

- [ ] Teams has no document-level horizontal overflow at 375px.
- [ ] YBC has no document-level horizontal overflow at 360px with a long valid name.
- [ ] Long addresses, hashes, values, dates, and tooltip content remain contained.
- [ ] Coarse-pointer address labels remain usable Etherscan targets.
- [ ] Light and dark themes keep text, warnings, focus rings, and disabled states clear.
- [ ] stYFI, veYFI, and yETH smoke flows still behave as before.
- [ ] Existing contract disclosures outside Teams and YBC keep their established
  presentation.

## Teams v2 hot switch

The producer contract is
[`gov-apps-stats-teams-ybc-feed-brief.md`](gov-apps-stats-teams-ybc-feed-brief.md).

- [ ] Validate the complete v2 candidate against the Teams schema before publication.
- [ ] The candidate uses a canonical block at or after `25,633,144`.
- [ ] Corrected accountant values are consumed directly with no second `10^12`
  multiplication.
- [ ] Every financial and event USD field declares and uses 18-decimal units.
- [ ] Profit and loss reconcile with revenue and cost.
- [ ] `revenueRecipient.token` accompanies any recipient balance tuple.
- [ ] Exercise the exact candidate through the existing `/api/teams-data` route by
  fixture or request interception. Do not create a second public endpoint.
- [ ] While the candidate is being verified, financial actions stay paused.
- [ ] After verification, DAO Ops period 2 cost renders as `$153,000`, not a
  six-decimal or double-scaled value.
- [ ] Deploy the compatible frontend before replacing the stable object.
- [ ] With v1 still present, nonfinancial data remains available and finance fails
  closed.
- [ ] Atomically replace the object at `NEXT_PUBLIC_TEAMS_DATA_URL` with v2.
- [ ] Purge the producer cache or wait the full 60-second window.
- [ ] Confirm the real `/api/teams-data` response uses `Cache-Control: no-store`.
- [ ] Do not use v1 as rollback. Publish a fresh validated v2, roll back a tested
  frontend/feed pair, or disable Teams.

## Sign-off

- [ ] Product accepts Teams behavior.
- [ ] Product accepts YBC behavior.
- [ ] Accessibility accepts keyboard, focus, and mobile interaction.
- [ ] Security accepts the final code and producer contract.
- [ ] Fork and preprod transaction checks pass.
- [ ] The data producer owner accepts the v2 publication checklist.
- [ ] The release owner approves the production feature flags.
