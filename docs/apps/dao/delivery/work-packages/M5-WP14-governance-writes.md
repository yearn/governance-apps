# M5 WP14: Governance Writes

Branch: `agent/dao/m5/wp14`

## Objective

Implement propose, vote, retract, flag, and veto as prepared domain transactions
through shared `useTx` with current eligibility checks.

## Depends on

- M5 WP13 merged into `agent/integration`.
- Pinned ABI and the accepted configurable address-manifest shape. Concrete fork
  addresses and deployment blocks belong to WP16.

## Scope

- Exact digest/script proposal preparation after successful publication.
- Yea/Nay through the configured Voter.
- Proposer retract and role-gated flag/veto.
- Wrong-network, simulate, signing, submitted, success, revert, and feed-lag
  states.
- Query and live-state invalidation.

## Non-goals

- No execute write; WP15 owns execution safety.
- No raw wagmi writes in components.
- No optimistic canonical proposal or vote history.

## Acceptance criteria

- Proposal uses the exact reviewed content digest and script.
- Post-veto participation voting remains available when live state permits it.
- Early-veto, duplicate-vote, zero-weight, cooldown, blacklist, cap, and role
  blocks are precise.
- All writes use prepared transactions and `useTx`.
- Unit and provider-fixture simulation proves the required preflight seam;
  deployed-contract proof remains an M6 gate.
- Successful writes show awaiting-index state without inventing feed records.

## Validation

- Prepared calldata and argument tests.
- Simulation, success, rejection, revert, wrong-network, and lag tests.
- Hook integration and critical flow E2E.
- Standard repository checks.

## Review

Write-path auditor, contract-behavior reviewer, and transaction UX reviewer.
