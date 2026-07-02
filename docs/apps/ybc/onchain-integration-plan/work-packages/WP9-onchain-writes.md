# WP9 — Launch-scope writes

## Objective

Add write preparation and execution for the launch-scope YBC election actions after
feed-backed reads are stable.

## Implementation status

Implemented in `agent/integration`; pending targeted fork smoke before production
exposure.

The frontend now:

- prepares YBC election writes with minimal local ABIs
- sends writes through the shared `useTx` transaction flow
- requires explicit target addresses for feed-backed proposal creation
- derives action eligibility client side from feed data plus a live wallet overlay
- invalidates the YBC feed and connected-wallet overlay after successful transactions
- keeps feed snapshots authoritative instead of adding optimistic proposal rows or vote
  totals before `gov-apps-stats` indexes the write

## Scope

- prepare and execute propose addition / expulsion
- prepare and execute retract
- prepare and execute vote yea / nay
- prepare and execute execute-proposal
- invalidate feed and live wallet overlays after successful transactions

## Non-goals

- generic arbitrary-call UI
- full governance tooling outside the scoped flows
- direct operator add/remove member controls for launch
- duplicate reward claim execution

## Dependencies

- WP8 feed-backed reads

## Suggested files

- `lib/clients/ybc/onchain.ts`
- `lib/hooks/useYbc.ts`
- `lib/hooks/useYbcProposalWrites.ts`
- `lib/hooks/ybcKeys.ts`
- `tests/integration/hooks/*ybc*`

## Acceptance criteria

- writes simulate before submit where the repo pattern expects it
- proposal lifecycle writes keep state consistent after mutation
- success and failure states are coherent
- wrong-network behavior is blocked cleanly
- write CTAs only appear when the feed and live wallet overlay support the action

## Implementation notes

- `execute` is permissionless at the contract level. The UI therefore requires only a
  connected mainnet wallet for passed proposals, not YBC membership.
- `vote` requires current membership, live positive weight, no previous vote, and not
  voting on the connected wallet's own expulsion.
- `retract` is proposer-only while the proposal is still in the pre-vote discussion
  window.
- `propose_addition` and `propose_expulsion` require a valid nonzero target address
  that is not the YBC contract; final membership validity is still enforced by
  simulation and the contract.
- `availableActions`-style backend write booleans are not required for YBC. Eligibility
  is derived by the frontend from canonical feed fields and live wallet reads.

## UAT checkpoint

UAT-Y8: fork-backed write paths validated.

## Prompts


### Implementer prompt for WP9

You are implementing `ybc` `WP9` — **Launch-scope writes**.

Objective:
Add write preparation and execution for the launch-scope YBC election actions after
feed-backed reads are stable.

Scope:
- prepare and execute propose addition / expulsion
- prepare and execute retract
- prepare and execute vote yea / nay
- prepare and execute execute-proposal
- invalidate feed and live wallet overlays after successful transactions

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- writes simulate before submit where the repo pattern expects it
- proposal lifecycle writes keep state consistent after mutation
- success and failure states are coherent
- wrong-network behavior is blocked cleanly
- write CTAs only appear when the feed and live wallet overlay support the action



### Reviewer prompt for WP9

Review this PR only against `ybc` `WP9` — **Launch-scope writes**.

Check:
- scope matches the package and does not bleed into later WPs
- acceptance criteria are fully met
- state coverage is complete
- docs are updated
- tests reflect behavior changes

Block if:
- the implementation introduces out-of-scope product behavior
- critical route states are missing
- shared repo patterns are ignored without justification
- writes bypass the shared transaction pipeline



### Integrator prompt for WP9

Integrate `ybc` `WP9` — **Launch-scope writes** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
