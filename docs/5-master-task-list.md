# Master Task List — Governance Apps (stYFI, stYFIMax, veYFI, LLYFI)

Version 1.1 — 2025-11-20
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

## 0. Minimal Tx Types (Shared)

- [x] Create `lib/tx/types.ts` with minimal shared types:
  - [x] `TransactionHash`
  - [x] `PreparedTransaction` stub (function returning `TransactionHash`)
- [ ] Extend with full tx state machine in Phase 2 (`TxStatus`, `TxState`, `TxErrorType`)

## 1. Create `Styfi` Types

- [x] `StyfiAccountState`
- [x] `StyfiMaxPosition`
- [x] `EpochInfo`
- [x] `StyfiAllowances`
- [x] Export tidy barrel file

_(Cooldown semantics are shared via `CooldownState` and imported from `/lib/clients/shared/types.ts` — no separate `StyfiCooldownState` type.)_

## 2. Create `Veyfi` Types

- [x] `VeYfiMigrationState`
- [x] `LlyfiTokenId` enum
- [x] `LlyfiTokenState`
- [x] `RedemptionCaps`
- [x] `VeyfiAccountState`

(Shared cooldown type):

- [x] Add `/lib/clients/shared/types.ts`
- [x] Define `CooldownState` and reuse it in both `styfi/types` and `veyfi/types`

## 3. Client Interfaces

- [x] `/lib/clients/styfi/client.ts`
  - [x] `getAccountState`
  - [x] `prepareStake`
  - [x] `prepareStartCooldown`
  - [x] `prepareWithdraw`
  - [x] `prepareClaimRewards`
- [x] `/lib/clients/veyfi/client.ts`
  - [x] `getAccountState`
  - [x] `prepareMigrateVeYfi`
  - [x] `prepareStakeLlyfi`
  - [x] `prepareStartCooldownLlyfi`
  - [x] `prepareWithdrawLlyfi`
  - [x] `prepareClaimLlyfiRewards`
  - [x] `prepareRedeemLlyfi`
- [x] Export barrel files for `styfi` and `veyfi` client modules (optional but recommended)

---

# Phase 2 — Transaction Layer (`useTx`) + Mocks

_(Foundation for all write flows)_

## 4. Implement Tx State Machine

- [x] Extend `/lib/tx/types.ts` with:
  - [x] `TransactionHash` (already created in Phase 1)
  - [x] `PreparedTransaction` (already created in Phase 1)
  - [x] `TxStatus`
  - [x] `TxState`
  - [x] `TxErrorType`
- [x] Implement `/lib/tx/useTx.ts`
  - [x] centralises tx lifecycle
  - [x] owns `waitForTransactionReceipt`
  - [ ] integrates with shared toast system (to be done when UI primitives exist)
  - [ ] adds retry + richer error normalization (optional later enhancement)

## 5. MockStyfiClient

- [x] Build `/lib/clients/styfi/mock.ts`
  - [x] In-memory fake state structure (per-address `Map` + default account state)
  - [ ] `StandardUser` fixture (explicitly named scenario; currently implicit via default state)
  - [ ] `ActiveUser` fixture (e.g. pre-staked / in-cooldown scenario)
  - [x] `getAccountState`
  - [ ] Simulated cooldowns, balances (actual movement into/out of cooldown over time)
  - [x] Simulated rewards (initial accruing vs claimable values)
  - [x] Latency (≈600ms) on reads and tx preparation
  - [x] Basic mutations in `prepare*` (using implicit "lastAddress" context)
  - [ ] Advanced simulated scenarios (e.g. time travel) - Deferred to Phase 3/8; see mocks section in blueprint
- [ ] Unit tests for MockStyfiClient behaviour (at least happy paths + basic edge cases)

## 6. MockVeyfiClient

- [x] `/lib/clients/veyfi/mock.ts`
  - [x] `StandardUser`-equivalent fixture (default account with balances, veYFI, LLYFI, caps)
  - [ ] `ActiveUser` fixture (e.g. migrated veYFI, staked LLYFI, in-cooldown)
  - [x] Legacy veYFI fixture (migration-eligible veYFI state)
  - [x] LLYFI tokens fixture: balances + allowances (structural cooldown fields present but unused)
  - [x] Rewards (accruing vs claimable initial values)
  - [x] Caps fixture (global + per-token limits/used)
  - [x] Latency simulation for reads and tx preparation
  - [x] Global singleton Map
  - [x] `getAccountState`
  - [x] Basic mutations for Migration/Staking
  - [ ] Full redemption cap logic simulation - Deferred
- [ ] Unit tests for MockVeyfiClient behaviour

## 7. Mock Scenario System (Optional)

- [ ] (Optional) Add simple scenario selection (`NEXT_PUBLIC_SCENARIO`) once core flows are stable.

---

# Phase 3 — ProtocolProvider & Hooks

_(All FE logic must go through domain hooks)_

## 8. ProtocolProvider

- [x] Implement provider creating:
  - [x] `styfiClient = mock|onchain`
  - [x] `veyfiClient = mock|onchain`
- [x] Wrap in `RootLayout`

## 9. Common Token Hooks

- [x] `useTokenAllowance` (React Query + viem)
- [x] `useTokenApprove` (wraps ERC-20 approve via `useTx`)
- [x] Ensure no raw approve calls from components

## 10. Styfi Hooks

- [x] `useStyfiAccount`
- [x] `useStyfiStake`
- [x] `useStyfiStartCooldown`
- [x] `useStyfiWithdraw`
- [x] `useStyfiClaimRewards`
- [x] Query keys: `["styfi", "account", address]`, `["styfi", "epoch"]`

## 11. Veyfi Hooks

- [x] `useVeyfiAccount`
- [x] `useVeyfiMigration`
- [x] `useLlyfiTokens`
- [x] `useRedemptionCaps`
- [x] `useVeyfiClaimRewards`
- [x] `useLlyfiStake`
- [x] `useLlyfiStartCooldown`
- [x] `useLlyfiWithdraw`
- [x] `useLlyfiRedeem`

---

# Phase 4 — UI Foundations (Reusable Components)

## 12. UI Primitives

- [x] `Button`
- [x] `Card`
- [x] `Input`
- [x] `Tabs`
- [x] `Table`
- [x] `Modal`
- [x] `Banner` (for errors, networks, blacklist)
- [x] `ProgressBar`
- [x] `Skeleton`
- [x] `Toast` system

## 13. Formatting Helpers (`/lib/format.ts`)

- [x] `formatTokenAmount(bigint)`
- [x] `formatUsd(bigint)`
- [x] `formatPercent(number)`
- [x] No usage of `.toFixed()` in UI

## 14. Epoch Helpers

- [x] `readEpochFromContract` or part of account calls
- [x] `useEpochCountdown` with contract-sourced timestamps

## 15. Design System & Layout

- [x] `globals.css` with Yearn variables (Sunset/Disco/Neutral)
- [x] `cn` utility
- [x] `Header` with AppLauncher and WalletButton
- [x] `/debug/ui` Kitchen Sink page
- [x] `docs/6-design-system.md`

---

# Phase 5 — `/styfi` (stYFI + stYFIMax) UI

## 16. Page Layout

- [ ] Implement `/styfi/page.tsx`
  - [ ] Wrapper layout
  - [ ] Error boundary
  - [ ] Responsive column layout

## 17. Account Summary Panel

- [ ] Wallet YFI balance
- [ ] stYFI active/cooldown
- [ ] stYFIMax shares + assets
- [ ] Epoch information
- [ ] Blacklist banner (if needed)

## 18. Staking Panels

- [ ] stYFI stake panel
  - [ ] Input + balance + max
  - [ ] Approve → Stake flows
  - [ ] Disable states
- [ ] stYFIMax stake panel
  - [ ] Same, but with shares-vs-assets explanation

## 19. Cooldown & Withdraw Panels

- [ ] stYFI cooldown + withdraw
- [ ] stYFIMax cooldown + withdraw
- [ ] Countdown to readiness

## 20. Rewards Panel

- [ ] Accruing vs Claimable display
- [ ] Unified “Claim Rewards” button
- [ ] Success feedback

---

# Phase 6 — `/veyfi` (Migration + LLYFI + Redemption) UI

## 21. Page Layout

- [ ] `/veyfi/page.tsx` with sections:
  - [ ] Migration
  - [ ] LLYFI staking
  - [ ] Redemption

## 22. Migration Card

- [ ] Show legacy veYFI balance
- [ ] “Eligible for migration” indicator
- [ ] Migrate CTA (if allowed)
- [ ] Success feedback + reload

## 23. LLYFI Staking Table

- [ ] List all tokens (sdYFI, upYFI, etc.)
- [ ] Balances, allowances
- [ ] Approve → Stake CTAs
- [ ] Collapsible rows for details (optional)

## 24. LLYFI Cooldown & Withdraw

- [ ] Cooldown start CTA
- [ ] Cooldown progress indicator
- [ ] Withdraw CTA
- [ ] Disable if blacklisted or incomplete

## 25. LLYFI Rewards Panel

- [ ] Accruing vs claimable
- [ ] Claim-all CTA

## 26. Redemption Panel

- [ ] Token selector or table
- [ ] Caps: global + per-token
- [ ] Fee % + fee amount
- [ ] Net YFI to be received
- [ ] Approve → Redeem CTA
- [ ] Disabled when cap insufficient or blacklisted

---

# Phase 7 — Error & Edge Behaviour

## 27. Wrong Network UX

- [ ] Global banner
- [ ] Disable all write CTAs

## 28. Blacklist Handling

- [ ] Global banner
- [ ] Disable all write CTAs
- [ ] Read-only view remains accessible

## 29. Query Error Handling

- [ ] Error banner with retry
- [ ] No partial states

---

# Phase 8 — On-Chain Integration

_(Blocked until contract ABIs finalized)_

## 30. OnchainStyfiClient

- [ ] Implement multicall read logic
- [ ] Implement tx prep (contract.write)

## 31. OnchainVeyfiClient

- [ ] Implement multicall read logic
- [ ] Implement tx prep

## 32. Approval Helpers

- [ ] Wrapper around `approve(spender, amount)`
- [ ] Used by both stYFI and LLYFI staking/redeeming

## 33. Env Toggle

- [ ] `NEXT_PUBLIC_USE_MOCKS=false` loads on-chain clients

---

# Phase 9 — QA, Cleanup, Launch Prep

## 34. UI Consistency Audit

- [ ] Buttons
- [ ] Banners
- [ ] Modals
- [ ] Error states
- [ ] Copy review

## 35. End-to-End Smoke Tests (Mock Mode)

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

## 36. Lighthouse / Performance Checks

## 37. Final Documentation Pass

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
