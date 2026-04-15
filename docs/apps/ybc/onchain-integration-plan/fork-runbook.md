# YBC Fork Runbook

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

- overview reads load
- members roster reads load
- proposal board reads load
- proposal creation path
- vote path
- execution path
- operator path in scoped MVP surface

## 3. Evidence to capture

Capture:

- wallet used
- fork block / RPC
- tx hashes for:
  - proposal creation
  - vote
  - execute
- screenshots for:
  - hero
  - members roster
  - active proposal
  - executable proposal

## 4. Failure-path checks

Exercise and record:

- wrong-network write guard
- not-a-member restrictions where applicable
- proposal not yet in voting window
- proposal expired
- threshold not met

## 5. Exit criteria

Treat fork validation as complete only when:
- all required reads render
- all in-scope writes are exercised
- proposal lifecycle timing is verified end to end
