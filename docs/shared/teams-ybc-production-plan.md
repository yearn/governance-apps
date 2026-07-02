# Teams + YBC Production Plan

Status: active production plan
Date: 2026-06-30
Last updated: 2026-07-02
Primary repos: `governance-apps`, `gov-apps-stats`, `styfi`

## 1. Current decision

The Teams and YBC apps should now move from mock-backed prototype mode to a
feed-backed production path.

The old blocking assumption was that the contract deployment manifest still needed to be
assembled. That is no longer true. `../styfi` `master` now contains the deployment
manifest and finalized contract sources needed to define the app data contracts.

The feed contract, producer implementation, live feed validation, and feed-backed read
wiring are now complete for both apps. The remaining production path is:

1. merge the accepted data/read work from `agent/data` into `agent/integration`;
2. wire the limited write surface through the shared transaction pipeline;
3. smoke test launch writes on a mainnet fork using live or saved feed JSON;
4. smoke test route, wallet, feed, and host behavior on preprod/beta;
5. enable each app's production route flag after approval;
6. monitor feed freshness and early write reports, then iterate in production.

No per-app mock/live split or separate write-only feature flag is planned for this
controlled launch. `NEXT_PUBLIC_USE_MOCKS` remains a global local/debug toggle. In
production, `NEXT_PUBLIC_ENABLE_TEAMS` and `NEXT_PUBLIC_ENABLE_YBC` expose each whole
app once its read and launch-write path is accepted.

## 2. Ownership model

Use a hybrid cross-repo model:

- `governance-apps` owns the consumer contract, schema docs, UI assumptions, frontend
  validation, writes, fork smoke, and production rollout docs.
- `gov-apps-stats` owns chain/event indexing, feed generation, cursor state, R2 writes,
  and producer tests.
- `styfi` remains the source of truth for deployed addresses and contract behavior.

The consumer contract must be written before the producer implementation starts. This
keeps the external data producer from optimizing for whatever is easiest to emit while
the frontend needs a different shape.

## 3. Architecture

```mermaid
flowchart LR
  Styfi["styfi repo\ncontracts + deployment.json"] --> Stats["gov-apps-stats\nindex + aggregate"]
  Chain["Ethereum mainnet\nlogs + view calls"] --> Stats
  Stats --> R2Teams["R2 teams.json"]
  Stats --> R2Ybc["R2 ybc.json"]
  R2Teams --> Frontend["governance-apps\nTeams/YBC feed clients"]
  R2Ybc --> Frontend
  Wallet["Connected wallet\nlive account reads"] --> Frontend
  Frontend --> Tx["shared useTx pipeline\nwrites + invalidation"]
  Tx --> Chain
```

Historical lists, proposal boards, team rosters, approvals, bonuses, and derived
financial state belong in `gov-apps-stats`. Browser code should not scan historical logs.

Wallet-specific eligibility and write readiness belong in the frontend because they are
small, current-state decisions tied to the connected account, current chain, balances,
allowances, and simulation. Producer fields such as Teams `team.availableActions` may be
kept as compatibility hints, but production write CTAs must not treat them as
authoritative permissions.

Operational switches are intentionally simple:

- `NEXT_PUBLIC_USE_MOCKS=true` is global and for local/debug or deterministic E2E use
  only; it is not allowed in production.
- There are no per-app mock/live switches for Teams or YBC.
- Production app flags expose the accepted app surface. For this launch that means
  feed-backed reads plus launch-scope writes together, not a separate read-only or
  write-only production mode.
- State-specific UI coverage for Teams/YBC should use fixtures or test-time interception
  of `/api/teams-data` and `/api/ybc-data`, not production mock mode.

## 4. Production scope

### Teams launch scope

Read scope:

- team directory and selected team workspace;
- active, retired, and migrated team lifecycle state;
- current and historical budget periods;
- revenue, costs, profit/loss, and lifetime totals;
- revenue deposit history;
- funding approvals, claimable amounts, claims, vesting, returns, and refund totals;
- bonus periods, parameters, pending claim cursor, estimated claimable YFI, YBC split,
  and claim history;
- accepted revenue/funding tokens and oracle/converter metadata.

Write scope:

- deposit revenue through `Team.deposit_revenue`;
- claim funding through `Team.claim_funding`;
- return funding through `Team.return_funding`;
- claim team bonus through `BonusDistributor.claim`.

Explicitly out of launch scope:

- generic admin setter UI;
- vest claim management after funding claim;
- generic contract interaction tools.

### YBC launch scope

Read scope:

- member roster and membership history;
- raw upstream stake and effective YBC weight;
- proposal lifecycle, votes, thresholds, execution status, and timing;
- reward distributor summary and claim history;
- operator/config visibility needed to explain current state.

Write scope:

- propose addition;
- propose expulsion;
- retract own proposal;
- vote yea;
- vote nay;
- execute passed proposal.

Explicitly out of launch scope:

- arbitrary-call operator console;
- duplicate staking UX;
- separate isolated YBC reward claim engine.

YBC rewards should continue to hand off to the shared reward claim path unless a later
product decision explicitly changes that.

## 5. Required feeds

The producer must publish two standalone feed objects:

- `teams.json`, documented in
  `docs/apps/teams/onchain-integration-plan/teams-feed-schema-v1.md`;
- `ybc.json`, documented in
  `docs/apps/ybc/onchain-integration-plan/ybc-feed-schema-v1.md`.

Do not merge these into the existing shared `stats.json`. The payloads are app-specific,
more complex, and should be independently versioned and rolled back.

Recommended frontend env keys:

- `NEXT_PUBLIC_TEAMS_DATA_URL`;
- `NEXT_PUBLIC_YBC_DATA_URL`.

Recommended producer internals:

- persistent scan state per feed;
- conservative confirmation depth before publishing logs;
- atomic R2 object writes;
- previous-good-object retention for rollback.

Do not add producer complexity for wallet-specific Teams action eligibility. Emit the
raw facts needed by the UI, such as team status, ownership, current period, claimable
funding, bonus status, token metadata, and revenue-recipient state. `team.availableActions`
can stay in v1 for compatibility, but it is not the consumer authority for writes.

## 6. Work packages from here to production

### Shared and cross-repo packages

| Package | Repo | Owner role | Purpose |
| --- | --- | --- | --- |
| Shared WP1 | `governance-apps` | Consumer planner | Define Teams/YBC feed contracts and production plan. |
| Shared WP2 | `gov-apps-stats` | Producer implementer | Implement event/view indexing and publish staging feeds. |
| Shared WP3 | `governance-apps` | Consumer verifier | Validate staging feed shape, freshness, and semantic fit. |

### Teams packages

| Package | Repo | Purpose |
| --- | --- | --- |
| Teams WP9 | `governance-apps` | Replace mock-only reads with `teams.json` feed-backed reads and live wallet overlays. |
| Teams WP10 | `governance-apps` | Wire launch-scope Teams writes through shared `useTx`. |
| Teams WP11 | `governance-apps` | Run fork/preprod smoke, UAT, release notes, and rollback checks. |

### YBC packages

| Package | Repo | Purpose |
| --- | --- | --- |
| YBC WP8 | `governance-apps` | Replace mock-only reads with `ybc.json` feed-backed reads and live wallet overlays. |
| YBC WP9 | `governance-apps` | Wire launch-scope YBC writes through shared `useTx`. |
| YBC WP10 | `governance-apps` | Run fork/preprod smoke, UAT, release notes, and rollback checks. |

## 7. Recommended sequencing

1. Merge `agent/data` into the long-lived `agent/integration` lane.
2. Run Teams WP10 and YBC WP9 in parallel for launch-scope writes.
3. Keep writes on the shared `useTx` path with simulation, wrong-network blocking, and
   query invalidation.
4. Run Teams WP11 and YBC WP10 for targeted fork smoke, preprod smoke, release notes,
   and rollback checks.
5. Use live or saved production feed JSON for normal fork smoke; use deterministic
   fixture JSON or route interception only for states not present in live feeds.
6. Release each app behind its production route flag after approval. Do not add separate
   Teams/YBC write flags unless the launch scope changes materially.
7. Monitor feed freshness and early write reports, then fix issues in production.

If only one implementer is available, do Teams WP10 first, then YBC WP9, then the fork
and preprod packages. Teams has the higher write/data-model risk; YBC has the cleaner
write surface once the proposal feed is correct.

## 8. Sub-agent usage

Use the same implementer/reviewer/integrator split already used in this repo.

Recommended agents:

- **consumer planner** in `governance-apps.agent.data`: owns docs, schemas, and handoff.
- **producer implementer** in `gov-apps-stats`: implements Shared WP2 only.
- **producer reviewer** in `gov-apps-stats`: reviews indexing correctness, cursor safety,
  schema compliance, and tests.
- **consumer verifier** in `governance-apps`: validates real staging feeds against schema
  and frontend needs before app wiring starts.
- **frontend implementers** in Teams/YBC work package worktrees: implement one app package
  each.
- **frontend reviewers**: review package scope, route behavior, state coverage, tests, and
  docs.
- **integrator** in `agent/integration`: merges accepted packages and records release notes.

Do not let two agents independently invent producer and consumer shapes. The feed contract
is the dependency between repos.

## 9. Validation approach

Minimum validation before production:

- schema validation for `teams.json` and `ybc.json`;
- producer tests for log reducers and view-call aggregation;
- frontend adapter tests for feed parsing and safe fallbacks;
- Teams unit tests for period math, funding claimability, and bonus display state;
- Teams write tests for client-derived CTA eligibility, including a guard that
  `team.availableActions` is not trusted as authorization;
- YBC unit tests for epoch math, proposal status, threshold display, and action
  eligibility;
- targeted fork smoke for the launch write paths;
- fixture or route-intercept coverage for Teams/YBC states absent from live feeds;
- preprod smoke on shared route and beta host;
- wrong-network and missing-feed fallback checks.

Do not require exhaustive mock-state replay before launch. Keep the old mock states for
debug and regression coverage, but do not block production on every historical visual state.
Do not build a forked `gov-apps-stats` feed for launch testing unless a later bug proves
the saved/live JSON plus fixtures strategy insufficient.

## 10. Rollout gates

Production exposure requires:

- staging feeds valid and fresh;
- frontend reads no longer depend on mock-only backends in production mode;
- launch-scope writes simulate before submit and use shared `useTx`;
- fork smoke evidence captured;
- preprod host smoke green;
- production feature flags documented;
- rollback path tested.

Rollback options:

- disable the app production flag;
- point env back to previous-good R2 object;
- revert the route mapping if host-level exposure causes issues.

## 11. Open inputs

These must be resolved during Shared WP2 or Shared WP3:

- final R2 staging and production URLs;
- confirmation depth and reorg policy for feed publication;
- cursor-state storage path in `gov-apps-stats`;
- operator/member/team-owner wallets to use for fork smoke;
- whether launch should expose Teams and YBC together or independently.

Deployment block heights are already available in `styfi/deployment.json`:
`STYFI_DEPLOY_BLOCK=24377403`, `YBC_DEPLOY_BLOCK=25228044`, and
`TEAMS_DEPLOY_BLOCK=25244861`.
