# M5 WP13: Forum Validation and IPFS Publication

Branch: `agent/dao/m5/wp13`

## Objective

Validate Yearn forum discussions and publish the exact immutable proposal JSON
through a server-owned, integrity-checked IPFS path.

## Depends on

- Accepted M4.
- The WP7B authenticated-manifest contract: the onchain value is the SHA-256
  digest of exact canonical content JSON, content and assets use independent
  CIDv1/raw/SHA-256/Base32 blocks, and manifest paths are logical lookups.
- Contract-team confirmation that the target Voting deployment uses that fixed
  digest convention.
- Pinning and retention ownership chosen for preproduction.

## Scope

- Same-origin public Discourse topic validation and normalization.
- Replace the M2 URL field with an accessible Discourse-topic combobox scoped
  to the configured Yearn Proposals category. Support keyboard operation,
  paginated results, debounce, cache, rate-limit handling, exact selected-topic
  validation, and paste-URL fallback. Do not ship a mock-only autocomplete.
- Consume the WP7B content schema, exact byte encoder, parser vectors, and
  manifest limits without adding a second schema or parser.
- Create and round-trip one raw content block plus one independent raw block
  for each asset. Each asset CID comes from its manifest digest. Verify exact
  uploaded bytes against digest and byte length, and verify media type and image
  dimensions before accepting the manifest entry.
- Keep `./assets/...` as an exact logical manifest lookup, never an IPFS
  descendant. Direct `ipfs://` targets contain one exact canonical raw CID with
  no suffix. Both resolve to `https://ipfs.io/ipfs/<assetCid>`.
- Enforce unique normalized paths and digests, at most 16 assets, 512 UTF-8 path
  bytes, 127 UTF-8 media-type bytes, 2,097,152 bytes per asset, 33,554,432
  aggregate bytes, 8,192 px per image dimension, and 33,554,432 image pixels.
  The 2 MiB bound keeps each asset compatible with the intended single raw
  block exchange and pinning paths.
- Server-side provider credentials, multi-pin policy, timeout, retry, and
  last-good retention.
- Mock service replacement in the authoring form.
- Replace only the M2 publication boundary. Reuse the finalized content type,
  canonical encoder, parser, validator, AST renderer, and attachment resolver;
  do not add a second content schema, compatibility parser, or package-root CID.

## Non-goals

- No automatic forum topic creation.
- No persistent or clickable full-process authoring stepper unless a later UX
  review scopes it. Keep the accepted numbered sections and two-action flow.
- No hard minimum topic age or poll rule without updated DAO policy.
- No contract write in this package.
- M2's committed pre-pinned content/asset vectors are test evidence only. They
  do not prove upload, provider pinning, retention, recovery, or byte inspection
  against user-supplied files; those are WP13 responsibilities.

## Acceptance criteria

- The app path requires a public topic under Yearn `Proposals`.
- Direct-contract proposals still render without verified discussion.
- Exact uploaded content bytes reproduce the content CID and onchain digest;
  each uploaded asset reproduces its independent raw CID and manifest digest.
- Relative manifest and direct CID forms resolve to the same suffix-free
  gateway URL for the same asset.
- Uploaded bytes, declared byte length, media type, width, height, digest, and
  derived raw CID round-trip against fixed valid and inconsistent vectors.
- One provider failure does not silently report full retention success.
- Secrets never enter client bundles.

## Validation

- Forum response fixtures and SSRF/URL-validation tests.
- Content bounds and deterministic byte vectors.
- CID/digest round trips and provider-failure tests.
- Standard repository checks.

## Review

Backend/security reviewer and IPFS integrity auditor. Integrate before writes.
