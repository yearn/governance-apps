# DAO Governance Delivery Status

This is the durable package and gate ledger. The orchestrator updates it after
every accepted merge. When a merge SHA is not known before integration, the
integrator records it in a small post-merge documentation commit before the next
package starts.

## Current state

- Current milestone: M1 in progress
- Next package: M1 WP3
- Product gate: discovery accepted; mock UX not yet built
- Required baseline tag: `integration/dao-m0`

## Package ledger

| Package | Branch | Reviewed commits | Integration merge | Checks and evidence | Accepted risks | Next dependency |
| --- | --- | --- | --- | --- | --- | --- |
| M0 WP0 | `agent/data` | `a7a11b83ea89f9d9852b73c4a63b230fdd57de20`, `3d746e84b02d58bbe196525fb5a2510b4bfbce64` | Resolved by `integration/dao-m0` | Specification, link, shell, repository, and integration gates | Contract PR remains open; live addresses and CID convention are later inputs | M1 WP1 |
| M1 WP1 | `agent/dao/m1/wp1` | Range `04224b3c930fd72efee6b65afa07f83c70369446..f2ce68485f935800b75a7226278534b1d0796b67`; tip `f2ce68485f935800b75a7226278534b1d0796b67`; commits `d9435b58955a7a0b60675cccda55940533c6aa40`, `78683e242ccd10af99e01361c7b841fb0c469c36`, `f2ce68485f935800b75a7226278534b1d0796b67` | `83f4932b19a663c599c5e59ff74e0630a253ee9d` | Independent reviewer and pinned-contract auditor approved; `npm run typecheck`; `npm run lint`; `npm run test` (118 files, 885 tests) | M5 execution-preflight freshness; unavailable-content CID semantics; `nextEligibleAt` sentinel presentation; PR #5 head advanced to `168a9957` while pin remains `9395d5e` | M1 WP2 |
| M1 WP2 | `agent/dao/m1/wp2` | Range `cb72e4960bb1f6d446336d8e69d7d4e7ffa1c517..d02936593ab1f5cb7f3a5e3e7c50c4bcb84e9741`; tip `d02936593ab1f5cb7f3a5e3e7c50c4bcb84e9741`; commits `b1f06f7fa06134cf9bb40935dc98014fcc319671`, `17fa4c1ea94d9e3acc4f79a76356094834379916`, `d02936593ab1f5cb7f3a5e3e7c50c4bcb84e9741` | `4a39312443a5bb4c70e877f6961b67336bbd98cc` | Independent code/runtime reviewer and frontend/accessibility auditor approved with no blockers; `npm run typecheck`; `npm run lint`; `npm run test` (122 files, 905 tests); `npm run test:e2e` (25 passed, 2 skipped); `npm run test:e2e:full` (1 passed); `npm run build` | Shared E2E RPC console warning; inherited shared-header small targets and mobile-dialog focus; WP3 must add deliberate invalidation/reset around the module mock client and infinite queries; OpenNext/Cloudflare preview not yet run; production remains fail-closed with no DAO host | M1 WP3 |

## Gate ledger

| Gate | State | Evidence | Decision |
| --- | --- | --- | --- |
| M0 discovery | Accepted | Canonical DAO product documents | Begin mock foundation after the M0 tag is present |
| M2 mock UX | Not started | None | Stop for user review |
| M6 fork UAT | Not started | None | Stop for user review |
| M7 production | Not started | None | Requires explicit approval |
