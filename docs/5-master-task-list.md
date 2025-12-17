# Master Task List — Governance Apps (stYFI, stYFIx, veYFI, LLYFI)

Version 1.3 — 2025-12-17
Scope: BR#1 (UI-first, mock-backed), `/styfi` + `/veyfi`

This is the **authoritative implementation roadmap** for the `governance-apps` repository.
Tasks are grouped in phases.
Each main task is a sensible, self-contained unit of work.
Sub-tasks: 1 level deep, atomic, actionable.

---

# Phase 0 — Bootstrap (Already Done)

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
- [x] stYFI active/cooldown split (Active vs Exiting vs Exited)
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

# Phase 6 — `/veyfi` (Migration + LLYFI + Redemption) UI (Next)

## 21. Page Layout

- [ ] `/veyfi/page.tsx` structure
- [ ] Veyfi-specific Stats Bar (Redemption Caps, LLYFI TVL)

## 22. Migration Card

- [ ] Show legacy veYFI balance
- [ ] “Eligible for migration” indicator
- [ ] Migrate CTA (if allowed)

## 23. LLYFI Staking Table

- [ ] List all tokens (sdYFI, upYFI, etc.)
- [ ] Balances, allowances
- [ ] Approve → Stake CTAs

## 24. LLYFI Cooldown & Withdraw

- [ ] Reuse `UnstakeTab` logic/components where possible (Unified model)
- [ ] Cooldown progress indicator

## 25. LLYFI Rewards Panel

- [ ] Claim-all CTA

## 26. Redemption Panel

- [ ] Token selector or table
- [ ] Caps: global + per-token
- [ ] Fee % + fee amount
- [ ] Approve → Redeem CTA

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
