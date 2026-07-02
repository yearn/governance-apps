# YBC Fork Runbook

Use this runbook after the staging `ybc.json` feed is accepted and YBC launch-scope
writes are wired.

Current implementation status: feed-backed reads and launch-scope proposal writes are
wired. This runbook is the next validation gate before exposing YBC on production
hosts.

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
NEXT_PUBLIC_YBC_DATA_URL=<live-or-saved-ybc-json-url>
```

Use the live production `ybc.json` or a saved copy from the same snapshot block for
normal fork smoke. Do not run a fork-specific `gov-apps-stats` publisher for launch
testing unless a concrete bug proves it necessary. For proposal/member states not
present in the live feed, use deterministic fixture JSON or test-time interception of
`/api/ybc-data`.

Fork writes will not update the R2 feed. That is expected. Validate transaction
simulation/submission and fork chain effects separately from "next feed snapshot"
rendering, which should be covered with fixtures or mocked fetch responses.

## 2. Goals for fork validation

Validate at minimum:

- overview reads load from `ybc.json`
- members roster reads load from `ybc.json`
- proposal board reads load from `ybc.json`
- feed freshness and snapshot block metadata are visible in diagnostics or logs
- live/saved feed rendering remains coherent before and after fork writes
- proposal creation path
- retract path when the connected wallet is the proposer and voting has not opened
- vote path
- execution path
- reward handoff remains a shared claim path

## 3. Evidence to capture

Capture:

- wallet used
- fork block / RPC
- `ybc.json` URL and snapshot block
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
- missing or stale `ybc.json`
- not-a-member restrictions where applicable
- proposal not yet in voting window
- proposal expired
- threshold not met

## 5. Exit criteria

Treat fork validation as complete only when:
- all required reads render
- all in-scope writes are exercised
- feed fallback behavior is understood and documented
- proposal lifecycle timing is verified end to end
