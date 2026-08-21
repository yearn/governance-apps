# M3 WP8: Feed Schema and Producer Brief

Branch: `agent/dao/m3/wp8`

## Objective

Freeze the versioned DAO feed contract and exact `gov-apps-stats` handoff from
the accepted mock domain.

## Depends on

- User-accepted M2.

## Scope

- JSON schema, TypeScript/Zod boundary, and example payload.
- Canonical block, contract generation, and composite proposal identity.
- Events, script, hash verification, IPFS, discussion, moderation, votes,
  decoding, simulation, and failure fields.
- Exact reviewed Markdown source, fixed-order content JSON with its final LF,
  the SHA-256 onchain digest, the CIDv1/raw/SHA-256/Base32 content CID, the WP7B
  bounded asset manifest, and the accepted parser/error vectors. Consumers do
  not reserialize parsed content to choose its digest.
- Independent raw asset CIDs derived from manifest digests. A relative manifest
  attachment is an exact logical path lookup, never a content-CID descendant;
  a direct `ipfs://` attachment has no path, slash, query, or fragment. Both
  resolve to `https://ipfs.io/ipfs/<assetCid>` with no suffix.
- Proposal-time simulation method, engine, caller/context, state block and hash,
  timestamp treatment, state/time overrides, atomic result, and failure state.
- Structured verified-source kind, label, validated HTTPS URL, revision, and
  source path. A source may prove decoder provenance but not a mock deployment;
  unknown calls have no verified source.
- Producer-owned canonical event timestamps, nullable transaction hashes, full
  block/transaction/log identity, truthful actor roles, and moderation reasons.
- Proposal-owned rule snapshots: 5,000-basis-point normal default, retained
  6,000-basis-point alternate, positive-total requirement, no minimum turnout,
  proposal type, vote duration, execution delay/guard, Voting identity/source,
  and the observation block for mutable configuration.
- Receipt-derived composite identity. Creation evidence binds a successful
  transaction hash and exactly one matching Voting `Propose` log to proposer,
  voting epoch, content digest, and exact script. Awaiting-index and indexed
  records retain that same ref.
- Human vote versus YBC/delegated aggregate classification.
- Producer start blocks, confirmation, retry, and atomic-publication requirements.
- Completed producer handoff copied from `producer-handoff-template.md`.

## Non-goals

- No producer implementation.
- No frontend feed wiring.
- No wallet-specific action eligibility in the feed.

## Acceptance criteria

- Every accepted mock state maps to the schema without optional-field guesswork.
- Browser code needs no historical log scan.
- Exact event script and its verification result are retained.
- Unknown calls and failures remain representable.
- A time-gated `Voting.execute` at the proposal block is not accepted as the
  proposal-time simulation method.
- Failed and unavailable simulation states are distinct, and decode status is
  independent.
- Consumer tests reject incompatible or internally inconsistent examples.
- Consumer tests reject unsafe/incomplete verified sources, substituted event
  time, receipt/log mismatches, and inconsistent rule snapshots.
- Consumer tests enforce unique normalized manifest paths and digests and the
  WP7B bounds: 16 assets, 512 UTF-8 path bytes, 127 UTF-8 media-type bytes,
  2,097,152 bytes per asset, 33,554,432 aggregate bytes, 8,192 px per image
  dimension, and 33,554,432 image pixels.

## Validation

- Schema and example parsing tests.
- Semantic fixtures for veto branches, signal status, aggregate votes, missing
  content, partial decode, failed simulation, hash mismatch, missing event time
  or transaction, structured source, 5,000/6,000 rules, and each receipt/index
  identity stage.
- Standard repository checks.

## Review

Consumer schema reviewer, contract-event auditor, and producer representative.
Merge before work begins in `gov-apps-stats`.
