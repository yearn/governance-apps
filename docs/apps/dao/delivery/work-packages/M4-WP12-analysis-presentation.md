# M4 WP12: Content and Analysis Presentation

Branch: `agent/dao/m4/wp12`

## Objective

Render producer-backed IPFS, decoding, script verification, and proposal-time
simulation results with accurate provenance and failure behavior.

## Depends on

- M4 WP11 merged into `agent/integration`.

## Scope

- Available, unavailable, invalid, and unverified content states.
- Analysis pending, complete, partial, failed, and unavailable states.
- Ordered known and unknown calls.
- Simulation block/time and script-hash evidence.
- Tiered voting and execution gating from the functional requirements.

## Non-goals

- No IPFS upload.
- No fresh execution simulation or execute write.
- No proposer metadata presented as verified ABI decoding.

## Acceptance criteria

- Missing content does not hide or disable an otherwise permitted vote.
- Missing or mismatched script blocks execution capability.
- Unknown calls retain raw target, selector, and calldata.
- Proposal-time simulation states that current state can change.
- Technical content is readable and accessible on mobile.

## Validation

- Component tests for every content/analysis matrix row.
- Unknown-target, hash-mismatch, and failure regressions.
- Responsive and accessibility E2E plus standard checks.

## Review

Security/contract auditor and frontend auditor. Tag M4 after the combined read
path is accepted.
