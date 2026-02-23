# Security Hardening: Production Baseline

Status: Active baseline for production apps (`styfi`, `veyfi`)
Date: 2026-02-12

This document defines the enforced frontend security controls and release invariants.

Operational playbook:

- Runtime mode guide and deploy checklists: `docs/shared/runtime-modes.md`

## 1. Scope and Runtime Split

- `styfi` and `veyfi` are production surfaces.
- `yeth` is treated as non-production and is disabled by default in production runtime.
- Debug routes are disabled by default in production runtime.

## 2. Supply Chain and Dependency Policy

### 2.1 Deterministic Dependencies

- Direct dependencies and devDependencies are pinned to exact versions in `/package.json`.
- Dependency versions must be exact semver specifiers (`x.y.z`, with optional prerelease/build metadata).
- Non-deterministic specifiers (tags like `latest`, ranges, git URLs, and protocol aliases) are rejected.
- `packageManager` is pinned to an exact npm version.
- `package-lock.json` is required and must use `lockfileVersion >= 3`.

### 2.2 Local Install Policy

`/.npmrc` enforces:

- `save-exact=true`
- `engine-strict=true`
- `audit=false`
- `fund=false`

### 2.3 CI Enforcement

CI workflow `/.github/workflows/security-and-quality.yml` enforces:

- `npm ci` (no floating installs)
- `npm run validate:deps`
- `npm run validate:prod-env`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## 3. Production Runtime Invariants

Validation script: `/scripts/validate-prod-env.mjs`

Runtime mode contract:

- `NEXT_PUBLIC_RUNTIME_MODE` is the canonical runtime selector (`development`, `preview`, `production`).
- If unset, runtime mode falls back to deployment markers (`VERCEL_ENV`, `CF_PAGES_ENV`, `DEPLOYMENT_ENV`) and then `NODE_ENV`.

Production invariants (enforced when runtime mode resolves to `production`):

- `NEXT_PUBLIC_RUNTIME_MODE` must resolve to `production` for production deployments.
- `NEXT_PUBLIC_USE_MOCKS` must be `false`
- `NEXT_PUBLIC_E2E` must be `false`
- `NEXT_PUBLIC_WC_PROJECT_ID` is required
- `NEXT_PUBLIC_GLOBAL_DATA_URL` is required
- `NEXT_PUBLIC_MOTD_URL` is required
- `NEXT_PUBLIC_RPC_URLS` is required and must include at least one URL

Feature gating in production:

- `NEXT_PUBLIC_ENABLE_YETH=true` is required to expose yETH route/host.
- `NEXT_PUBLIC_ENABLE_DEBUG_UI=true` is required to expose `/debug/ui`.
- `yeth.yearn.fi` host routing always rewrites to `/yeth`; when yETH is disabled, the route gate returns 404 instead of falling through to launcher content.

Host-derived metadata origin safety:

- `metadataBase` and OG URL origin use explicit host allowlisting.
- Unknown or malformed bracket-host values (for example malformed IPv6 host header forms) fall back to canonical app domains.

## 4. Transaction Safety Controls

Mainnet-only write protections:

- All write preparations enforce `chainId === 1`.
- Non-mainnet writes fail fast before signing.

Pre-simulation protections:

- Every on-chain write path performs contract simulation before wallet signing.
- Submitted writes reuse simulation requests to prevent accidental chain drift.
- Predictable reverts are caught pre-signature and flow through normalized tx error handling.

## 5. Blacklist Policy Enforcement

`OnchainStyfiClient` now resolves `isBlacklisted` from `STAKING_MIDDLEWARE` on-chain using function-signature fallback probes:

- `isBlacklisted(address)`
- `is_blacklisted(address)`
- `blacklisted(address)`
- `blocked(address)`

Behavior:

- If a known probe resolves, UI uses `clear` or `blocked`.
- If no probe resolves, fallback is explicit: `unknown`.
- `unknown` is treated as a silent, non-blocking state in UI (no blacklist-status warning copy).
- Only explicit `blocked` status applies blacklist action restrictions.

## 6. Browser Security Headers

### 6.1 CSP and Nonce

Middleware sets a nonce per request and injects CSP with nonce-based script policy.

- App surfaces (`/styfi`, `/veyfi`, `/yeth`, including host-rewritten equivalents) enforce nonce-based script policy.
- Non-app routes use a static-compatible script policy (`'unsafe-inline'`) to avoid global dynamic rendering requirements.
- Theme bootstrap is served as a same-origin external script (`/yearn-theme-init.js`) instead of inline script markup.
- `HEAD` requests preserve original path semantics on shared hosts and apply host-prefix rewrites only for mapped app hosts, keeping `HEAD` and `GET` status behavior aligned.

### 6.2 Additional Browser Hardening

Enforced headers include:

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options` (`DENY`) by default for non-governance surfaces
- `X-Robots-Tag` (`noindex, nofollow`) for non-production runtime modes (`development`, `preview`)
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Origin-Agent-Cluster`

Policy is tuned to remain wallet-compatible (`same-origin-allow-popups`, broad `connect-src`/`frame-src` wallet domains).

### 6.3 Safe App Compatibility Controls

To support Safe custom app embedding while preserving clickjacking protections, the app uses a scoped policy:

- Non-governance routes keep strict anti-framing controls:
  - `X-Frame-Options: DENY`
  - CSP `frame-ancestors 'none'`
- Governance app requests (`/styfi`, `/veyfi`, `/yeth`, including mapped governance hosts) allow iframe embedding only from Safe origins via CSP `frame-ancestors` allowlist:
  - `https://app.safe.global`
  - `https://*.safe.global`
  - `https://gnosis-safe.io`
  - `https://*.gnosis-safe.io`
- `/manifest.json` is published at the site root with Safe app metadata and route-scoped CORS headers so Safe Wallet can validate app capability.

Security rationale:

- A global removal of framing protections would materially increase clickjacking exposure.
- Keeping `DENY`/`'none'` as defaults preserves defense-in-depth for all non-Safe traffic.
- The Safe exception is constrained to governance app surfaces and a narrow origin allowlist, minimizing blast radius while enabling Safe compatibility.

### 6.4 Middleware Convention Decision

- Next.js 16 emits a deprecation warning recommending the `proxy` convention.
- This repository intentionally keeps the `middleware.ts` convention for now so routing and header logic stay centralized in the current deployment path.
- The warning is expected and currently treated as non-blocking.

## 7. Accepted Risk: Unsigned Off-Chain Global/MOTD Data

Current accepted risk:

- Global stats (`NEXT_PUBLIC_GLOBAL_DATA_URL`) and MOTD (`NEXT_PUBLIC_MOTD_URL`) are schema-validated but not cryptographically signed.

Current impact boundary:

- These payloads drive display and UX text only.
- Transaction arguments and signing flows are sourced from wallet-connected chain reads and explicit user actions, not from remote JSON.

Mitigations in place:

- Zod validation with null-safe fallback behavior.
- Same-origin API proxying for fetch isolation.
- On-chain reads used for account-critical values where available.

Future hardening (recommended):

- Publish signed payloads with key rotation policy.
- Verify signatures in API routes before payload admission.
- Add freshness/rollback guards (timestamp + monotonic version checks).
