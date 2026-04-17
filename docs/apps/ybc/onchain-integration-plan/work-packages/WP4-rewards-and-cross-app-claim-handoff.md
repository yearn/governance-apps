# WP4 — Rewards and cross-app claim handoff

## Objective

Implement the rewards visibility surface and the handoff to the shared claim route.

## Scope

- render pending YBC-related rewards state
- make clear that claiming happens through the shared reward flow
- add cross-app CTA / handoff copy
- cover empty and non-member states

## Non-goals

- building a separate isolated YBC claim engine
- duplicating the full stYFI claim UX

## Dependencies

- WP1
- WP2

## Suggested files

- `app/ybc/components/RewardsCard.tsx`
- `app/ybc/messages.ts`
- `components/domain/CrossAppNudge.tsx`

## Acceptance criteria

- rewards are visible without creating a false separate-claim mental model
- handoff CTA is clear
- copy does not imply YBC owns the entire claim stack
- member and non-member states are covered

## UAT checkpoint

UAT-Y5: rewards handoff accepted.

## Follow-on dependency

- Add browser-level coverage for shared-claim CTA host rewriting on `ybc-beta.dao-ops.com`
  and `ybc.yearn.fi` before subdomain rollout. WP4 covers the rewriting logic in component
  tests today, but the local Playwright harness still runs on `localhost`.

## Prompts


### Implementer prompt for WP4

You are implementing `ybc` `WP4` — **Rewards and cross-app claim handoff**.

Objective:
Implement the rewards visibility surface and the handoff to the shared claim route.

Scope:
- render pending YBC-related rewards state
- make clear that claiming happens through the shared reward flow
- add cross-app CTA / handoff copy
- cover empty and non-member states

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- update tests and docs if behavior changes

Definition of done:
- rewards are visible without creating a false separate-claim mental model
- handoff CTA is clear
- copy does not imply YBC owns the entire claim stack
- member and non-member states are covered



### Reviewer prompt for WP4

Review this PR only against `ybc` `WP4` — **Rewards and cross-app claim handoff**.

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



### Integrator prompt for WP4

Integrate `ybc` `WP4` — **Rewards and cross-app claim handoff** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
