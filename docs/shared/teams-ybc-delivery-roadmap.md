# Teams + YBC Delivery Roadmap

Status: active production roadmap
Scope: `/teams` and `/ybc`
Primary goal: move the accepted mock-backed surfaces to production using finalized
deployed contracts, `gov-apps-stats` feeds, limited fork smoke, and controlled rollout.

## 1. Current state

Teams and YBC already have mock-backed frontend surfaces and debug/runtime planning. The
new production fact is that `../styfi` `master` now contains finalized deployed contract
addresses and contract sources.

The old roadmap was "mock first, then discover contracts." That is complete enough to
retire. As of 2026-07-02, `teams.json` and `ybc.json` are live, both frontend read
models are feed-backed, and both launch-write packages are wired through `useTx`. The
roadmap from here is now:

1. run targeted fork smoke with live or saved feed JSON;
2. run preprod/beta smoke;
3. release each accepted app behind its production route flag;
4. monitor feed freshness and write reports while iterating in production.

The detailed production plan is:

- [`teams-ybc-production-plan.md`](teams-ybc-production-plan.md)

The producer handoff brief is:

- [`gov-apps-stats-teams-ybc-feed-brief.md`](gov-apps-stats-teams-ybc-feed-brief.md)

## 2. Canonical app names and hosts

| App | Route | Display label | Beta host | Production host |
| --- | --- | --- | --- | --- |
| Teams | `/teams` | `Team Finances` | `teams-beta.dao-ops.com` | `teams.yearn.fi` |
| YBC | `/ybc` | `Yearn Builder's Collective` | `ybc-beta.dao-ops.com` | `ybc.yearn.fi` |

Production host exposure remains feature-gated until read feeds, launch writes, fork
smoke, preprod smoke, and production approval are complete.

## 3. Delivery principles

1. Feed contract before producer implementation.
2. Producer implementation before frontend read wiring.
3. Frontend read model before frontend writes.
4. Writes go through the shared `useTx` pipeline.
5. Browser code does not own historical log indexing.
6. One work package equals one reviewable PR.
7. Merge accepted work through `agent/integration`.
8. Release Teams and YBC independently if one track is ready before the other.
9. Do not add per-app mock/live switches for launch; `NEXT_PUBLIC_USE_MOCKS` is global.
10. Do not add separate Teams/YBC write flags for launch; each app production flag
    exposes the accepted read and launch-write surface together.

## 4. Milestones from here

### M3A — Data contract and producer handoff

Shared:

- define `teams.json` schema v1;
- define `ybc.json` schema v1;
- document required events, view calls, deployment addresses, and open producer inputs;
- hand off to `gov-apps-stats`.

Exit gate:

- shared WP1 accepted;
- producer brief is specific enough for implementation;
- unresolved inputs are explicit.

### M3B — `gov-apps-stats` producer implementation

Producer repo:

- import Teams/YBC deployment manifest;
- import deployment block heights from `styfi/deployment.json`;
- implement deterministic event reducers and snapshot view calls;
- publish staging `teams.json` and `ybc.json`;
- add producer tests and cursor safety.

Exit gate:

- shared WP2 accepted in `gov-apps-stats`;
- staging URLs available;
- producer notes include deployment block heights, confirmation depth, payload size, and
  known gaps.

### M3C — Consumer validation

Governance apps:

- fetch staging feeds;
- validate schema shape and deployment metadata;
- verify semantic completeness for launch UI;
- update schemas/examples if real payloads require compatible amendments.

Exit gate:

- shared WP3 accepted;
- Teams WP9 and YBC WP8 can start without feed ambiguity.

### M4 — Feed-backed reads

Teams:

- replace mock-only production reads with `teams.json` feed client;
- keep mocks as development/debug fallback;
- add live wallet overlays for owner, balances, allowances, and write readiness;
- treat feed-level `team.availableActions` as a compatibility hint only; CTA readiness
  is derived client side from raw feed facts, wallet state, current chain, and
  simulation.

YBC:

- replace mock-only production reads with `ybc.json` feed client;
- keep mocks as development/debug fallback;
- add live wallet overlays for member status, voted status, and write readiness.

Exit gate:

- Teams WP9 accepted;
- YBC WP8 accepted;
- production mode does not depend on mock-only clients.

### M5 — Launch-scope writes

Teams:

- deposit revenue;
- claim funding;
- return funding;
- claim bonus;
- derive CTA visibility and disabled states in the client instead of trusting
  `team.availableActions`.

YBC:

- propose addition;
- propose expulsion;
- retract own proposal;
- vote yea/nay;
- execute passed proposal.

Exit gate:

- Teams WP10 accepted;
- YBC WP9 accepted;
- wrong-network and failed simulation behavior are clean.

### M6 — Fork smoke, UAT, and preprod

Teams:

- run targeted fork smoke for directory, workspace, revenue, funding, return, and bonus;
- read from live or saved `teams.json` during fork smoke; use fixture/intercepted JSON
  only for states absent from the live feed;
- run preprod route smoke;
- triage launch blockers vs post-launch issues.

YBC:

- run targeted fork smoke for roster, proposals, voting, execution, and reward handoff;
- read from live or saved `ybc.json` during fork smoke; use fixture/intercepted JSON
  only for proposal/member states absent from the live feed;
- run preprod route smoke;
- triage launch blockers vs post-launch issues.

Exit gate:

- Teams WP11 accepted;
- YBC WP10 accepted;
- release checklist and rollback notes are complete.

### M7 — Controlled production rollout

Recommended order:

1. set production feed URLs and RPC env;
2. enable each app's production flag only after read, write, fork, and preprod approval;
3. expose the production host after approval;
4. monitor feed freshness and write reports.

Exit gate:

- production feature flags recorded;
- no separate Teams/YBC write flags required for this controlled launch;
- rollback path tested;
- monitoring and smoke steps documented.

## 5. Worktree creation order

Use the existing long-lived integration lane:

```fish
cd /Users/hydra/Developer/yearn/governance-apps
./scripts/agent-worktree.sh create integration --no-install
```

For governance-apps work packages, create package worktrees from
`../governance-apps.agent.integration` and base them on `agent/integration`.

Example:

```fish
cd /Users/hydra/Developer/yearn/governance-apps.agent.integration
./scripts/workpkg-worktree.sh create --track teams --milestone m4 --wp wp9 --base agent/integration --no-install
./scripts/workpkg-worktree.sh create --track ybc --milestone m4 --wp wp8 --base agent/integration --no-install
```

For `gov-apps-stats`, start a separate Codex thread or worktree rooted in that repo and
use shared WP2 plus the producer brief as the task source. Do not implement producer code
inside a governance-apps worktree.

## 6. Sub-agent roles

### Consumer planner

Owns shared WP1 in `governance-apps.agent.data`.

### Producer implementer

Owns shared WP2 in `gov-apps-stats`.

### Producer reviewer

Reviews event indexing, cursor safety, R2 publication, schema compliance, and tests.

### Consumer verifier

Owns shared WP3 in `governance-apps`.

### Frontend implementer

Owns one app work package at a time, such as Teams WP9 or YBC WP8.

### Frontend reviewer

Reviews scope, state coverage, docs, tests, accessibility, and transaction behavior.

### Integrator

Merges accepted work into `agent/integration`, resolves merge-order issues, and records
release notes.

## 7. UAT checkpoints

### Teams

- UAT-T6: feed-backed read model validated.
- UAT-T7: fork-backed write paths validated.
- UAT-T8: preprod readiness reviewed.
- UAT-T9: production flag and rollback plan accepted.

### YBC

- UAT-Y7: feed-backed read model validated.
- UAT-Y8: fork-backed write paths validated.
- UAT-Y9: preprod readiness reviewed.
- UAT-Y10: production flag and rollback plan accepted.

## 8. Definition of ready to merge

A work package is ready to merge only when:

- scope is complete;
- acceptance criteria are met;
- tests are updated where behavior changes;
- docs are updated;
- reviewer notes are resolved;
- integration notes are added if merge order or rollout is affected.
