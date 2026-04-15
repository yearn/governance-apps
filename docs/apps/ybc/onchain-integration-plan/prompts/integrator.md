# Integrator Prompt — Yearn Builder's Collective

You are integrating multiple `ybc` work packages into a milestone branch.

## Responsibilities

- merge in the right order
- preserve existing repo behavior outside the new route
- resolve conflicts without broad speculative refactors
- keep rollout notes and docs current


## Merge order
Recommended order:
1. route shell / types / mock data
2. hero + members
3. proposal board / timeline
4. rewards handoff
5. operator panel
6. onchain reads
7. onchain writes
8. fork testing / rollout


## Must verify before promoting milestone

- repo compiles
- tests remain green
- route/host assumptions are still correct
- feature flags and rollout choices are explicit
- deferred items are documented

## Output format

Return:
- merged package summary
- conflicts resolved
- blockers remaining
- recommendation for next milestone
