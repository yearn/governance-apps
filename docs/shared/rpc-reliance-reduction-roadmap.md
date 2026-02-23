# RPC Reliance Reduction Roadmap

Status: Phase 1 in progress (`RPC-001` to `RPC-004` completed; `RPC-005` to `RPC-008` pending)  
Last Updated: February 23, 2026

## 1. Executive Direction

This plan is explicitly optimized for **80% of benefit with ~20% of change**.

Two decisions are now locked:

1. We **cannot** and should **not** try to eliminate RPC usage completely.
2. `NEXT_PUBLIC_RPC_URLS` is **mandatory in production**.

This roadmap prioritizes reducing unnecessary browser RPC load and burst behavior first, before adding major backend infrastructure.

## 2. Scope and Non-Goals

### In Scope (this roadmap)

- Reduce duplicate and unnecessary read traffic.
- Make polling/focus behavior predictable and conservative.
- Keep wallet-authoritative reads for account-critical correctness.
- Add minimum telemetry needed to prove improvement.
- Defer high-complexity backend refactors unless objective gates require them.

### Non-Goals (for now)

- No full replacement of wallet-backed reads for signing-critical actions.
- No broad backend aggregation platform in the first milestone.
- No proxy allowlist enforcement rollout in first milestone.
- No precompute/indexing platform build in first milestone.

## 3. Current Baseline (What Matters Most)

1. Account state is polled every 30s in multiple places with focus refetch enabled.
2. Identity and domain account hooks overlap and can duplicate expensive reads.
3. `/styfi` currently reads veYFI account state for external-position UX, which is high fanout.
4. Nudge queries can perform additional account-like reads every 30s.
5. Connected sessions prefer on-chain stats polling even when S3/global data exists.

## 4. Guiding Principles

1. Preserve wallet truth where authority is required.
2. Remove duplication before adding infrastructure.
3. Prefer route-scoped and interaction-scoped reads.
4. Poll less, invalidate precisely after writes.
5. Add only enough telemetry to enforce decisions.
6. Defer complex systems until metrics prove they are necessary.

## 5. Mandatory Production RPC Policy

### 5.1 Policy

`NEXT_PUBLIC_RPC_URLS` must be present and non-empty in production validation.

### 5.2 Rationale

- Wallet-backed reads remain primary for connected account truth.
- App infrastructure still needs deterministic public transport configuration for non-wallet flows and controlled fallback behavior.
- Explicit configuration reduces silent fallback ambiguity and incident triage time.

### 5.3 Required follow-up doc alignment

This roadmap supersedes prior wording that `NEXT_PUBLIC_RPC_URLS` is optional in production-facing guidance. Any conflicting docs must be updated in the same milestone as `RPC-001`.

## 6. 80/20 Delivery Plan

### Phase 1 (Execute Now): Low-Risk, High-Impact (1-2 sprints)

This is the only phase that should be started immediately.

### P1 Goals

- 40-60% reduction in browser-side RPC requests per active connected session.
- Eliminate major tab-focus burst behavior.
- No regression in tx success path or wrong-network behavior.

### P1 Work Items

- [x] `RPC-001` Enforce production `NEXT_PUBLIC_RPC_URLS` in env validation and startup checks.
- [x] `RPC-002` De-duplicate identity vs stYFI account reads (single source + selectors).
- [x] `RPC-003` Disable default focus refetch for non-critical keys and add explicit opt-in map.
- [x] `RPC-004` Restrict account/nudge polling to relevant routes and connected states only.
- [ ] `RPC-005` Cache blacklist probe capability result per session/chain/contract.
- [ ] `RPC-006` Make expensive simulation-like reads on-demand (or lower cadence) unless visible.
- [ ] `RPC-007` Use S3-first stats by default; use short-lived post-write chain refresh override instead of always-on connected polling.
- [ ] `RPC-008` Add minimal telemetry counters required for go/no-go decisions (request volume, error rate, latency).

### P1 Completion Notes (Current)

- Completed implementation commits:
  - `48be3b2` (`RPC-001`)
  - `d79aec1` (`RPC-002`)
  - `58da9d5` (`RPC-003`)
  - `412f06d` (`RPC-004`)
- Full test suite passed after `RPC-004` (`176/176`).

### P1 Explicit Constraints (to prevent over-refactor)

- Do not redesign provider tree structure unless required for dedupe.
- Do not introduce new backend aggregated account APIs in P1.
- Do not add complex adaptive transport state machines in P1.
- Do not add CI SLO gates in P1.

### Phase 2 (Conditional): Start Only If P1 Gates Fail (2-4 sprints)

**DO NOT START PHASE 2 UNTIL the Phase 1 gate review is completed and approved.**

### Trigger to start Phase 2

Start only if one or more are true after P1 is fully shipped and observed:

1. Browser RPC reduction is below 40%.
2. 429/error bursts remain materially user-visible.
3. p95 latency for key reads remains unstable despite P1 controls.

### Phase 2 Candidate Work

- `RPC-009` Backend aggregated account read API for stYFI only (pilot).
- `RPC-010` Mixed-freshness cache policy for aggregated endpoint.
- `RPC-011` Expand telemetry dashboards to include cache hit ratio and source mix.

### Phase 3 (Deferred): Do Not Start Without New Decision

**Explicitly deferred. No ticket kickoff unless roadmap is re-approved.**

- Proxy method allowlist enforcement (`C3` equivalent).
- Precomputed hot-data platform expansion (`C4` equivalent).
- Full client query-level telemetry + formal SLO CI budget gates (`E2`, `E3` equivalent).
- Broad multi-app aggregation unification.

## 7. Risk Register (Subtle Regression Focus)

### R1. Stale account state during action flows

- Mitigation: wallet-first revalidation before signing-critical actions remains mandatory.

### R2. Over-aggressive polling reduction hides needed updates

- Mitigation: post-write targeted invalidation and explicit per-key critical refresh policy.

### R3. Route-scoping accidentally suppresses required reads

- Mitigation: integration tests for route transitions and reconnect behavior.

### R4. Mandatory RPC env enforcement breaks deployments unexpectedly

- Mitigation: validate in CI early; fail fast with clear error message.

## 8. Testing Requirements (Implementation-Blocking)

No work item is complete without matching tests.

### Unit

- Query dedupe selector correctness.
- Blacklist probe cache behavior.
- Polling/focus policy map behavior.

### Integration

- Route-scoped query activation.
- Post-write targeted invalidation paths.
- 429/backoff behavior for configured keys.

### E2E

- Multi-tab focus switching without polling storms.
- Wrong-network, reconnect, and tx-success flows remain correct.
- Fallback and recovery behavior with temporary RPC impairment.

## 9. Handoff-Ready Ticket Specs

These can be started by a new agent immediately, in order.

### `RPC-001` Production RPC env enforcement

- Scope:
  - Add `NEXT_PUBLIC_RPC_URLS` to production-required env validation.
  - Ensure startup/runtime checks produce explicit failure/logging for missing value in production mode.
  - Update conflicting docs in same PR.
- Acceptance:
  - Production validation fails when missing/empty.
  - Test coverage for pass/fail paths.

### `RPC-002` Identity/account dedupe

- Scope:
  - Remove overlapping network reads between identity and stYFI account state.
  - Derive identity fields from canonical account query cache where possible.
- Acceptance:
  - Connected session account read count drops measurably.
  - No regressions in blacklist gating, balance display, or tx CTA enablement.

### `RPC-003` Focus refetch policy map

- Scope:
  - Default `refetchOnWindowFocus` to false for non-latency-critical keys.
  - Explicitly opt in only where necessary.
- Acceptance:
  - Tab-switch burst behavior reduced.
  - Critical panels still refresh correctly.

### `RPC-004` Route and visibility gating

- Scope:
  - Gate account and nudge polling by route relevance, connected state, and visibility.
  - Avoid heavy veYFI account reads on `/styfi` when not needed for visible UI.
- Acceptance:
  - Home/low-interaction routes show materially lower read activity.
  - `/styfi` and `/veyfi` feature completeness unchanged.

### `RPC-005` Blacklist probe caching

- Scope:
  - Cache successful probe signature per session (chain + contract).
- Acceptance:
  - Failed probe calls stop repeating every poll cycle.
  - Blacklist status behavior remains unchanged.

### `RPC-006` Expensive read downgrade

- Scope:
  - Move high-cost simulation/diagnostic reads to on-demand or lower cadence.
- Acceptance:
  - Read volume reduction confirmed.
  - UI copy/loading states remain coherent.

### `RPC-007` S3-first stats policy

- Scope:
  - Prefer global/S3 stats for steady-state display.
  - Keep short-lived on-chain overrides after writes for freshness.
- Acceptance:
  - Connected steady-state stats polling load decreases.
  - Post-write freshness is preserved.

### `RPC-008` Minimum telemetry pack

- Scope:
  - Add counters for request volume, error class (incl. 429), and p95 latency by source.
- Acceptance:
  - Dashboard/report can compare pre/post P1 objectively.

## 10. Go/No-Go Review Template (End of Phase 1)

Phase 2 remains blocked until this review is completed.

1. Browser RPC volume reduction: target >= 40%.
2. 429-originated visible failures: target >= 50% reduction.
3. Tx success path: no degradation.
4. Wrong-network/reconnect behavior: no regression.
5. Team decision:
   - If all pass: keep Phase 2 deferred.
   - If not: start Phase 2 pilot only (`RPC-009` to `RPC-011`).

## 11. Immediate Next Action

Run UAT on the shipped `RPC-001` through `RPC-004` milestone and only continue with `RPC-005` to `RPC-008` if UAT or production observation indicates further reduction is needed.

This set delivers the best reliability and load reduction with minimal architectural risk and keeps larger infrastructure work explicitly deferred unless metrics force escalation.
