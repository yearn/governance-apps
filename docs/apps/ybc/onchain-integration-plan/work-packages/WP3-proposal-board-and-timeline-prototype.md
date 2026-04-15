# WP3 — Proposal board and timeline prototype

## Objective

Implement the mock-backed proposal board, timeline, and threshold visualization.

## Scope

- render proposal cards with phase and timestamps
- show discussion / voting / passed / failed / executed / expired states
- show threshold targets and current vote state
- support mock propose / retract / vote / execute interactions

## Non-goals

- onchain writes
- generic transaction builders

## Dependencies

- WP1
- WP2

## Suggested files

- `app/ybc/components/ProposalBoard.tsx`
- `app/ybc/components/ProposalCard.tsx`
- `app/ybc/messages.ts`

## Acceptance criteria

- proposal phase is obvious without reading docs
- thresholds are visible and intuitive
- expired state is terminal in the UI
- mock interactions cover all major phases

## UAT checkpoint

UAT-Y2 and UAT-Y3: proposal timeline and threshold UI accepted.

## Prompts


### Implementer prompt for WP3

You are implementing `ybc` `WP3` — **Proposal board and timeline prototype**.

Objective:
Implement the mock-backed proposal board, timeline, and threshold visualization.

Scope:
- render proposal cards with phase and timestamps
- show discussion / voting / passed / failed / executed / expired states
- show threshold targets and current vote state
- support mock propose / retract / vote / execute interactions

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- proposal phase is obvious without reading docs
- thresholds are visible and intuitive
- expired state is terminal in the UI
- mock interactions cover all major phases



### Reviewer prompt for WP3

Review this PR only against `ybc` `WP3` — **Proposal board and timeline prototype**.

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



### Integrator prompt for WP3

Integrate `ybc` `WP3` — **Proposal board and timeline prototype** into the active milestone branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
