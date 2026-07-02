# Master Task List — Governance Apps

Version 2.2 — June 30, 2026
Scope: `/styfi`, `/veyfi`, `/yeth`, `/teams`, `/ybc`

This is the active delivery roadmap for the repository.  
Use this with:

- [`../apps/yeth/implementation-status.md`](../apps/yeth/implementation-status.md)
- [`../apps/yeth/production-readiness-checklist.md`](../apps/yeth/production-readiness-checklist.md)
- [`teams-ybc-production-plan.md`](teams-ybc-production-plan.md)
- [`architecture-blueprint.md`](architecture-blueprint.md)
- [`testing.md`](testing.md)

## 1. Foundation and Shared Platform

- [x] Next.js App Router + TypeScript + Tailwind
- [x] Wagmi + RainbowKit integration
- [x] Shared transaction lifecycle (`useTx`)
- [x] Shared design-system primitives
- [x] Shared debug controls and mock time travel
- [x] Shared header and host-based route mapping (`middleware.ts`)
- [ ] Migrate from deprecated Next.js `middleware` convention to `proxy` convention

## 2. stYFI and veYFI Workstream

### 2.1 Completed

- [x] stYFI/stYFIx staking, cooldown, withdrawal, rewards UX
- [x] veYFI migration + LLYFI stake/unstake/trade UX
- [x] On-chain clients for stYFI and veYFI
- [x] R2-backed global data integration

### 2.2 Remaining

- [ ] Wrong-network global UX hardening and write CTA lock audit
- [ ] Blacklist behavior consistency audit across all write paths
- [ ] Full E2E smoke coverage refresh (all critical user paths)
- [ ] Performance/Lighthouse pass and regression budget tracking

## 3. yETH Workstream

### 3.1 Completed (Current State)

- [x] Dedicated `/yeth` route and page client
- [x] yETH domain model (`YethClient`, yETH hooks, query keys)
- [x] Mock yETH claim and redeem flow:
  - [x] claim and exit
  - [x] claim and stay
  - [x] redeem to ETH
- [x] Recovery UI states:
  - [x] disconnected
  - [x] claimable/unclaimed
  - [x] recovery-position
  - [x] empty wallet state
  - [x] claim-ended
- [x] yETH debug presets and claim-window simulation controls
- [x] Documentation baseline under `docs/apps/yeth/`

### 3.2 Remaining for Production

- [x] Implement `OnchainYethClient`
- [ ] Integrate final contract ABIs and addresses
- [ ] Replace mock URLs and placeholders with governance-approved URLs
- [x] Add yETH unit/integration/e2e test coverage
- [ ] Run security and invariant validation with contract team
- [ ] Finalize launch policy for:
  - [ ] path-only availability (`app.dao-ops.com/yeth`)
  - [ ] subdomain rollout (`yeth.yearn.fi`)

## 4. Release and Operations

- [ ] Define release checklist template for all app domains
- [ ] Add post-deploy smoke checks per route (`/styfi`, `/veyfi`, `/yeth`)
- [ ] Ensure docs update is required in PR template for behavior changes
- [ ] Maintain changelog entries for app-level releases

## 5. Teams + YBC Production Workstream

### 5.1 Completed

- [x] `/teams` and `/ybc` route keys, labels, beta hosts, and production hosts documented
- [x] mock-backed Teams and YBC surfaces documented
- [x] debug-runtime alignment documented for Teams and YBC
- [x] finalized `styfi` deployment manifest identified as source of truth
- [x] consumer-owned `teams.json` and `ybc.json` feed contracts documented
- [x] live `teams.json` payload validated from `governance-apps`
- [x] live `ybc.json` payload validated from `governance-apps`
- [x] production Teams reads wired to the feed-backed client
- [x] production YBC reads wired to the feed-backed client
- [x] Teams `availableActions` producer feedback documented as compatibility-only;
  production write eligibility is client-derived
- [x] Teams/YBC launch switch model documented: global mocks only, app route flags expose
  accepted read/write surfaces, no separate write flags for launch

### 5.2 Remaining

- [ ] Merge `agent/data` into `agent/integration`
- [ ] Wire Teams launch writes through shared `useTx`
- [ ] Wire YBC launch writes through shared `useTx`
- [ ] Run targeted fork smoke with live/saved feed JSON and fixture coverage for absent
  states
- [ ] Run preprod/beta route, host, wallet, and feed smoke
- [ ] Enable production flags and host exposure after release approval

## 6. Immediate Next Milestone (Teams/YBC Launch Writes and Smoke)

- [ ] Merge `agent/data` into the integration lane
- [ ] Implement Teams WP10 launch writes
- [ ] Implement YBC WP9 launch writes
- [ ] Execute Teams WP11 targeted fork/preprod package
- [ ] Execute YBC WP10 targeted fork/preprod package
- [ ] Record production flag, host exposure, rollback, and monitoring notes

Historical data-producer milestones:

- [x] Start shared WP2 in `gov-apps-stats`
- [x] Import Teams/YBC deployment block heights from `styfi/deployment.json`
- [x] Publish live `teams.json`
- [x] Publish live `ybc.json`
- [x] Hand `teams.json` URL back to `governance-apps` for shared WP3 validation

## 7. Previous Immediate Milestone (yETH Controlled Testing)

- [ ] Merge yETH mock implementation into `master`
- [ ] Deploy to production worker
- [ ] Verify path-based access at `app.dao-ops.com/yeth`
- [ ] Validate no unintended nav/discoverability regressions
- [ ] Collect internal tester feedback and convert into prioritized issues
