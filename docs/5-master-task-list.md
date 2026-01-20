# Master Task List — Governance Apps (stYFI, stYFIx, veYFI, LLYFI)

Version 1.4 — 2025-12-20
Scope: BR#1 (UI-first, mock-capable), `/styfi` + `/veyfi`

This is the **authoritative implementation roadmap** for the `governance-apps` repository.
Tasks are grouped in phases.
Each main task is a sensible, self-contained unit of work.
Sub-tasks: 1 level deep, atomic, actionable.

---

# Phase 0 — Bootstrap (Done)

- [x] Next.js App Router + TypeScript
- [x] Tailwind v4 (PostCSS)
- [x] wagmi 2.x + viem
- [x] RainbowKit wiring
- [x] QueryClient provider
- [x] `/`, `/styfi`, `/veyfi` stub pages

---

# Phase 1 — Domain Types & Client Interfaces (Done)

- [x] Minimal Tx Types
- [x] `Styfi` Types
- [x] `Veyfi` Types
- [x] Client Interfaces (`StyfiClient`, `VeyfiClient`)

---

# Phase 2 — Transaction Layer (`useTx`) + Mocks (Done)

- [x] Implement Tx State Machine
- [x] MockStyfiClient (with latency, balance mutation)
- [x] MockVeyfiClient
- [x] **New:** Implement Linear Streaming logic in `MockStyfiClient`
- [x] **New:** Implement Auto-Claim logic in `MockStyfiClient.prepareStartCooldown`
- [x] **New:** Mock Time Travel debugging (`lib/mocks/time.ts`)

---

# Phase 3 — ProtocolProvider & Hooks (Done)

- [x] ProtocolProvider
- [x] Common Token Hooks
- [x] Styfi Hooks
- [x] Veyfi Hooks

---

# Phase 4 — UI Foundations (Reusable Components) (Done)

- [x] UI Primitives (Button, Card, Input, Tabs, Banner, ProgressBar, etc.)
- [x] Formatting Helpers
- [x] Epoch Helpers
- [x] Design System & Layout

---

# Phase 5 — `/styfi` (stYFI + stYFIx) UI (Done)

## 16. Page Layout

- [x] Implement `/styfi/page.tsx`
- [x] Implement Global Stats Bar with dynamic APY & Supply

## 17. Account Summary Panel

- [x] Wallet YFI balance
- [x] stYFI active/cooldown split (Active vs Unstaking vs Withdrawable)
- [x] stYFIx shares + assets
- [x] Smart Onboarding (auto-mode detection)

## 18. Staking Panels

- [x] stYFI stake panel
- [x] stYFIx stake panel

## 19. Unstake Panel (Unified)

- [x] **Refactor:** Merge Cooldown & Withdraw into `UnstakeTab`.
- [x] **Feature:** Linear Progress Bar (Orange/Brand colored).
- [x] **Feature:** Withdraw available liquid funds (Linear streaming).
- [x] **Feature:** Progressive Disclosure for "Start Cooldown" input.
- [x] **Feature:** Dynamic status icons (Badge vs Spinner).

## 20. Rewards Panel

- [x] Claimable display (Accruing hidden for simplicity)
- [x] Unified “Claim Rewards” button
- [x] Earning Power calculation & tooltip

## 20.5. Debug Tools

- [x] Implement on-screen "Time Travel" controls.
- [x] Implement Persistence (SessionStorage).
- [x] Implement Balance Injection tools.

---

# Phase 6 — `/veyfi` (Migration + LLYFI + Redemption) UI (Done)

## 21. Page Layout

- [x] `/veyfi/page.tsx` structure
- [x] Veyfi-specific Stats Bar (Migration %, LLYFI Staked)

## 22. Migration Card

- [x] Show legacy veYFI balance
- [x] “Eligible for migration” indicator
- [x] Migrate CTA (with visual timeline for migrated state)

## 23. LLYFI Staking Table

- [x] List all tokens (sdYFI, upYFI, etc.)
- [x] Balances, allowances, APR breakdowns
- [x] Expandable Rows (Cockpit)

## 24. LLYFI Cooldown & Withdraw

- [x] Reuse `UnstakeTab` logic via `LlyfiUnstakeTab`
- [x] Cooldown progress indicator & Linear Streaming

## 25. LLYFI Rewards Panel

- [x] `VeyfiRewardsCard` (Link to stYFI dashboard)

## 26. Redemption Panel

- [x] Implemented as `InventoryCard` (Global Intel) + `TradeTab` (Action)
- [x] Caps: global + per-token visibility
- [x] Fee % + fee amount calculation
- [x] Approve → Redeem CTA (Sell LLYFI)

---

# Phase 7 — Error & Edge Behaviour (Next)

## 27. Wrong Network UX

- [ ] Global banner (verify implementation in Layout)
- [ ] Disable all write CTAs

## 28. Blacklist Handling

- [ ] Global banner
- [ ] Disable all write CTAs
- [ ] Read-only view remains accessible

## 29. Query Error Handling

- [ ] Error banner with retry
- [ ] No partial states

---

# Phase 8 — On-Chain Integration (Done)

## 30. OnchainStyfiClient

- [x] Implement multicall read logic
- [x] Implement tx prep (contract.write)
- [x] **New:** Derive Epoch info from Genesis timestamp

## 31. OnchainVeyfiClient

- [x] Implement multicall read logic (Registry pattern)
- [x] Implement tx prep
- [x] **New:** Normalize Asset/Share accounting for upYFI

## 32. Approval Helpers

- [x] Wrapper around `approve(spender, amount)`
- [x] Used by both stYFI and LLYFI staking/redeeming
- [x] **New:** Integrated `useTokenAllowance` for atomic UI updates

## 33. Env Toggle

- [x] `NEXT_PUBLIC_USE_MOCKS=false` loads on-chain clients
- [x] `NEXT_PUBLIC_RPC_URLS` pins public read RPCs (use HTTPS when serving over HTTPS)

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
- [ ] Stake stYFIx
- [ ] Start cooldown → withdraw
- [ ] **Test:** Linear streaming withdrawals (partial claim).
- [ ] **Test:** Cooldown reset auto-claim behavior.
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

**End of `master-task-list.md`**
