# Master Task List — Governance Apps (stYFI, stYFIMax, veYFI, LLYFI)

Version 1.0 — 2025-11-20
Scope: BR#1 (UI-first, mock-backed), `/styfi` + `/veyfi`

This is the **authoritative implementation roadmap** for the `governance-apps` repository.
Tasks are grouped in phases.
Each main task is a sensible, self-contained unit of work.
Sub-tasks: 1 level deep, atomic, actionable.

This list reflects:

- `frontend-frd.md`
- `user-stories-styfi.md`
- `user-stories-veyfi.md`
- `architecture-blueprint.md`

---

# Phase 0 — Bootstrap (Already Done)

- [x] Next.js App Router + TypeScript
- [x] Tailwind v4 (PostCSS)
- [x] wagmi 2.x + viem
- [x] RainbowKit wiring
- [x] QueryClient provider
- [x] `/`, `/styfi`, `/veyfi` stub pages

---

# Phase 1 — Domain Types & Client Interfaces

_(All type definitions must strictly follow frontend FRD)_

## 1. Create `Styfi` Types

- [ ] `StyfiAccountState`
- [ ] `StyfiMaxPosition`
- [ ] `StyfiCooldownState`
- [ ] `EpochInfo`
- [ ] `StyfiAllowances`
- [ ] Export tidy barrel file

## 2. Create `Veyfi` Types

- [ ] `VeYfiMigrationState`
- [ ] `LlyfiTokenId` enum
- [ ] `LlyfiTokenState`
- [ ] `RedemptionCaps`
- [ ] `VeyfiAccountState`

## 3. Client Interfaces

- [ ] `/lib/clients/styfi/client.ts`
  - `getAccountState`
  - `prepareStake`, `prepareStartCooldown`, `prepareWithdraw`, `prepareClaimRewards`
- [ ] `/lib/clients/veyfi/client.ts`
  - `getAccountState`
  - `prepareMigrateVeYfi`, `prepareStakeLlyfi`, `prepareStartCooldownLlyfi`,
    `prepareWithdrawLlyfi`, `prepareClaimLlyfiRewards`,
    `prepareRedeemLlyfi`
- [ ] Export barrel files

---

# Phase 2 — Transaction Layer (`useTx`) + Mocks

_(Foundation for all write flows)_

## 4. Implement Tx State Machine

- [ ] Add `/lib/tx/types.ts` with:
  - `TxStatus`
  - `TxState`
  - `TxErrorType`
- [ ] Implement `/lib/tx/useTx.ts`
  - centralises tx lifecycle
  - emits toasts
  - supports callbacks for invalidation
  - consistent error mapping

## 5. MockStyfiClient

- [ ] Build `/lib/clients/styfi/mock.ts`
  - [ ] In-memory fake state structure
  - [ ] Deterministic initial fixture
  - [ ] `getAccountState`
  - [ ] Simulated cooldowns, balances
  - [ ] Simulated rewards (accruing + claimable)
  - [ ] Supports both stYFI and stYFIMax
  - [ ] Latency (500–1000ms)
  - [ ] Mutation in `prepare*` methods

## 6. MockVeyfiClient

- [ ] `/lib/clients/veyfi/mock.ts`
  - [ ] Legacy veYFI fixture
  - [ ] LLYFI tokens fixture: balances, allowances, cooldowns
  - [ ] Rewards
  - [ ] Caps fixture
  - [ ] Latency simulation
  - [ ] Mutations for stake, cooldown, withdraw, redeem

## 7. Mock Scenario System (Optional)

- [ ] Basic infra for scenario selection (`NEXT_PUBLIC_SCENARIO`)
- [ ] 3–4 sample scenarios (fresh user, staked, cooldown, migration-ready)

---

# Phase 3 — ProtocolProvider & Hooks

_(All FE logic must go through domain hooks)_

## 8. ProtocolProvider

- [ ] Implement provider creating:
  - [ ] `styfiClient = mock|onchain`
  - [ ] `veyfiClient = mock|onchain`
- [ ] Wrap in `RootLayout`

## 9. Styfi Hooks

- [ ] `useStyfiAccount`
- [ ] `useStyfiStake`
- [ ] `useStyfiStartCooldown`
- [ ] `useStyfiWithdraw`
- [ ] `useStyfiClaimRewards`
- [ ] Query keys: `["styfi", "account", address]`, `["styfi", "epoch"]`

## 10. Veyfi Hooks

- [ ] `useVeyfiAccount`
- [ ] `useVeyfiMigration`
- [ ] `useLlyfiTokens`
- [ ] `useRedemptionCaps`
- [ ] `useVeyfiClaimRewards`
- [ ] `useLlyfiStake`
- [ ] `useLlyfiStartCooldown`
- [ ] `useLlyfiWithdraw`
- [ ] `useLlyfiRedeem`

---

# Phase 4 — UI Foundations (Reusable Components)

## 11. UI Primitives

- [ ] `Button`
- [ ] `Card`
- [ ] `Input`
- [ ] `Tabs`
- [ ] `Table`
- [ ] `Modal`
- [ ] `Banner` (for errors, networks, blacklist)
- [ ] `ProgressBar`
- [ ] `Skeleton`
- [ ] `Toast` system

## 12. Formatting Helpers (`/lib/format.ts`)

- [ ] `formatTokenAmount(bigint)`
- [ ] `formatUsd(bigint)`
- [ ] `formatPercent(number)`
- [ ] No usage of `.toFixed()` in UI

## 13. Epoch Helpers

- [ ] `readEpochFromContract` or part of account calls
- [ ] `useEpochCountdown` with contract-sourced timestamps

---

# Phase 5 — `/styfi` (stYFI + stYFIMax) UI

## 14. Page Layout

- [ ] Implement `/styfi/page.tsx`
  - [ ] Wrapper layout
  - [ ] Error boundary
  - [ ] Responsive column layout

## 15. Account Summary Panel

- [ ] Wallet YFI balance
- [ ] stYFI active/cooldown
- [ ] stYFIMax shares + assets
- [ ] Epoch information
- [ ] Blacklist banner (if needed)

## 16. Staking Panels

- [ ] stYFI stake panel
  - [ ] Input + balance + max
  - [ ] Approve → Stake flows
  - [ ] Disable states
- [ ] stYFIMax stake panel
  - [ ] Same, but with shares-vs-assets explanation

## 17. Cooldown & Withdraw Panels

- [ ] stYFI cooldown + withdraw
- [ ] stYFIMax cooldown + withdraw
- [ ] Countdown to readiness

## 18. Rewards Panel

- [ ] Accruing vs Claimable display
- [ ] Unified “Claim Rewards” button
- [ ] Success feedback

---

# Phase 6 — `/veyfi` (Migration + LLYFI + Redemption) UI

## 19. Page Layout

- [ ] `/veyfi/page.tsx` with sections:
  - Migration
  - LLYFI staking
  - Redemption

## 20. Migration Card

- [ ] Show legacy veYFI balance
- [ ] “Eligible for migration” indicator
- [ ] Migrate CTA (if allowed)
- [ ] Success feedback + reload

## 21. LLYFI Staking Table

- [ ] List all tokens (sdYFI, upYFI, etc.)
- [ ] Balances, allowances
- [ ] Approve → Stake CTAs
- [ ] Collapsible rows for details (optional)

## 22. LLYFI Cooldown & Withdraw

- [ ] Cooldown start CTA
- [ ] Cooldown progress indicator
- [ ] Withdraw CTA
- [ ] Disable if blacklisted or incomplete

## 23. LLYFI Rewards Panel

- [ ] Accruing vs claimable
- [ ] Claim-all CTA

## 24. Redemption Panel

- [ ] Token selector or table
- [ ] Caps: global + per-token
- [ ] Fee % + fee amount
- [ ] Net YFI to be received
- [ ] Approve → Redeem CTA
- [ ] Disabled when cap insufficient or blacklisted

---

# Phase 7 — Error & Edge Behaviour

## 25. Wrong Network UX

- [ ] Global banner
- [ ] Disable all write CTAs

## 26. Blacklist Handling

- [ ] Global banner
- [ ] Disable all write CTAs
- [ ] Read-only view remains accessible

## 27. Query Error Handling

- [ ] Error banner with retry
- [ ] No partial states

---

# Phase 8 — On-Chain Integration

_(Blocked until contract ABIs finalized)_

## 28. OnchainStyfiClient

- [ ] Implement multicall read logic
- [ ] Implement tx prep (contract.write)

## 29. OnchainVeyfiClient

- [ ] Implement multicall read logic
- [ ] Implement tx prep

## 30. Approval Helpers

- [ ] Wrapper around `approve(spender, amount)`
- [ ] Used by both stYFI and LLYFI staking/redeeming

## 31. Env Toggle

- [ ] `NEXT_PUBLIC_USE_MOCKS=false` loads on-chain clients

---

# Phase 9 — QA, Cleanup, Launch Prep

## 32. UI Consistency Audit

- [ ] Buttons
- [ ] Banners
- [ ] Modals
- [ ] Error states
- [ ] Copy review

## 33. End-to-End Smoke Tests (Mock Mode)

- [ ] Stake stYFI
- [ ] Stake stYFIMax
- [ ] Start cooldown → withdraw
- [ ] Claim rewards
- [ ] Migrate veYFI
- [ ] Stake LLYFI
- [ ] Cooldown → withdraw LLYFI
- [ ] Redeem LLYFI
- [ ] Caps exhausted scenario
- [ ] Blacklist scenario
- [ ] Wrong network

## 34. Lighthouse / Performance Checks

## 35. Final Documentation Pass

- [ ] Update `frontend-frd.md`
- [ ] Update both user story docs
- [ ] Update architecture blueprint
- [ ] Patch notes & release notes

---

# Phase 10 — Optional (Future)

These are not BR#1 tasks but worth tracking:

- [ ] Storybook setup
- [ ] Analytics (page interaction tracking)
- [ ] Governance (proposals, voting)
- [ ] P&L dashboards
- [ ] YBC interfaces
- [ ] Delegation UI
- [ ] Notifications

---

# Summary

This task list is the authoritative, phased roadmap from **empty UI** → **mock-backed UI** → **on-chain integrated application**, fully aligned with the user stories, FE FRD, and architecture blueprint.

Every commit touching behaviour MUST update:

- this file
- `frontend-frd.md`
- relevant user stories

---

**End of `master-task-list.md`**
