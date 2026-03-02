# yETH Implementation Status

Last updated: February 26, 2026  
Route: `/yeth`  
Delivery mode: onchain-enabled (mock toggle supported)

This document tracks what is implemented versus what remains before production contract integration.

## 1. Current Architecture (Implemented)

### 1.1 Route and Shell

- `/app/yeth/page.tsx` provides page metadata and entrypoint.
- `/app/yeth/YethPageClient.tsx` provides state-driven client rendering.
- Route is available under shared host path:
  - `app.dao-ops.com/yeth`

### 1.2 Domain Client Layer

- `/lib/clients/yeth/types.ts`
- `/lib/clients/yeth/client.ts`
- `/lib/clients/yeth/mock.ts`
- `/lib/clients/yeth/onchain.ts`
- `/lib/clients/yeth/global.ts`
- `/lib/clients/yeth/deployment.json`
- `/lib/clients/yeth/index.ts`

Implemented capabilities:

- disconnected global state read from dedicated yETH feed (`NEXT_PUBLIC_YETH_GLOBAL_DATA_URL`),
- account state read from chain (`claimable`, `recovery_rate`, `balanceOf`),
- chain overlay for global deadline and vault metrics (`deadline`, `convertToAssets(1e18)`, `totalAssets`, `totalSupply`),
- prepared write actions:
  - claim and exit,
  - claim and stay,
  - redeem shares to ETH.

### 1.3 Hooks Layer

- `/lib/hooks/useYeth.ts`

Implemented hooks:

- `useYethGlobalState`
- `useYethAccountState`
- `useYethClaimAndExit`
- `useYethClaimAndStay`
- `useYethRedeemToEth`

### 1.4 Protocol Wiring

- `/state/protocol.tsx` includes yETH client in protocol context.
- when `NEXT_PUBLIC_USE_MOCKS=true` (or E2E mode), yETH uses `MockYethClient`.
- when mocks are disabled, yETH uses `OnchainYethClient` and yETH global feed data.

### 1.5 UI Flow Coverage (Tokyo Refresh)

Implemented user states:

- wallet disconnected
- loading state
- claimable account (`claimableNowEth > 0`)
- recovery-position account (`recoveryVaultShares > 0`)
- empty wallet-specific state (no recovery card rendered)
- claim window ended

Implemented Tokyo refresh components and behavior:

- `/app/yeth/components/RecoveryHero.tsx`
  - de-boxed hero with `ETH Claimable Now` metric in Tokyo color,
  - recovered percentage badge.
- `/app/yeth/components/ActionDeck.tsx`
  - dominant `Claim ETH & Exit` primary action,
  - dynamic claim amount in CTA (`Claim X.XXXX ETH & Exit`),
  - card/header/CTA vertical alignment for balanced two-option layout,
  - advanced `Deposit claim into Recovery Vault` secondary action.
- `/app/yeth/components/StatsGrid.tsx`
  - context stats for wallet, snapshot value, claim window.
- `/app/yeth/components/TrustFooter.tsx`
  - collapsible trust and verify footer at page bottom,
  - stronger trigger affordance (`View Contracts, Risks & Sources`) with chevron state,
  - contracts section uses shared `ContractLink` formatting (truncated code-style addresses + Etherscan links).
- `/app/yeth/YethPageClient.tsx`
  - wallet-specific UI now branches only on observable balances:
    - `claimableNowEth > 0`, or
    - `recoveryVaultShares > 0`
  - E2E runtime uses deterministic fallback identity (`E2E_MOCK_ADDRESS`) when the wallet connector is not yet hydrated, so smoke tests can exercise write paths without wallet modal interactions,
  - claim deadline gating uses local current time instead of feed `asOf` to prevent stale-feed action enablement,
  - claim-window-closed branch replaces hero and hides action deck,
  - risk modal remains required before claim-and-stay write and closes/guards when deadline is closed,
  - staying state shows liquidation value, shares, and current PPS.

### 1.6 Debug and QA Controls

- `/app/yeth/components/MockControls.tsx`
- shared panel support in `/components/DebugControls.tsx`

Implemented debugging tools:

- one-click preset cycle across key states,
- direct preset buttons:
  - claimable
  - recovery position
  - empty
- claim window toggles:
  - open
  - ended
  - real time
- toggles update the shared mock clock used by yETH page state and mock client reads.
- reset plus time-travel integration with shared debug menu.

## 2. Routing and Exposure Status

- Middleware host mapping supports `yeth.yearn.fi` to `/yeth` internally.
- Cloudflare route config currently maps only `app.dao-ops.com`.
- Effective public exposure today:
  - accessible at `app.dao-ops.com/yeth`,
  - no active production subdomain route for `yeth.yearn.fi`.

## 3. Spec Alignment Snapshot

Aligned in UI:

- action-first hierarchy with de-boxed layout,
- Tokyo color tokenized design (`tokyo-600`, `tokyo-700`),
- voluntary claim path choice,
- atomic exit path and atomic stay path (onchain writes in non-mock mode),
- explicit risk acknowledgement for stay flow,
- simplified observable wallet-state branching,
- settlement-framed staying state with dynamic cash-out labeling,
- trust and verify footer,
- claim-ended manual process messaging.

Still placeholder/static for MVP:

- trust-copy URLs and disclosure text are static constants,
- global disconnected data depends on external feed operator availability,
- fork execution evidence and e2e failure-path coverage remain to be expanded.

## 4. Test Coverage Snapshot

- added yETH onchain client coverage (`tests/unit/lib/clients/yeth.onchain.test.ts`)
  - feed fallback behavior
  - chain overlay for deadline + PPS + vault totals
  - claim/redeem write preparation flow
- added yETH page-state coverage (`tests/components/YethPageClient.state.test.tsx`)
  - claimable vs recovery-position vs empty UI gating
  - stale-feed deadline gating protection
  - risk-modal close/guard behavior across deadline rollover
- added yETH hook integration coverage (`tests/integration/hooks/useYethAccountPollingGate.test.tsx`, `tests/integration/hooks/useYethWrites.test.tsx`)
  - polling gate behavior on `/yeth` route visibility
  - claim/redeem write-path query invalidation and state transitions
- added yETH smoke e2e coverage (`tests/e2e/smoke/yeth-flow.spec.ts`)
  - claim and exit
  - claim and stay
  - redeem
  - claim-window-ended manual flow
  - empty wallet-state flow

## 5. Open Implementation Gaps

- Complete fork-runbook execution evidence for claim/redeem paths.
- Add yETH failure-path e2e cases (tx rejection, revert handling, liquidity failure).
- Production content finalization:
  - approved YIP URL,
  - manual late-claim instructions URL,
  - legal/comms copy review.

## 6. Acceptance Gate Before Production Ready

yETH should be treated as production-ready only when:

- on-chain client is integrated and tested,
- security and invariants are externally validated,
- end-to-end tests cover all claim path outcomes,
- deployment and rollout checklist in
  [`production-readiness-checklist.md`](production-readiness-checklist.md)
  is fully complete.
