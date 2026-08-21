# M2 WP7B Evidence

Status: implementation evidence in progress. A check is recorded as passed only
after it runs on the final clean package tip.

## Package identity

- Branch: `agent/dao/m2/wp7b`
- Frozen base and merge-base: `4588a9806dd7002e3f5a1bb26bb098a1f7bf91d9`
- Starting documentation/scope tip:
  `51fab4bbc897b7424ff155f08871fda23ed0984a`
- Final package tip: recorded after the final evidence commit
- Product gate: not accepted

## Frozen content and asset vectors

- Wire schema: `yearn.dao.proposal.v1`
- Canonical content bytes:
  `docs/apps/dao/examples/proposal-content.example.json`, including its final
  LF
- Content digest:
  `0x3c67b58a3ea4c8fd5d6c9a56dfa7322853967b4b85c700c4592e3cf68bb2f867`
- Content CID:
  `bafkreib4m62yupvezd6v23e2k3p2omrikolhws4fy4amiwjoht3ixmxym4`
- Raw asset bytes:
  `docs/apps/dao/examples/assets/governance-flow.svg`
- Asset byte length: 660
- Asset digest:
  `0x63786be28dedc9bab6de44a52c8124dc237dfc650e203779da5a03aed873a209`
- Asset CID:
  `bafkreiddpbv6fdpnzg5lnxseuuwicjg4en67yzioea3xtws2aoxnq45cbe`
- Asset metadata: `image/svg+xml`, 1,280 by 720

Relative and direct attachment fixtures resolve this same independent raw asset
block. Neither form treats the asset as a descendant of the content CID.

## Dependency and parser boundary

Production dependencies are pinned exactly:

- `mdast-util-from-markdown@2.0.3`
- `micromark-extension-gfm-table@2.1.1`
- `mdast-util-gfm-table@2.0.0`
- `multiformats@14.0.5`

The parser enables CommonMark and GFM tables only. It rejects raw HTML and every
unsupported AST node. Rendering never uses `dangerouslySetInnerHTML`.
`validate:deps` and the final lockfile/install-script review are recorded in
the final validation ledger below.

## Completed implementation checks

These checks ran before the final evidence pass:

| Check | Result |
| --- | --- |
| Widened focused Vitest, 16 files | 243 passed |
| Authoring Playwright smoke | 9 passed |
| TypeScript typecheck | Passed |
| Scoped ESLint | Passed |
| Diff whitespace check | Passed |

These are implementation checkpoints, not substitutes for the final-tip gates.

## Production proof ledger

The final pass records the exact build SHA, environment booleans, start and
probe commands, port, GET/HEAD results, console output, network requests, focus,
request count, and overflow measurements for both builds:

| Build | Required result | Final result |
| --- | --- | --- |
| DAO enabled | Root, authoring, pending-created, indexed-created, and detail hydrate; beta metadata stays noncanonical/noindex; no dead-loopback request or console error | Not run on final tip |
| DAO disabled | DAO root, authoring, and detail GET/HEAD return 404 | Not run on final tip |

## Screenshot ledger

Fresh screenshots must come from the production-compiled DAO-enabled proof.
Each final row records route, fixture, runtime, viewport, theme, focused element,
reduced-motion setting, root text scale, attachment request count, document
client width, and document scroll width.

| Image | Required state | Viewport/theme | Final metadata |
| --- | --- | --- | --- |
| Authoring Write/Preview | Exact Markdown and structural error recovery | 390×844 light | Not captured |
| Attachment/source | No-load card and exact-source disclosure | 768×1024 dark | Not captured |
| Receipt/index seam | Hash-known or awaiting-index with stable identity | 1280×600 dark | Not captured |
| Indexed proposal | Same identity with Open/Copy actions | 1280×900 light | Not captured |
| Lifecycle/provenance | Flagged and both veto branches | Review matrix | Not captured |
| Rules/source | Exact pinned source and 50%/60% snapshots | Review matrix | Not captured |

## Final validation ledger

The final clean-tip pass records counts and exact outcomes for:

- dependency validation;
- the two focused Vitest commands;
- focused smoke and full Playwright commands;
- interface context and detection audits;
- banned-prose and diff checks;
- typecheck, lint, full Vitest, smoke E2E, full E2E, and build;
- two production-compiled DAO-enabled proofs and two DAO-disabled proofs.

No unrun command is reported as passing.

## Known M2 limitations

- Created proposal overlays are browser-local mock state and do not survive a
  new session.
- The committed content and asset blocks are deterministic pre-pinned vectors.
  They do not prove real upload, pinning, retention, recovery, or provider
  credentials; M5 WP13 owns that work.
- Structured pinned source provenance proves decoder input, not deployment of a
  mock Voting address.
- Product acceptance remains withheld. This package does not authorize M3,
  tagging M2, pushing, deployment, backend/IPFS work, or onchain work.
