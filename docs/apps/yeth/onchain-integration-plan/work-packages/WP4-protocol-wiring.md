# WP4 — Protocol Wiring (enable onchain yETH client)

## Objective
Switch yETH from always-mock to onchain client when mocks are disabled.

## Scope
Update `state/protocol.tsx`:

- Import `OnchainYethClient`
- Load yETH global feed data (separate from shared `globalData`)
- In non-mock mode (`preferMocks === false`):
  - instantiate `new OnchainYethClient(publicClientForReads, yethGlobalData ?? null)`
    - wallet connection is not required for global rendering
    - account/write flows still use wagmi-connected chain context
  - set:
    - `yethUsesMockBackend: false`

Ensure mock mode remains unchanged:
- `NEXT_PUBLIC_USE_MOCKS=true` continues to use `createMockYethClient(...)`

## Dependencies
- WP2/WP3 merged (OnchainYethClient exists)

## Acceptance Criteria
- With mocks off and wallet disconnected, `/yeth` renders global data from yETH feed.
- With mocks off, `/yeth` reads from chain (fork) and can transact.
- With mocks on, behavior remains identical to current mock-first UX.
