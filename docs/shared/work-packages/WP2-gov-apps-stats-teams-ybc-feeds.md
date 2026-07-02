# WP2 — `gov-apps-stats` Teams + YBC feeds

## Objective

Implement the producer side of `teams.json` and `ybc.json` in `gov-apps-stats` using the
consumer contract defined in shared WP1.

## Scope

- import or encode the Teams/YBC deployment manifest
- import and record contract deployment block heights from `styfi/deployment.json`
- add minimal contract interfaces for required events and view calls
- index Teams events and publish `teams.json`
- index YBC events and publish `ybc.json`
- add persistent cursor state and safe R2 publication behavior
- add producer tests for reducers, schema shape, and snapshot publication
- publish staging feed URLs for consumer verification

## Non-goals

- frontend rendering
- frontend writes
- production flag changes
- broad refactors of unrelated existing stats feeds

## Dependencies

- shared WP1
- access to mainnet RPC
- access to staging R2 bucket/config

## Required docs

- `docs/shared/gov-apps-stats-teams-ybc-feed-brief.md`
- `docs/apps/teams/onchain-integration-plan/teams-feed-schema-v1.md`
- `docs/apps/ybc/onchain-integration-plan/ybc-feed-schema-v1.md`

## Acceptance criteria

- staging `teams.json` and `ybc.json` are published
- payloads parse as JSON and match schema v1
- scan cursors survive reruns
- publication never overwrites last-good objects with partial snapshots
- Teams feed includes registered teams, funding approvals, bonus state, and financials
- YBC feed includes members, proposals, votes, weights, and reward summary
- unresolved or approximate fields are documented in producer notes

## Handoff back to `governance-apps`

The producer PR or final note must provide:

- staging URL for `teams.json`
- staging URL for `ybc.json`
- deployment block heights used
- confirmation depth
- known missing optional fields
- payload sizes
- command used to generate/publish feeds

## Prompts

### Implementer prompt for WP2

You are implementing producer `WP2` — **`gov-apps-stats` Teams + YBC feeds**.

Objective:
Build the `teams.json` and `ybc.json` producer modules from the consumer contract.

Scope:
- implement indexing and view-call aggregation for Teams and YBC
- publish staging feeds
- add cursor safety and tests

Constraints:
- do not change frontend code
- do not invent alternate feed shapes without updating the consumer contract
- keep unrelated stats feed changes minimal
- treat `styfi/deployment.json` as the deployment source of truth

Definition of done:
- staging feeds are live
- schema and reducer tests pass
- consumer handoff includes URLs, deployment block heights, and known gaps

### Reviewer prompt for WP2

Review this producer PR only against shared `WP2`.

Check:
- event reducers are deterministic and reorg-aware
- snapshot view calls are made at a consistent block
- cursor state cannot skip or duplicate logs across reruns
- feed fields match the v1 schemas
- staging publication is atomic and rollback-safe
- existing stats feeds are not regressed

Block if:
- the producer emits a different schema without consumer approval
- browser-specific assumptions leak into producer output
- partial snapshots can overwrite last-good feeds
- contract addresses differ from `styfi/deployment.json`

### Integrator prompt for WP2

Integrate producer `WP2` in the `gov-apps-stats` repo only after:

- producer tests pass
- staging feeds are published
- consumer handoff notes are complete

Then notify the `governance-apps` consumer verifier to begin shared WP3.
