# WP1 — Teams + YBC data contracts

## Objective

Define the production feed contracts and rollout plan for Teams and YBC before
`gov-apps-stats` implementation begins.

## Scope

- document the updated feed-first production approach
- define `teams.json` schema v1
- define `ybc.json` schema v1
- create example payloads for both feeds
- create the `gov-apps-stats` producer handoff brief
- update Teams/YBC planning docs to depend on the feeds

## Non-goals

- implementing producer code in `gov-apps-stats`
- wiring frontend clients
- enabling production routes

## Dependencies

- `styfi` `master` includes finalized deployment addresses and contract sources

## Suggested files

- `docs/shared/teams-ybc-production-plan.md`
- `docs/shared/gov-apps-stats-teams-ybc-feed-brief.md`
- `docs/apps/teams/onchain-integration-plan/teams-feed-schema-v1.md`
- `docs/apps/ybc/onchain-integration-plan/ybc-feed-schema-v1.md`
- `docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json`
- `docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json`

## Acceptance criteria

- feed contracts are specific enough for `gov-apps-stats` implementation
- producer and consumer ownership are explicit
- required Teams/YBC events and view calls are documented
- app work packages identify the feed dependency before frontend reads
- open producer inputs are captured

## UAT checkpoint

Shared data contract accepted by product/engineering before producer implementation.

## Prompts

### Implementer prompt for WP1

You are implementing shared `WP1` — **Teams + YBC data contracts**.

Objective:
Create the consumer-owned feed contract and production plan for Teams and YBC.

Scope:
- define `teams.json` and `ybc.json` schemas
- add example payloads
- write the `gov-apps-stats` producer handoff brief
- update shared and app-specific planning docs

Constraints:
- do not implement runtime code
- do not edit `gov-apps-stats` from this package
- keep the feed contracts focused on launch requirements
- record open inputs rather than guessing where accuracy matters

Definition of done:
- a producer agent can implement the feeds using the brief
- a frontend agent can implement feed-backed reads using the schema docs
- rollout and validation order is explicit

### Reviewer prompt for WP1

Review this PR only against shared `WP1` — **Teams + YBC data contracts**.

Check:
- feed fields are justified by known contract data or frontend launch needs
- producer/consumer boundaries are clear
- deployment addresses are copied from `styfi/deployment.json`
- mock-first assumptions no longer block production sequencing
- unresolved inputs are explicitly listed

Block if:
- the docs imply browser-side historical log indexing
- schemas require data that cannot be sourced or approximated
- write scope grows beyond the agreed production launch surface

### Integrator prompt for WP1

Integrate shared `WP1` into `agent/integration` only after:

- reviewer blockers are resolved
- docs links are valid
- example JSON parses
- downstream package dependencies are updated

Record in integration notes that `gov-apps-stats` Shared WP2 must start from this
contract.
