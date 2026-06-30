# Team Finances Fork Runbook

Use this runbook after the staging `teams.json` feed is accepted and Teams launch-scope
writes are wired.

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
NEXT_PUBLIC_TEAMS_DATA_URL=<staging-teams-json-url>
```

## 2. Goals for fork validation

Validate at minimum:

- directory reads load from `teams.json`
- workspace reads load from `teams.json`
- feed freshness and snapshot block metadata are visible in diagnostics or logs
- revenue deposit preview and deposit path
- funding claim path
- funding return path
- bonus claim path
- no generic admin write path is exposed by default

## 3. Evidence to capture

Capture:

- wallet used
- fork block / RPC
- `teams.json` URL and snapshot block
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
