# Teams + YBC Delivery Roadmap

Status: proposed delivery plan
Scope: new `/teams` app surface and new `/ybc` app surface
Primary goal: ship mock-first design-quality surfaces quickly, then mature them into
fork-backed, contract-backed flows with controlled rollout.

## Naming decision

### Canonical app names and slugs

- Teams app name / slug: `teams`
- YBC app name / slug: `ybc`

### Recommended display labels

- `/teams` route / host label: **Team Finances**
- `/ybc` route / host label: **Yearn Builder's Collective**

### Beta publication hosts

- Teams beta host: `teams-beta.dao-ops.com`
- YBC beta host: `ybc-beta.dao-ops.com`

These beta hosts may publish mock / dummy data for review. Production exposure remains
blocked until live contract wiring is complete and the production green light is explicit.

### Production hosts

- Teams production host: `teams.yearn.fi`
- YBC production host: `ybc.yearn.fi`

These hostnames are fixed, but they must not go live until the work is delivered, live
contracts are wired, and production launch is approved.

App menu / navigation placement is intentionally out of scope for M0 and should be
handled separately during production readiness.

### Why this split is preferred

`teams` is the best **stable app key** because the contract system is team-centric, not purely
ledger-centric. The surface covers team directory, revenue, funding, bonus, ownership, and admin
lifecycle—not just accounting, not just budgeting, and not just P&L.

Use the short key for routing and future hostnames, then use the richer label in header copy and
product copy.

## Delivery principles

1. Mock-first before onchain.
2. One work package = one reviewable PR.
3. Merge accepted work through the long-lived `agent/integration` branch.
4. Do not create every future worktree up front.
5. Only start fork / onchain work once mock UX, data contracts, and debug-runtime
   alignment are accepted.
6. Tag `agent/integration` when a milestone is accepted, for example `integration/m0`.

## Shared dependency tree

### Shared foundation

These should be decided once before both tracks move far:

- canonical app names / slugs, route keys, and display labels
- beta-host rollout policy for mock / dummy data
- production hostnames and rollout gate after live contract wiring
- dedicated mock data schemas for both tracks
- iconography / copy tone alignment
- beta host, production host, and runtime gate behavior
- any shared UI primitives needed by both tracks

### Teams-specific dependencies

- final app name / slug and route key decision (`teams`)
- mock data contract for:
  - team directory
  - team workspace
  - funding approvals
  - bonus periods
  - admin budget buckets
- deposit conversion preview rules
- funding status wording and vesting edge-case wording

### YBC-specific dependencies

- final app name / slug and route key decision (`ybc`)
- mock data contract for:
  - governance influence hero
  - members roster
  - proposal timeline
  - thresholds / status states
- weight maturity visualization
- exact stance on rewards CTA linking out to shared claim surface

## Milestones

## M0 — Planning + data contracts

Shared:
- finalize naming
- finalize route / beta-host / production-host stance
- define mock schemas and example payloads
- create planning docs, work packages, prompts, and worktree scripts

Teams:
- finalize IA and state model
- approve key mock scenarios

YBC:
- finalize IA and state model
- approve key mock scenarios

### Exit gate
- product/ops agree on the surfaces and names
- mock schemas accepted
- work packages approved

---

## M1 — Static concept surfaces (parallel)

Teams:
- route shell
- team directory
- team workspace overview
- mock-only cards / tables / empty states
- beta-host review target: `teams-beta.dao-ops.com`
- production host target remains gated: `teams.yearn.fi`

YBC:
- route shell
- hero stats
- members roster
- proposal cards with timeline / thresholds
- mock-only cards / tables / empty states
- beta-host review target: `ybc-beta.dao-ops.com`
- production host target remains gated: `ybc.yearn.fi`

### Exit gate
- design review passed
- copy review passed
- layout responsive and accessible

---

## M2 — Interactive mock flows (parallel)

Teams:
- deposit revenue interaction
- funding claim / return flows
- bonus tooltip and period drilldown
- admin info architecture

YBC:
- proposal actions mock flow
- timeline states
- vote progress / threshold states
- rewards CTA / cross-app claim handoff
- operator panel structure

### Exit gate
- product acceptance on mock flows
- no missing states
- local mock QA completed

---

## M2A — Debug-runtime alignment (parallel)

Recommended package split:
- `teams / WP7` and `ybc / WP6`: debug-backed runtime, store, and E2E bridge work
- `teams / WP8` and `ybc / WP7`: production-parity copy, control placement, and residual cleanup

Recommended parallelism:
- run the two runtime packages in parallel, but coordinate shared `DebugControls` and
  `window.__TEST__` edits
- after each track lands its runtime package, run the two cleanup packages in parallel
- do not start `M3` on either track until both `M2A` cleanup packages are accepted

Teams:
- move Teams state seeding and prototype controls into the floating debug panel
- replace route-local scenario chrome with a mutable debug-backed store
- remove mock / prototype wording from the default route where production wording is intended
- preserve loading, empty, retired, bonus-ready, funding-ready, and operator/admin QA states through debug presets and test APIs

YBC:
- move YBC state seeding and prototype controls into the floating debug panel
- replace route-local scenario chrome with a mutable debug-backed store
- remove mock / prototype wording from the default route where production wording is intended
- preserve observer, member, operator, empty-board, rewards, and proposal-lifecycle QA states through debug presets and test APIs

### Exit gate
- default route copy reads production-ready on both tracks
- app-specific debug controls cover all accepted M1 / M2 QA states
- no page-local prototype or scenario chrome remains on the shipped route surfaces

---

## M3 — Onchain reads on fork (parallel)

Teams:
- read-only team directory / workspace
- current period, lifetime stats, funding approvals, claimability, bonus state

YBC:
- read-only hero, members, proposal status, threshold config, weight maturity, rewards view

### Exit gate
- fork-backed reads work reliably
- disconnected and connected states behave correctly
- query invalidation and refresh behavior verified

---

## M4 — Onchain writes on fork (parallel)

Teams:
- deposit revenue
- claim funding
- return funding
- claim bonus
- selected admin actions in scope

YBC:
- propose addition / expulsion
- retract
- vote yea / nay
- execute
- selected operator actions in scope

### Exit gate
- write paths simulate before submit
- fork evidence captured
- tx success and failure paths reviewed

---

## M5 — UAT + preprod (parallel)

Teams:
- internal UAT with representative team-owner and admin scenarios
- beta/preprod exposure on `teams-beta.dao-ops.com`
- production host readiness for `teams.yearn.fi`

YBC:
- internal UAT with observer/member/operator scenarios
- beta/preprod exposure on `ybc-beta.dao-ops.com`
- production host readiness for `ybc.yearn.fi`

### Exit gate
- UAT sign-off
- preprod smoke checklist green
- open bugs triaged to launch blockers vs post-launch

---

## M6 — Controlled production rollout

Recommended order:
1. live-contract wiring accepted
2. production green light recorded
3. limited internal / governance audience
4. production exposure on `teams.yearn.fi` and `ybc.yearn.fi` only after release checklist approval

### Exit gate
- release checklist complete
- docs current
- rollback path tested
- monitoring and smoke steps documented

## Integration and worktree creation order

Create the integration lane first from the `bootstrap` checkout:

```fish
./scripts/agent-worktree.sh create integration --no-install
```

This creates branch `agent/integration` and worktree `../governance-apps.agent.integration`.

Create work package worktrees from the integration worktree and base them on `agent/integration`:

```fish
cd ../governance-apps.agent.integration
./scripts/workpkg-worktree.sh create --track teams --milestone m0 --wp wp0 --base agent/integration --no-install
./scripts/workpkg-worktree.sh create --track ybc --milestone m0 --wp wp0 --base agent/integration --no-install
```

Merge only reviewed work package branches back into `agent/integration`. Tag the integration
commit after a milestone is accepted, for example:

```fish
git tag -a integration/m0 -m "Complete M0 integration"
```

Create later, only when needed:
- `teams / m1 / wp1`
- `ybc / m1 / wp1`
- any `m2a` debug-runtime alignment worktrees
- any `m3+` fork/onchain worktrees
- any production rollout worktrees
- admin-console worktrees before base user surfaces are accepted

## UAT checkpoints

### Teams

- UAT-T1: Team directory and overview accepted
- UAT-T2: Deposit conversion preview accepted
- UAT-T3: Funding claim statuses accepted
- UAT-T4: Bonus tooltip / period presentation accepted
- UAT-T5: Admin information architecture accepted
- UAT-T5A: Teams production-parity surface and debug controls accepted
- UAT-T6: Fork-backed reads validated
- UAT-T7: Fork-backed writes validated
- UAT-T8: Preprod validated

### YBC

- UAT-Y1: Hero and members roster accepted
- UAT-Y2: Proposal timeline accepted
- UAT-Y3: Threshold visualization accepted
- UAT-Y4: Weight maturity visualization accepted
- UAT-Y5: Rewards CTA / claim handoff accepted
- UAT-Y6: Admin/operator panel accepted
- UAT-Y6A: YBC production-parity surface and debug controls accepted
- UAT-Y7: Fork-backed reads validated
- UAT-Y8: Fork-backed writes validated
- UAT-Y9: Preprod validated

## Definition of “ready to merge”

A work package is ready to merge only when:
- scope is complete
- acceptance criteria are met
- tests updated
- docs updated
- reviewer notes resolved
- integration notes added if merge order matters
