# Security Hardening Backlog

Status date: 2026-02-12
Scope: stYFI and veYFI production readiness, yETH gated as non-production.

## Phase 0: Supply Chain and Release Invariants

### 0.1 Pin direct dependencies and toolchain
- [x] Replace semver ranges (`^`, `~`) with exact versions in `/package.json`.
- [x] Add npm policy settings in `/.npmrc` for exact saves and strict engines.
- [x] Pin package manager version in `/package.json`.

Acceptance criteria:
- Direct dependencies and devDependencies are exact versions.
- Dependency policy rejects non-semver specifiers (tags, git/protocol aliases, and ranges).
- Local install policy enforces deterministic dependency behavior.

### 0.2 Add production config validation
- [x] Add runtime/build-time guard for `NEXT_PUBLIC_USE_MOCKS` and `NEXT_PUBLIC_E2E` when runtime mode resolves to `production`.
- [x] Add explicit script to validate production environment invariants.

Acceptance criteria:
- Production build/start fails fast when forbidden flags are enabled.

### 0.3 Add CI policy checks
- [x] Add CI workflow for `npm ci`, lockfile integrity, tests, and type checks.
- [x] Add lockfile and dependency policy verification step.

Acceptance criteria:
- CI uses `npm ci` and rejects non-deterministic dependency drift.

## Phase 1: Route Gating and Host Safety

### 1.1 Gate yETH in production
- [x] Gate yETH route behind explicit feature flag in production.
- [x] Hide yETH app link when route is gated.

Acceptance criteria:
- yETH is not accessible in production unless explicitly enabled.
- `yeth.yearn.fi` does not fall through to launcher content when yETH is disabled.

### 1.2 Harden host-derived metadata
- [x] Add allowlisted host resolution for metadata origin.
- [x] Ensure unknown hosts fall back to canonical app domains.

Acceptance criteria:
- `metadataBase` and OG URL generation do not trust arbitrary host headers.

### 1.3 Lock down debug surface
- [x] Disable or gate `/debug/ui` in production.

Acceptance criteria:
- Debug route is unavailable on production builds.

## Phase 2: Transaction Safety

### 2.1 Enforce chain pinning for writes
- [x] Require mainnet (chainId `1`) for write preparation and submission.
- [x] Include `chainId: 1` in write calls.

Acceptance criteria:
- Writes are blocked on non-mainnet and do not submit to unintended chains.

### 2.2 Pre-simulate writes
- [x] Add contract simulation before each on-chain write path.
- [x] Surface simulation failures via existing normalized error pipeline.

Acceptance criteria:
- Predictable reverts are caught before wallet signature.

### 2.3 Tighten UI action gating
- [x] Ensure action hooks/components treat wrong network as disconnected for writes.

Acceptance criteria:
- Buttons that trigger writes are consistently disabled off mainnet.

## Phase 3: Blacklist and Policy Enforcement

### 3.1 Replace hardcoded blacklist status
- [x] Implement on-chain blacklist probe via staking middleware with multiple known function signature fallbacks.
- [x] Wire blacklist status into stYFI account state.

Acceptance criteria:
- UI blacklist state is sourced from chain where available.
- Fallback behavior is explicit and documented.

### 3.2 Add policy tests
- [x] Add tests for blacklist-aware UI disable behavior in non-mock path adapters where feasible.

Acceptance criteria:
- Regression coverage exists for blacklist-dependent action gating.

## Phase 4: Browser Hardening

### 4.1 Add stronger web security headers
- [x] Add CSP, Permissions-Policy, and isolation headers with wallet-compatible defaults.
- [x] Keep existing HSTS, frame, referrer, and nosniff protections.

Acceptance criteria:
- Header policy is materially stronger and tested for application compatibility.

### 4.2 Align theme bootstrap with CSP
- [x] Move inline theme script to nonce-aware flow and connect nonce in CSP.

Acceptance criteria:
- Theme bootstrap works without requiring `unsafe-inline` script policy.
- App routes avoid static-render nonce mismatches via scoped CSP enforcement rather than global dynamic rendering.

## Phase 5: Verification and Documentation

### 5.1 Run full verification
- [x] Run tests and type checks; fix regressions.
- [x] Run lint and resolve introduced issues.

Acceptance criteria:
- Test, typecheck, and lint pass.

### 5.2 Update docs
- [x] Document new env flags, release invariants, dependency policy, and yETH gating.
- [x] Document accepted risk: unsigned off-chain global data.

Acceptance criteria:
- Operational docs reflect production hardening behavior.
