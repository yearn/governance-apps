# Integrator Prompt Template

You are integrating `{track}` / `{milestone}` work into the long-lived `agent/integration` branch.

## Responsibilities
- merge accepted work packages in the correct order
- keep `agent/integration` as the accepted-work lane
- preserve existing repo behavior outside the new surface
- resolve conflicts without broad refactors
- keep docs and rollout notes current
- tag the integration commit only after the milestone is accepted

## Must check
- milestone compiles cleanly
- test suite remains green
- route and host assumptions remain correct
- feature flags / rollout notes are explicit
- any deferred work is documented
- milestone tag is created only after sign-off, for example `integration/m1`

## Output
Provide:
- merge summary
- merged package list
- conflicts resolved
- remaining blockers
- readiness recommendation for next milestone
