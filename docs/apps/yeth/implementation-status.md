# yETH Implementation Status

Last updated: February 19, 2026  
Route: `/yeth`  
Delivery mode: mock-first

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
- `/lib/clients/yeth/index.ts`

Implemented capabilities:

- global state read (claim window, vault stats, addresses, risk/source metadata),
- account state read (eligibility, claimability, claim status, shares),
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
- yETH currently uses dedicated mock backend regardless of stYFI/veYFI on-chain mode.

### 1.5 UI Flow Coverage (Tokyo Refresh)

Implemented user states:

- wallet disconnected
- loading state
- ineligible account
- eligible and unclaimed
- claimed and exited
- claimed and staying
- claim window ended

Implemented Tokyo refresh components and behavior:

- `/app/yeth/components/RecoveryHero.tsx`
  - de-boxed hero with `ETH Claimable Now` metric in Tokyo color,
  - recovered percentage badge.
- `/app/yeth/components/ActionDeck.tsx`
  - dominant `Claim ETH & Exit` primary action,
  - advanced `Recover into Vault A` secondary action.
- `/app/yeth/components/StatsGrid.tsx`
  - context stats for wallet, snapshot value, claim window, eligibility.
- `/app/yeth/components/TrustFooter.tsx`
  - collapsible trust and verify footer at page bottom,
  - stronger trigger affordance (`View Contracts, Risks & Sources`) with chevron state.
- `/app/yeth/YethPageClient.tsx`
  - unclaimed flow assembled from hero + action deck + context grid,
  - claim-window-closed branch replaces hero and hides action deck,
  - risk modal remains required before claim-and-stay write,
  - staying state uses a settlement-style checkout ticket with liquidation value and a dynamic cash-out CTA.

### 1.6 Debug and QA Controls

- `/app/yeth/components/MockControls.tsx`
- shared panel support in `/components/DebugControls.tsx`

Implemented debugging tools:

- one-click preset cycle across key states,
- direct preset buttons:
  - eligible/unclaimed
  - claimed/exited
  - claimed/staying
  - ineligible
- claim window toggles:
  - open
  - ended
  - real time
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
- atomic exit path and atomic stay path (mocked transactions),
- explicit risk acknowledgement for stay flow,
- post-claim state distinction,
- settlement-framed staying state with dynamic cash-out labeling,
- trust and verify footer,
- claim-ended manual process messaging.

Still placeholder/mock:

- on-chain addresses and explorer linkage are mock constants,
- claim eligibility and amounts are mocked,
- fee inflow and donation data are mocked,
- transaction hashes are mock-generated.

## 4. Open Implementation Gaps

- Real `OnchainYethClient` implementation.
- Contract ABI integration once finalized.
- Source-of-truth eligibility and claim amount reads from claim contract.
- Real Vault A/B metrics from chain/indexer.
- Real transaction execution and receipt handling against deployed contracts.
- Production content finalization:
  - approved YIP URL,
  - manual late-claim instructions URL,
  - legal/comms copy review.

## 5. Acceptance Gate Before Production Ready

yETH should be treated as production-ready only when:

- on-chain client is integrated and tested,
- security and invariants are externally validated,
- end-to-end tests cover all claim path outcomes,
- deployment and rollout checklist in
  [`production-readiness-checklist.md`](production-readiness-checklist.md)
  is fully complete.
