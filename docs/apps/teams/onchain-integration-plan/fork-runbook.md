# Team Finances Fork Runbook

Use this runbook once mock UX is accepted and onchain work begins.

## 1. Start mainnet fork

Example:

```bash
anvil --fork-url "$MAINNET_RPC_URL" --chain-id 1 --port 8545
```

Set local env in the worktree:

```bash
NEXT_PUBLIC_RUNTIME_MODE=development
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_E2E=false
NEXT_PUBLIC_RPC_URLS=http://127.0.0.1:8545
```

## 2. Goals for fork validation

Validate at minimum:

- directory reads load
- workspace reads load
- revenue deposit preview and deposit path
- funding claim path
- funding return path
- bonus claim path
- at least one admin read path

## 3. Evidence to capture

Capture:

- wallet used
- fork block / RPC
- tx hashes for successful writes
- screenshots for:
  - directory
  - revenue deposit flow
  - funding flow
  - bonus flow

## 4. Failure-path checks

Exercise and record:

- wrong-network write guard
- missing approval / revert surface
- not-current-period funding claim
- no-bonus-available state
- read fallback when a non-critical data source is absent

## 5. Exit criteria

Treat fork validation as complete only when:
- all required reads render
- all in-scope writes are exercised
- at least one failure path is confirmed per major write flow
