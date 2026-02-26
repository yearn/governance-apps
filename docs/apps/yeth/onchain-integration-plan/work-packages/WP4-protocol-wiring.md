# WP4 — Protocol Wiring (enable onchain yETH client)

## Objective
Switch yETH from always-mock to onchain client when mocks are disabled.

## Scope
Update `state/protocol.tsx`:

- Import `OnchainYethClient`
- In non-mock mode (`preferMocks === false`):
  - instantiate `new OnchainYethClient(publicClientForReads, globalData ?? null)`
    - where `publicClientForReads` is available even when wallet is disconnected
      (for example from wagmi transport / `usePublicClient`, with wallet client
      as an optional override)
  - set:
    - `yethUsesMockBackend: false`

Ensure mock mode remains unchanged:
- `NEXT_PUBLIC_USE_MOCKS=true` continues to use `createMockYethClient(...)`

## Dependencies
- WP2/WP3 merged (OnchainYethClient exists)

## Acceptance Criteria
- With mocks off and wallet disconnected, `/yeth` still renders global chain data.
- With mocks off, `/yeth` reads from chain (fork) and can transact.
- With mocks on, behavior remains identical to current mock-first UX.
