# M6 WP16: Fork Harness and Deployment Configuration

Branch: `agent/dao/m6/wp16`

## Objective

Create a repeatable fork environment that connects the governance contracts,
`gov-apps-stats`, and frontend without production credentials.

## Depends on

- Accepted M5.
- Deployable contracts or a stable deployed target.

## Scope

- Fork start/reset commands and RPC gate.
- Deploy or attach flow and versioned contract manifest.
- Bind the configurable clients and producer to the actual fork addresses and
  deployment blocks.
- Deployment blocks, chain ID, role accounts, funded personas, and time controls.
- Frontend and producer environment wiring.
- Indexer reset/replay and content-provider test setup.

## Non-goals

- No production addresses presented as final unless they are deployed and
  confirmed.
- No manual-only environment that another developer cannot reproduce.

## Acceptance criteria

- A clean developer can start, deploy/attach, configure, index, and reset the
  environment from the runbook.
- Contract, producer, and frontend identities agree.
- Observer, voter, proposer, operator, guardian, and executor personas exist.
- Fork time can cross discussion, vote, execution, and expiry boundaries.
- No production secret is required.

## Validation

- RPC/deployment smoke, address and ABI checks, producer first-scan smoke, and
  frontend read smoke.
- Standard repository checks.

## Review

Fork operator, deployment auditor, and feed integrator. Integrate before WP17.
