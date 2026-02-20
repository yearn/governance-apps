# yETH Production Readiness Checklist

Status: Working checklist  
Owner: Frontend + Smart Contracts + Security + Ops

Use this checklist to track all work required to move from current mock-first yETH to production contract-backed release.

## 1. Contract and Protocol Readiness

- [ ] Finalize Recovery Vault and Yield Vault contract addresses.
- [ ] Finalize Claim contract interface and eligibility/claim amount methods.
- [ ] Confirm claim window constants and governance-approved timeline.
- [ ] Confirm late-claim governance/manual process and endpoint.
- [ ] Confirm canonical data source for:
  - [ ] Recovery Vault PPS
  - [ ] Recovery Vault total assets
  - [ ] Yield Vault TVL
  - [ ] performance fee and fee recipient
- [ ] Verify invariant enforcement in contracts:
  - [ ] Treasury receives 0% yield
  - [ ] Treasury holds 0 Recovery Vault shares
  - [ ] claim-and-exit and claim-and-stay are atomic

## 2. Security and Risk Review

- [ ] Internal smart-contract audit complete.
- [ ] External audit complete and findings resolved/accepted.
- [ ] Threat model reviewed for:
  - [ ] claim manipulation vectors
  - [ ] vault accounting drift
  - [ ] fee-routing correctness
  - [ ] share dilution edge cases
- [ ] Incident response runbook prepared.
- [ ] User-facing risk language approved by governance/comms/legal.

## 3. Frontend Integration Work

- [ ] Implement `OnchainYethClient` in `lib/clients/yeth/onchain.ts`.
- [ ] Add production client selection path in `state/protocol.tsx`.
- [ ] Wire contract ABIs and typed read/write methods.
- [ ] Replace mock placeholder URLs with final approved URLs.
- [ ] Replace mock contract addresses in trust drawer with deployed addresses.
- [ ] Ensure error mapping for yETH-specific failure modes in `lib/tx/errors.ts`.
- [ ] Add loading/error fallback UX for unavailable yETH chain data.

## 4. Testing and Quality Gates

- [ ] Unit tests for yETH math and state transitions.
- [ ] Unit tests for on-chain data mapping and formatting.
- [ ] Integration tests for yETH hooks and query invalidation.
- [ ] E2E smoke tests:
  - [ ] eligible claim and exit
  - [ ] eligible claim and stay
  - [ ] staying user redeem
  - [ ] claim window ended flow
  - [ ] ineligible wallet flow
- [ ] E2E failure-path tests:
  - [ ] tx rejection
  - [ ] revert handling
  - [ ] insufficient liquidity handling
- [ ] Lint, typecheck, unit, and e2e pipelines green on release commit.

## 5. Data, Content, and Governance Artifacts

- [ ] Confirm final approved YIP link.
- [ ] Publish manual late-claim instructions and stable URL.
- [ ] Validate all copy against approved governance language.
- [ ] Validate all displayed numbers are current-state only.
- [ ] Confirm no prohibited language (yield promises, urgency pressure).

## 6. Deployment and Operations

- [ ] Merge release branch to `master`.
- [ ] Deploy to production worker.
- [ ] Verify path-based access:
  - [ ] `app.dao-ops.com/yeth`
- [ ] Confirm desired discoverability behavior:
  - [ ] included or excluded in sitemap
  - [ ] included or excluded in global header navigation (`Ecosystem` / `Resources`)
- [ ] Confirm host-route behavior for `yeth.yearn.fi`:
  - [ ] disabled until ready, or
  - [ ] enabled with Cloudflare route when launch-approved
- [ ] Post-deploy production sanity checklist:
  - [ ] wallet connect
  - [ ] claim actions
  - [ ] trust drawer data
  - [ ] explorer links

## 7. Launch Criteria (Go/No-Go)

Release to broad user traffic only when all are true:

- [ ] Contracts deployed and audited
- [ ] On-chain client integrated and validated
- [ ] Security sign-off complete
- [ ] Governance/comms sign-off complete
- [ ] Full test suite pass in CI
- [ ] Ops sign-off complete

If any critical checkbox is incomplete, release remains controlled-access only.
