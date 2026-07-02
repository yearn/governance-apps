# WP10 — Launch-scope writes

## Objective

Add write preparation and execution for the launch-scope Team Finances actions after
feed-backed reads are stable.

## Status

Implemented in `agent/integration`; pending targeted fork smoke and UAT-T7 acceptance
before production exposure.

Implementation notes:

- `Team.deposit_revenue`, `Team.claim_funding`, `Team.return_funding`, and
  `BonusDistributor.claim` writes are prepared in the Teams domain client and executed
  through the shared transaction pipeline.
- Feed-mode UI derives action readiness from raw feed state, connected wallet, current
  chain, allowances, and simulation path rather than trusting `team.availableActions`.
- Successful writes invalidate Teams feed queries; fork smoke must validate transaction
  effects separately from the next R2 feed snapshot.

## Scope

- prepare and execute revenue deposit through `Team.deposit_revenue`
- prepare and execute funding claim through `Team.claim_funding`
- prepare and execute funding return through `Team.return_funding`
- prepare and execute bonus claim through `BonusDistributor.claim`
- invalidate feed and live wallet overlays after successful transactions
- derive write CTA availability from raw feed state, connected wallet, current chain,
  balances/allowances where relevant, and simulation

## Non-goals

- out-of-scope vest management
- every possible admin setter
- generic contract transaction builders
- trusting `team.availableActions` from `teams.json` as an authorization source

## Dependencies

- WP9 feed-backed reads

## Suggested files

- `lib/clients/teams/onchain.ts`
- `lib/hooks/useTeams.ts`
- `tests/integration/hooks/*teams*`

## Acceptance criteria

- writes simulate before submit where the repo pattern expects it
- success and failure states are coherent
- query invalidation keeps the workspace consistent after writes
- wrong-network behavior is blocked cleanly
- write CTAs only appear when the feed and live wallet overlay support the action
- write CTAs do not rely on `team.availableActions`; that feed block remains a
  compatibility hint only

## UAT checkpoint

UAT-T7: fork-backed write paths validated.

## Prompts


### Implementer prompt for WP10

You are implementing `teams` `WP10` — **Launch-scope writes**.

Objective:
Add write preparation and execution for the launch-scope Team Finances actions after
feed-backed reads are stable.

Scope:
- prepare and execute revenue deposit through `Team.deposit_revenue`
- prepare and execute funding claim through `Team.claim_funding`
- prepare and execute funding return through `Team.return_funding`
- prepare and execute bonus claim through `BonusDistributor.claim`
- invalidate feed and live wallet overlays after successful transactions
- derive write CTA availability from raw feed state, connected wallet, current chain,
  balances/allowances where relevant, and simulation

Constraints:
- stay inside this package only
- follow existing `governance-apps` patterns
- do not jump ahead into later milestones
- do not treat `team.availableActions` from `teams.json` as an authorization source
- update tests and docs if behavior changes

Definition of done:
- writes simulate before submit where the repo pattern expects it
- success and failure states are coherent
- query invalidation keeps the workspace consistent after writes
- wrong-network behavior is blocked cleanly
- write CTAs only appear when the feed and live wallet overlay support the action
- write CTAs do not rely on `team.availableActions`; that feed block remains a
  compatibility hint only



### Reviewer prompt for WP10

Review this PR only against `teams` `WP10` — **Launch-scope writes**.

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



### Integrator prompt for WP10

Integrate `teams` `WP10` — **Launch-scope writes** into the `agent/integration` branch only after:
- acceptance criteria are met
- reviewer blockers are resolved
- test baseline is green

During integration:
- keep the merge focused
- avoid broad conflict-driven refactors
- record any follow-on dependency created for the next WP
