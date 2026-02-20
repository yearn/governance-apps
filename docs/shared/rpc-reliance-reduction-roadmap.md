# RPC Reliance Reduction Roadmap

Status: Draft (for future work)  
Last Updated: February 20, 2026

## 1. Purpose

This document defines a concrete, staged plan to reduce frontend dependence on direct public RPC calls while preserving correctness for wallet-connected user actions.

Primary drivers:

- Reliability under traffic spikes.
- Reduced blast radius from third-party RPC outages/rate limits.
- Lower request volume from browsers.
- Better observability and controlled failure behavior.

This roadmap is intentionally implementation-oriented so it can be translated into tickets without re-discovery.

## 2. Current Behavior (as implemented)

### 2.1 Transport bootstrapping

- `wagmi` transport is configured in `web3/wagmi.ts`.
- If `NEXT_PUBLIC_RPC_URLS` is set, those URLs are used.
- If not set:
  - production fallback: `https://rpc.yearn.fi/chain/1`
  - non-production fallback: `viem` mainnet defaults.

### 2.2 Wallet-connected account reads

- Domain account reads are gated on connected wallet and use wallet-backed EIP-1193 transport via:
  - `state/protocol.tsx`
- This is the desired data authority for user-specific account state.

### 2.3 Browser-side query behavior

- stYFI and veYFI account queries poll every 30s with focus refetch enabled.
- Global/domain stats poll every 60s.
- Identity and domain hooks can trigger overlapping account-state reads.

### 2.4 Known stress contributors

- Repeated polling from every open tab/session.
- Duplicate reads for overlapping UI state (identity + domain account slices).
- Reads that are always-on at app shell level rather than route-scoped.
- Third-party widget internals (for example wallet UI) can make extra balance requests unless explicitly constrained.

## 3. Non-Goals

- Do not remove wallet-backed reads for signing-critical and account-specific truth.
- Do not compromise network safety checks (mainnet gating, wrong-network handling).
- Do not add hidden write paths through proxy infrastructure.
- Do not rely on eventual consistency for user actions that need immediate post-tx correctness.

## 4. Guiding Principles

1. Use wallet RPC only where wallet authority is needed.
2. Prefer server-owned read aggregation for high-fanout, read-heavy data.
3. Collapse duplicate queries into canonical sources.
4. Poll less, invalidate smarter.
5. Ensure each optimization has measurable impact.

## 5. Target State

### 5.1 Browser responsibilities

- Minimal account-critical reads.
- Route-scoped query activation.
- Event-driven refresh after successful writes.
- Conservative background polling only when visible.

### 5.2 Backend responsibilities

- Aggregate account and global read models behind Yearn-controlled endpoints.
- Cache hot read methods with chain-aware freshness policy.
- Provide stable CORS behavior for browser clients.
- Emit telemetry for cache hit ratio, method mix, and error classes.

### 5.3 Operational controls

- Explicit production RPC config requirement.
- Fallback ladders that are observable and deterministic.
- Budget-based SLOs for request rate and latency.

## 6. Workstreams and Detailed Backlog

### 6.1 Workstream A: Query Topology Cleanup (frontend)

Goal: remove redundant reads and ensure only needed queries run.

### A1. De-duplicate identity and account-state fetches

- Problem:
  - `IdentityProvider` and domain hooks both call account state for overlapping fields.
- Action:
  - Define a canonical account-state query per domain and derive identity from cache selectors.
  - Avoid separate network calls for derived properties already in query data.
- Expected impact:
  - 20-40% fewer account reads for active connected sessions.

### A2. Route-scope account queries

- Problem:
  - shared providers mounted globally can trigger reads even on routes that do not need full account state.
- Action:
  - Move domain account hook usage into route-local boundaries (`/styfi`, `/veyfi`), or gate by current app route.
- Expected impact:
  - Large reduction on home and low-interaction pages.

### A3. Disable unnecessary focus refetches

- Problem:
  - switching tabs/windows can burst refetch many queries at once.
- Action:
  - Per query key, disable `refetchOnWindowFocus` unless value is latency-sensitive.
  - Add route-level opt-in for panels requiring fast refresh.
- Expected impact:
  - Lower burst load and fewer synchronized spikes.

### A4. Adaptive polling policy

- Action:
  - Poll only when:
    - page is visible,
    - wallet connected,
    - active route needs data,
    - no recent fatal transport errors.
  - Increase interval under transport stress (backoff window).
- Expected impact:
  - 30-60% less background traffic in normal use.

### 6.2 Workstream B: Domain Client Efficiency

Goal: reduce call count inside each fetch cycle.

### B1. Consolidate contract reads where ABI allows

- Action:
  - Review per-domain multicall contract sets and remove duplicate or stale reads.
  - Use narrower read sets for compact UI states (summary vs full detail).

### B2. Cache probe capabilities

- Problem:
  - probing multiple blacklist method names repeatedly incurs failed calls.
- Action:
  - Cache successful probe signature per chain + contract for session lifetime.
- Expected impact:
  - Removes repeated failed calls and noise logs.

### B3. On-demand expensive reads

- Problem:
  - reward simulations and certain diagnostic reads can be expensive when polled.
- Action:
  - Move to on-demand or lower-frequency channels unless section is actively viewed.

### B4. Minimize chain time reads

- Action:
  - Keep cached chain-time offset, refresh only at bounded cadence and when needed.

### 6.3 Workstream C: Backend Read Model and Proxy Evolution

Goal: shift read fanout from browsers to Yearn-managed infrastructure.

### C1. Account read aggregation API

- Action:
  - Add API endpoint(s) returning aggregated account model for each app.
  - Server executes multicalls and enriches response.
- Benefits:
  - Browser makes one call; server handles batching and cache.
  - Better control over retries, rate limits, and circuit breaking.

### C2. Global + account mixed freshness strategy

- Action:
  - TTL tiers:
    - block-sensitive: 2-6s
    - epoch-sensitive: 30-60s
    - metadata/static: 10m+
- Benefits:
  - lower backend chain load with predictable staleness budget.

### C3. Method allowlist and policy enforcement

- Action:
  - enforce read-only methods and chain ID constraints at proxy layer.
  - reject non-allowlisted methods with explicit error payload.

### C4. Precomputed hot data

- Action:
  - move highest-traffic values (global stats, inventory snapshots) to precomputed store with frequent refresh jobs.
- Benefits:
  - near-zero RPC for most anonymous and passive views.

### 6.4 Workstream D: UX and Interaction-Level Reductions

Goal: avoid data reads that do not improve user outcome.

### D1. Progressive detail loading

- Action:
  - load compact summary first.
  - fetch detail-only data when panel is expanded.

### D2. Post-write targeted invalidation

- Action:
  - invalidate only affected query keys (not whole domain groups).
  - avoid broad cache busting on every transaction.

### D3. Debounce high-frequency UI-driven reads

- Action:
  - where inputs trigger quote/simulation reads, debounce and cancel stale requests.

### 6.5 Workstream E: Observability and SLOs

Goal: make RPC usage measurable and enforceable.

### E1. Instrument per-method counters

Track at minimum:

- `rpc.requests.total` by method/chain/source (browser, proxy, backend job)
- `rpc.errors.total` by status/error class (429, timeout, CORS, invalid params)
- `rpc.latency.ms` p50/p95/p99
- `rpc.cache.hit_ratio` for proxy endpoints

### E2. Client telemetry

- Emit query-key level metrics:
  - fetch frequency
  - refetch triggers (interval, focus, invalidate)
  - error streaks

### E3. SLOs and alerting

Proposed initial SLOs:

- <1% RPC error rate over 10m rolling window.
- <500ms p95 for cached proxy reads.
- <2s p95 for uncached aggregated account reads.

## 7. Phased Delivery Plan

### Phase 0: Immediate hardening (completed/ongoing)

- Explicit production fallback to Yearn proxy endpoint.
- Removed wallet UI patterns that triggered implicit balance polling by default.
- Reduced noisy transport retry behavior.

### Phase 1: Low-risk frontend reductions (1-2 sprints)

- A1, A2, A3, B2.
- Deliver with no backend contract changes.

Exit criteria:

- At least 30% drop in browser-side RPC calls per active session.
- No regressions in transaction success path.

### Phase 2: Backend aggregation foundation (2-4 sprints)

- C1, C2, E1.
- Introduce account read APIs and route clients gradually.

Exit criteria:

- >70% of read traffic served by Yearn-managed API/proxy paths.
- Stable p95 latency with controlled cache policy.

### Phase 3: Advanced optimization and enforcement (ongoing)

- C3, C4, D1-D3, E2-E3.
- Formal SLO governance and budget guardrails in CI/deploy checks.

## 8. Risk Register

### R1. Staleness surprises

- Mitigation:
  - per-field freshness annotations.
  - visible “updated at” where relevant.

### R2. Divergence between wallet truth and aggregated responses

- Mitigation:
  - wallet-first revalidation before signing-critical actions.
  - compare-and-heal strategy on mismatch.

### R3. Backend complexity and cost

- Mitigation:
  - phase rollout by highest-traffic reads first.
  - maintain strict method allowlists.

### R4. Silent fallback regressions

- Mitigation:
  - production env validation requires explicit RPC URL configuration.
  - runtime warning telemetry on fallback usage.

## 9. CI/CD and Policy Changes Required

1. Make `NEXT_PUBLIC_RPC_URLS` mandatory in production validation.
2. Add lint/policy checks for unsupported `ConnectButton` usage patterns that re-enable automatic balance polling where not needed.
3. Add smoke tests validating configured RPC endpoint path correctness (for example `/chain/1` on proxy).
4. Add synthetic checks for CORS preflight and JSON-RPC POST behavior.

## 10. Testing Strategy

### 10.1 Unit tests

- Query key de-dup behavior.
- Cache-derived identity selectors.
- Adaptive polling state machine.

### 10.2 Integration tests

- Route-scoped query activation.
- Post-write targeted invalidations.
- Error backoff behavior under simulated 429.

### 10.3 E2E tests

- Multi-tab behavior (ensure no duplicate polling storms).
- Wrong-network and reconnect behavior without extra balance spam.
- Recovery from temporary proxy outage.

## 11. Suggested Ticket Breakdown (ready-to-file)

1. `RPC-001` Enforce explicit production `NEXT_PUBLIC_RPC_URLS` in env validator.
2. `RPC-002` De-duplicate identity vs domain account reads.
3. `RPC-003` Route-scope account queries by active app route.
4. `RPC-004` Introduce adaptive polling and focus-refetch policy map.
5. `RPC-005` Cache blacklist probe capability in stYFI client.
6. `RPC-006` Make reward simulation reads on-demand.
7. `RPC-007` Add aggregated account read API for stYFI.
8. `RPC-008` Add aggregated account read API for veYFI.
9. `RPC-009` Add proxy and client telemetry dashboards.
10. `RPC-010` Add synthetic monitors for CORS + JSON-RPC path health.

## 12. Definition of Done for “Reduced RPC Reliance”

A release can claim meaningful reduction only when all conditions hold:

1. Browser-side RPC request volume reduced by at least 50% compared to baseline (same traffic profile).
2. 429-originated user-visible failures reduced by at least 90%.
3. Account-critical actions remain correct with no increase in tx failure rates.
4. Production has explicit, validated RPC URL configuration with no silent third-party fallback.
5. Dashboards and alerts exist for method-level volume, error rates, and cache hit ratio.

## 13. Implementation Notes for Future Contributors

- Preserve the wallet-backed EIP-1193 read path for authoritative account checks at action time.
- Prefer reducing read frequency and duplication before adding new infrastructure.
- Any fallback behavior must be explicit in docs and env validation.
- When adding new hooks, include a query budget rationale (why interval/focus/refetch choices are safe).
- Any UI component introducing wallet-related read hooks should document expected RPC cost.

## 14. Open Questions

1. Should proxy cache TTL vary by method and block tag dynamically (for example `latest` vs specific block)?
2. Should we maintain per-app aggregated endpoints or a shared account-state endpoint with app selectors?
3. What is the acceptable staleness budget for top-of-page stats under peak load?
4. Do we want fail-open (stale cache) or fail-closed (error) for each data class?

## 15. Immediate Next Recommended Action

Start with `RPC-001` through `RPC-004` in one milestone. These provide the highest reliability gain with the lowest architectural risk and prepare the codebase for backend aggregation in phase 2.
