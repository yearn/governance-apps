# M5 WP13: Forum Validation and IPFS Publication

Branch: `agent/dao/m5/wp13`

## Objective

Validate Yearn forum discussions and publish the exact immutable proposal JSON
through a server-owned, integrity-checked IPFS path.

## Depends on

- Accepted M4.
- Contract-team confirmation of the CID convention.
- Pinning and retention ownership chosen for preproduction.

## Scope

- Same-origin public Discourse topic validation and normalization.
- Bounded content schema and exact byte encoder.
- CIDv1/raw/SHA-256 creation, digest extraction, and round-trip verification.
- Server-side provider credentials, multi-pin policy, timeout, retry, and
  last-good retention.
- Mock service replacement in the authoring form.

## Non-goals

- No automatic forum topic creation.
- No hard minimum topic age or poll rule without updated DAO policy.
- No contract write in this package.

## Acceptance criteria

- The app path requires a public topic under Yearn `Proposals`.
- Direct-contract proposals still render without verified discussion.
- Exact uploaded bytes reproduce CID and onchain digest test vectors.
- One provider failure does not silently report full retention success.
- Secrets never enter client bundles.

## Validation

- Forum response fixtures and SSRF/URL-validation tests.
- Content bounds and deterministic byte vectors.
- CID/digest round trips and provider-failure tests.
- Standard repository checks.

## Review

Backend/security reviewer and IPFS integrity auditor. Integrate before writes.
