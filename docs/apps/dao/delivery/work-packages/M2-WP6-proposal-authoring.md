# M2 WP6: Proposal Authoring

Branch: `agent/dao/m2/wp6`

## Objective

Build mock signal and executable proposal authoring with a full raw-script input,
structural checks, immutable-content review, and mock publish/propose states.

## Depends on

- Accepted M1.

## Expected ownership

- `/dao/propose` components and route-local copy
- authoring form state and validation
- mocked forum and publication services
- form and authoring E2E tests

## Scope

- Mock forum topic validation and normalization.
- Immutable title, summary, specification, and type.
- Signal empty script.
- Executable full-hex textarea, parser result, targets, byte/call count, and hash.
- Final review plus separate publication and onchain mock steps.
- Precise proposer eligibility for wallet, network, blacklist, weight, cooldown,
  and the rolling six-epoch shared proposal capacity.

## Non-goals

- No ABI builder, bundle format, semantic browser decode, or browser simulation.
- No real forum API, IPFS provider, or contract write.

## Acceptance criteria

- Empty script is valid only for Signal.
- Parser errors identify code and byte offset.
- Passing copy says `Script structure is valid`, never safe or verified.
- Exact content, script, and hash appear before confirmation.
- Failed publication preserves form state and does not start the wallet step.
- A full affected reward epoch blocks submission and identifies the shared
  capacity rule without implying a per-user quota.
- Copy says backend decoding and simulation follow submission.

## Validation

- Fixed parser/form vectors and accessibility tests.
- Signal and executable authoring E2E.
- Standard repository checks.

## Review

Contract-format auditor and form/accessibility reviewer. May run alongside WP4;
integrate after WP4 to reduce route-level conflict risk.
