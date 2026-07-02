# WP3 — Teams + YBC feed validation

## Objective

Validate staging `teams.json` and `ybc.json` from the consumer side before frontend app
wiring begins.

## Scope

- fetch staging feeds
- validate schema v1 shape
- verify deployment manifest values against docs
- inspect semantic completeness for Teams and YBC launch UI
- record missing fields, optional gaps, or schema changes
- create fixtures from real staging feeds if useful for frontend tests

## Non-goals

- implementing the app read clients
- implementing writes
- production rollout

## Dependencies

- shared WP2
- staging feed URLs

## Suggested files

- `docs/shared/teams-ybc-production-plan.md`
- `docs/shared/gov-apps-stats-teams-ybc-feed-brief.md`
- `docs/apps/teams/onchain-integration-plan/teams-feed-schema-v1.md`
- `docs/apps/ybc/onchain-integration-plan/ybc-feed-schema-v1.md`
- optional feed fixtures under app integration-plan examples

## Acceptance criteria

- both staging feeds parse and match schema v1
- feed freshness and snapshot block metadata are present
- Teams feed can support directory, workspace, funding, revenue, and bonus UI
- YBC feed can support roster, proposal board, votes, weights, and rewards UI
- producer gaps are either fixed or explicitly accepted as launch-safe
- frontend read packages can start without schema ambiguity

## Prompts

### Implementer prompt for WP3

You are implementing shared `WP3` — **Teams + YBC feed validation**.

Objective:
Verify the staging feeds from `gov-apps-stats` as the frontend consumer.

Scope:
- fetch and inspect `teams.json` and `ybc.json`
- compare them to schema v1 and known deployment addresses
- record any schema amendments or accepted producer gaps

Constraints:
- do not wire frontend clients yet
- do not silently accept missing launch-critical fields
- keep schema changes version-compatible unless the producer and consumer both agree to
  reset before production

Definition of done:
- frontend read work can begin with accepted staging feed contracts
- unresolved producer issues are documented and assigned

### Reviewer prompt for WP3

Review this consumer validation PR only against shared `WP3`.

Check:
- validation evidence is based on real staging payloads
- launch-critical Teams/YBC states have feed support
- optional or missing fields are honestly classified
- any schema changes are reflected in examples and handoff docs

Block if:
- frontend read work would still require guessing about feed shape
- known producer inconsistencies are left undocumented
- deployment addresses or block metadata cannot be trusted

### Integrator prompt for WP3

Integrate shared `WP3` into `agent/integration` only after:

- validation notes are complete
- schemas and examples match the accepted staging payloads
- frontend read packages are unblocked
