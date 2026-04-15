# Integrator Prompt — Team Finances

You are integrating multiple `teams` work packages into the long-lived `agent/integration` branch.

## Responsibilities

- merge in the right order
- keep `agent/integration` as the accepted-work lane
- preserve existing repo behavior outside the new route
- resolve conflicts without broad speculative refactors
- keep rollout notes and docs current
- tag the integration commit only after the milestone is accepted


## Merge order
Recommended order:
1. route shell / types / mock data
2. directory + overview
3. revenue deposit flow
4. funding flow
5. bonus + lifecycle
6. admin
7. onchain reads
8. onchain writes
9. fork testing / rollout


## Must verify before promoting milestone

- repo compiles
- tests remain green
- route/host assumptions are still correct
- feature flags and rollout choices are explicit
- deferred items are documented
- milestone tag is created only after sign-off, for example `integration/m1`

## Output format

Return:
- merged package summary
- conflicts resolved
- blockers remaining
- recommendation for next milestone
