# M5 WP15: Execution Safety and Execute Write

Branch: `agent/dao/m5/wp15`

## Objective

Recover, verify, freshly simulate, and execute the exact approved event script.

## Depends on

- M5 WP14 merged into `agent/integration`.

## Scope

- Exact script retrieval from validated feed/event data.
- Stored script-hash comparison.
- Current execution window, delay, status, guard, and operator reads.
- Fresh `Voting.execute` simulation against current state.
- Atomic-call failure presentation and prepared execute write.

## Non-goals

- No automatic execution.
- No bypass for missing or mismatched script.
- No claim that proposal-time simulation remains current.

## Acceptance criteria

- Missing or mismatched script blocks execution.
- Current simulation runs before wallet submission and its reference state is
  shown.
- A failed current simulation blocks the normal execute action.
- Guarded and permissionless modes use live configuration.
- Empty-script signals never show an execution CTA.
- The execute write uses shared `useTx` and exact bytes.

## Validation

- Hash vectors, window/delay boundaries, guard modes, stale state, revert, and
  atomic multi-call tests.
- Critical execution E2E and standard checks.

## Review

Execution/security auditor and transaction reviewer. Tag M5 after all write paths
and the full integration gate pass.
