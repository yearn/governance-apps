# M2 WP7B Evidence

Status: implementation and production-compiled evidence complete. Product
acceptance remains withheld.

## Package identity

- Branch: `agent/dao/m2/wp7b`
- Frozen base and merge-base:
  `4588a9806dd7002e3f5a1bb26bb098a1f7bf91d9`
- Starting documentation and scope tip:
  `51fab4bbc897b7424ff155f08871fda23ed0984a`
- Screenshot and compiled-proof source commit:
  `7145e6b5a4643cb975bdc1a0f67c524874261c7b`
- Evidence commit: the commit containing this ledger and its screenshots
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

Relative and direct attachment fixtures resolve to the same independent raw
asset block. Neither form treats the asset as a descendant of the content CID.

## Dependency and parser boundary

### Pre-implementation decision

The content-security audit approved four exact production dependencies. The
release dates below come from the package registry history; the linked upstream
repositories supplied the maintenance, compatibility, API, and change history.

| Direct package | Audited release | Why it is direct |
| --- | --- | --- |
| [`mdast-util-from-markdown@2.0.3`](https://github.com/syntax-tree/mdast-util-from-markdown) | 2026-02-21 | Parses CommonMark into MDAST and is imported by the domain parser. |
| [`micromark-extension-gfm-table@2.1.1`](https://github.com/micromark/micromark-extension-gfm-table) | 2025-01-20 | Adds only GFM table tokenization and is passed directly to the parser. |
| [`mdast-util-gfm-table@2.0.0`](https://github.com/syntax-tree/mdast-util-gfm-table) | 2023-07-10 | Converts table tokens to MDAST table nodes and is passed directly to the parser. Its current major remains in the upstream maintained compatibility line. |
| [`multiformats@14.0.5`](https://github.com/multiformats/js-multiformats) | 2026-07-23 | Parses and creates canonical CIDv1/raw/SHA-256/Base32 identifiers. |

The parser call is fixed to this configuration:

```ts
fromMarkdown(markdown, {
  extensions: [gfmTable()],
  mdastExtensions: [gfmTableFromMarkdown()],
});
```

There is no unified, remark, rehype, raw-HTML, autolink, footnote,
strikethrough, task-list, MDX, or sanitizer extension. CommonMark may tokenize
raw HTML as an `html` node; the domain validator rejects that node as
`RAW_HTML`, and the renderer has no HTML case or `dangerouslySetInnerHTML`.
The parser only identifies link and image targets. Trust is decided later by
the domain URL, CID, manifest, and standalone-attachment validators. Ordinary
links accept validated HTTPS, validated IPFS, or canonical root-relative app
paths. Images accept only exact authenticated manifest paths or canonical raw
asset CIDs.

### Complete lockfile inventory

The frozen-base JSON diff contains 40 new `packages` keys: 38 non-type paths
plus two type-package paths. The often quoted “38 added paths” omits those two
type entries. This table records every new key and why npm includes it.

| New lockfile path and version | Reason present |
| --- | --- |
| `node_modules/@types/mdast@4.0.4` | Transitive MDAST node shapes required by the parser and table packages. Application code uses its domain-owned AST type, so this is not a direct dev dependency. |
| `node_modules/@types/unist@3.0.3` | Transitive base-node and source-position shapes used by MDAST packages. |
| `node_modules/character-entities@2.0.2` | Named HTML character-reference data used during CommonMark token decoding. |
| `node_modules/decode-named-character-reference@1.3.0` | Decodes named character references for the parser. |
| `node_modules/devlop@1.1.0` | Small assertion helper used by the syntax-tree parser and table packages. |
| `node_modules/longest-streak@3.1.0` | Serializer formatting helper pulled by `mdast-util-to-markdown`. The application does not serialize Markdown with it. |
| `node_modules/markdown-table@3.0.4` | Table serializer pulled by the combined `mdast-util-gfm-table` package. The application uses only its parse extension. |
| `node_modules/mdast-util-from-markdown@2.0.3` | Direct CommonMark-to-MDAST parser. |
| `node_modules/mdast-util-gfm-table@2.0.0` | Direct GFM table MDAST extension; its package ships both parse and serialize support. |
| `node_modules/mdast-util-phrasing@4.1.0` | Identifies phrasing nodes for the transitive Markdown serializer. |
| `node_modules/mdast-util-to-markdown@2.1.2` | Serializer half pulled by `mdast-util-gfm-table`; not called by application code. |
| `node_modules/mdast-util-to-string@4.0.0` | Shared visible-text helper required by upstream MDAST utilities. |
| `node_modules/micromark@4.0.2` | CommonMark tokenizer engine used by `mdast-util-from-markdown`. |
| `node_modules/micromark-core-commonmark@2.0.3` | Core CommonMark constructs used by micromark. |
| `node_modules/micromark-extension-gfm-table@2.1.1` | Direct and only extra syntax extension. |
| `node_modules/micromark-factory-destination@2.0.1` | Token factory for CommonMark link and image destinations. |
| `node_modules/micromark-factory-label@2.0.1` | Token factory for link and image labels. |
| `node_modules/micromark-factory-space@2.0.1` | Token factory for bounded Markdown whitespace. |
| `node_modules/micromark-factory-title@2.0.1` | Token factory for CommonMark link titles. |
| `node_modules/micromark-factory-whitespace@2.0.1` | Token factory for line-prefix and container whitespace. |
| `node_modules/micromark-util-character@2.1.1` | Shared Markdown character classification. |
| `node_modules/micromark-util-chunked@2.0.1` | Handles token-array chunks without unsafe argument spreading. |
| `node_modules/micromark-util-classify-character@2.0.1` | Classifies characters around constructs and serializer escapes. |
| `node_modules/micromark-util-combine-extensions@2.0.1` | Combines CommonMark with the one table syntax extension. |
| `node_modules/micromark-util-decode-numeric-character-reference@2.0.2` | Decodes numeric character references. |
| `node_modules/micromark-util-decode-string@2.0.1` | Decodes Markdown escapes and character references. |
| `node_modules/micromark-util-encode@2.0.1` | Encodes unsafe characters for micromark output utilities. |
| `node_modules/micromark-util-html-tag-name@2.0.1` | Recognizes raw-HTML tag names so the AST can expose and the domain can reject them. |
| `node_modules/micromark-util-normalize-identifier@2.0.1` | Normalizes reference identifiers for CommonMark matching, not proposal source bytes. |
| `node_modules/micromark-util-resolve-all@2.0.1` | Runs construct token resolvers in deterministic order. |
| `node_modules/micromark-util-sanitize-uri@2.0.1` | Upstream URI output helper; it does not replace the DAO URL validator. |
| `node_modules/micromark-util-subtokenize@2.1.0` | Resolves nested content token streams. |
| `node_modules/micromark-util-symbol@2.0.1` | Shared tokenizer constants. |
| `node_modules/micromark-util-types@2.0.2` | Shared micromark TypeScript declarations. |
| `node_modules/uint8arrays/node_modules/multiformats@9.9.0` | Preserves the existing `uint8arrays@3.1.0` requirement on multiformats `^9.4.2` after the root dependency moves to 14.0.5. |
| `node_modules/unist-util-is@6.0.1` | Node predicate used by transitive MDAST serializer helpers. |
| `node_modules/unist-util-stringify-position@4.0.0` | Formats parser source positions for upstream diagnostics. |
| `node_modules/unist-util-visit@5.1.0` | Tree visitor pulled by the transitive Markdown serializer. |
| `node_modules/unist-util-visit-parents@6.0.2` | Parent-aware visitor used by `unist-util-visit`. |
| `node_modules/zwitch@2.0.4` | Node-type dispatch used by the transitive serializer. |

Three related lock changes are not new top-level keys. Root
`node_modules/multiformats` moves from 9.9.0 to the direct 14.0.5 pin. The
nested 9.9.0 entry above retains `uint8arrays` compatibility. Existing
`node_modules/dequal@2.0.3` loses its `dev` and `peer` flags because `devlop`
makes it production-reachable.

### Final dependency audit

On 2026-08-22, the corrected code and proof-harness tip `7145e6b` was checked
against frozen base `4588a98`:

- `npm run validate:deps` passed.
- `package-lock.json` SHA-256 is
  `a838fea95aa45d955053d172ca2f5b66ee966fb58788318f6a7053ac9eadfecc`.
- The JSON key diff reports 40 added paths, of which 38 are non-type paths.
- Enumerating every added entry reports zero `hasInstallScript` values. None of
  the 40 is marked dev, optional, peer, OS-specific, or CPU-specific.
- All new entries are MIT licensed except nested
  `multiformats@9.9.0`, which records `(Apache-2.0 AND MIT)`.

The complete final-tip validation sequence reruns `npm run validate:deps`; the
handoff records that same-tip result without changing this lockfile audit.

## Evidence-population checks

These checks ran before this evidence commit. The clean evidence-tip sequence
runs after the commit so its tested SHA does not change merely to record its own
result. The integrator handoff records that same-tip confirmation.

| Check | Result |
| --- | --- |
| `npm run validate:deps` | Passed at audit tip `184a36d` |
| Focused bounded-content Vitest | 43 passed |
| Focused link, renderer, and receipt Vitest | 79 passed |
| Focused authoring and proposal-detail Vitest | 44 passed |
| TypeScript and targeted ESLint | Passed |

The full lint, Vitest, smoke E2E, full E2E, build, and every exact focused
command remain subject to the clean evidence-tip confirmation. No result is
claimed here before it runs.

## Production-compiled proof

All three builds used `NODE_ENV=production`, the approved WP7A environment,
and these explicit public settings. Inline settings override the development
values in `.env.local`.

| Build | Runtime | DAO | Review controls | Global mocks | E2E controls | Debug UI | Simulation fallback | Build result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Enabled | `production` | true | false | false | false | false | false | Passed; compile 14.0 s, TypeScript 10.8 s |
| Evidence preview | `preview` | true | false | true | true | false | false | Passed; compile 7.1 s, TypeScript 10.9 s |
| Disabled | `production` | false | false | false | false | false | false | Passed; compile 6.3 s, TypeScript 10.9 s |

Each build used `npm run build`. Generated `.next/static` and `public` assets
were copied into the ignored standalone bundle, which started with:

```text
env HOSTNAME=127.0.0.1 PORT=<port> node .next/standalone/server.js
```

The common probe was:

```text
node --env-file=.env.local ./node_modules/@playwright/test/cli.js test tests/e2e/smoke/dao-wp7b-production-proof.spec.ts --project=smoke --workers=1
```

Each probe set `E2E_BASE_URL=http://127.0.0.1:<port>`,
`E2E_WEB_SERVER_COMMAND` to the standalone start command,
`E2E_REUSE_SERVER=false`, and
`E2E_WP7B_BUILD_SHA=7145e6b5a4643cb975bdc1a0f67c524874261c7b`.

| Run | Mode | Capture | Port | Result |
| --- | --- | ---: | ---: | --- |
| Enabled capture | `enabled` | true | 3440 | 1 passed, 2 mode skips, 13.9 s |
| Enabled confirmation | `enabled` | false | 3441 | 1 passed, 2 mode skips, 4.7 s |
| Mutable-state evidence | `preview` | true | 3442 | 1 passed, 2 mode skips, 10.8 s |
| Disabled proof 1 | `disabled` | false | 3443 | 1 passed, 2 mode skips, 1.7 s |
| Disabled proof 2 | `disabled` | false | 3444 | 1 passed, 2 mode skips, 1.6 s |

The enabled runs proved hydrated DAO root, authoring, detail, awaiting-index,
and indexed-created states. The receipt-derived reference stayed
`1:0x1111111111111111111111111111111111111111:4201` across indexing. The beta
root returned 200 with `noindex, nofollow`, retained the production CSP,
omitted a canonical link, and used clean beta-host paths.

The enabled harness recorded no console errors, page errors, automatic IPFS
requests, dead-loopback RPC requests, or `eth_accounts` requests. The disabled
runs proved GET and HEAD 404 responses, with no 5xx response, for `/dao`,
`/dao/propose`, and `/dao/proposals/2`; the beta root also returned 404 with
`noindex, nofollow`.

The preview build exists only to capture mutable authoring controls. Every
preview metadata row says `production-compiled preview evidence; E2E route
controls on`; none is presented as the production runtime.

## Screenshot ledger

The directory contains 11 PNGs and two typed metadata files:

- `screenshots/production-enabled-metadata.json` — 8 production-runtime rows
- `screenshots/preview-metadata.json` — 3 production-compiled preview rows

Every row binds to the compiled-proof source commit, records zero automatic
attachment requests, and reports `documentScrollWidth === documentClientWidth`.
Before each capture, the harness derives the recorded theme from the document
and requires `html[data-theme]` and the `dark` class to agree. All images were
then visually inspected for state accuracy, actual light or dark appearance,
focus context, clipping, and horizontal containment. In particular,
`rules-alternate-dark-390x844.png` is visibly dark and shows the alternate 60%
approval threshold.

| Image | Route and state | Viewport | Theme | Focus | Runtime |
| --- | --- | --- | --- | --- | --- |
| `awaiting-created-identity-dark-1280x600.png` | `/dao/proposals/4201`; created proposal awaiting index, exact identity visible | 1280×600 | Dark | Technical details summary | Production |
| `attachment-source-dark-768x1024.png` | `/dao/proposals/1`; no-load attachment and exact Markdown source | 768×1024 | Dark | Exact Markdown source region | Production |
| `lifecycle-flagged-dark-390x844.png` | `/dao/proposals/11`; operator-flagged proposal | 390×844 | Dark | None | Production |
| `lifecycle-early-veto-light-768x1024.png` | `/dao/proposals/12`; guardian veto before participation | 768×1024 | Light | None | Production |
| `lifecycle-post-veto-dark-1280x600.png` | `/dao/proposals/13`; guardian veto after participation | 1280×600 | Dark | None | Production |
| `rules-default-source-light-1280x900.png` | `/dao/proposals/2`; 50% rule and pinned Voting source | 1280×900 | Light | Proposal rules summary | Production |
| `rules-alternate-dark-390x844.png` | `/dao/proposals/7`; alternate 60% rule | 390×844 | Dark | Proposal rules summary | Production |
| `indexed-created-identity-light-1280x900.png` | `/dao/proposals/4201`; same indexed identity visible | 1280×900 | Light | Technical details summary | Production |
| `authoring-preview-error-light-390x844.png` | `/dao/propose`; Preview tab with deterministic structural errors | 390×844 | Light | Preview tab | Compiled preview |
| `awaiting-index-identity-dark-1280x600.png` | `/dao/propose`; receipt-confirmed identity awaiting indexing | 1280×600 | Dark | Proposal identity heading | Compiled preview |
| `indexed-created-actions-light-1280x900.png` | `/dao/propose`; same identity indexed with proposal actions | 1280×900 | Light | Proposal ready heading | Compiled preview |

## Known M2 limitations

- Created proposal overlays are browser-local mock state and do not survive a
  new session.
- The committed content and asset blocks are deterministic pre-pinned vectors.
  They do not prove real upload, pinning, retention, recovery, or provider
  credentials; M5 WP13 owns that work.
- Structured pinned source provenance proves decoder input, not deployment of
  a mock Voting address.
- Product acceptance remains withheld. This package does not authorize M3,
  tagging M2, pushing, deployment, backend or IPFS work, or onchain work.
