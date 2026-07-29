# Team Finances Fork Runbook

Use this runbook after the staging `teams.json` feed is accepted and Teams launch-scope
writes are wired.

Shared approach: [`../../../shared/teams-ybc-fork-smoke-plan.md`](../../../shared/teams-ybc-fork-smoke-plan.md).

## 1. Start mainnet fork

Example:

```fish
anvil --fork-url "$MAINNET_RPC_URL" --chain-id 1 --port 8545
```

Set local env in the worktree:

```text
NEXT_PUBLIC_RUNTIME_MODE=development
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_E2E=false
NEXT_PUBLIC_RPC_URLS=http://127.0.0.1:8545
NEXT_PUBLIC_TEAMS_DATA_URL=<validated-corrected-v2-url>
```

Until the stable object has been hot-switched, use the exact corrected v2 candidate
that is being prepared for release. It must use a canonical block at or after
`25,633,144`. Do not use the current v1 object as financial evidence. After cutover, a
saved copy of the validated stable v2 object is also acceptable. For states not present
in the candidate, use deterministic fixture JSON or test-time interception of
`/api/teams-data`. A pre-cutover candidate URL must remain local or private test
plumbing, not a second public or versioned producer endpoint.

Fork writes will not update the R2 feed. That is expected. Validate transaction
simulation/submission and fork chain effects separately from "next feed snapshot"
rendering, which should be covered with fixtures or mocked fetch responses.

## 2. Goals for fork validation

Validate at minimum:

- directory reads load from `teams.json`
- workspace reads load from `teams.json`
- feed freshness and snapshot block metadata are visible in diagnostics or logs
- live/saved feed rendering remains coherent before and after fork writes
- revenue deposit preview and deposit path
- funding claim path
- funding return path
- bonus claim path
- no generic admin write path is exposed by default

Preferred fast path:

1. Keep the app in non-mock mode with the validated corrected v2 candidate.
2. Use the deployed production contracts on a mainnet fork; do not redeploy Teams
   contracts for launch smoke.
3. For owner-gated flows, impersonate the current team owner on the fork, transfer
   ownership to the local test wallet, and use a tiny local feed fixture or
   `/api/teams-data` interception so the feed owner matches the fork owner.
4. Seed only the current-period funding state needed for one claim/return smoke.
5. Treat bonus claim as required only when a clean claimable launch state exists; otherwise
   record the deferred reason and do not block unrelated launch-write confidence on
   synthetic bonus accounting setup.

After this baseline passes, UX-only Teams iterations may use mock mode and the mock
navigator/debug bridge locally. Re-run fork smoke when Teams onchain clients, write hooks,
transaction plumbing, amount parsing, approval handling, action gating, or write-button
argument threading changes.

## 3. Evidence to capture

Capture:

- wallet used
- fork block / RPC
- corrected v2 candidate URL and snapshot block
- tx hashes for successful writes
- screenshots for:
  - directory
  - revenue deposit flow
  - funding flow
  - bonus flow

## 4. Failure-path checks

Exercise and record:

- wrong-network write guard
- missing or stale `teams.json`
- missing approval / revert surface
- not-current-period funding claim
- no-bonus-available state
- read fallback when a non-critical data source is absent

## 5. Exit criteria

Treat fork validation as complete only when:
- all required reads render
- all in-scope writes are exercised
- feed fallback behavior is understood and documented
- at least one failure path is confirmed per major write flow
