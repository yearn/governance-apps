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
  `184429ab1d40d063a157f553d69432e0690104a7`
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

Production dependencies are pinned exactly:

- `mdast-util-from-markdown@2.0.3`
- `micromark-extension-gfm-table@2.1.1`
- `mdast-util-gfm-table@2.0.0`
- `multiformats@14.0.5`

The parser enables CommonMark and GFM tables only. It rejects raw HTML and
every unsupported AST node. Rendering never uses `dangerouslySetInnerHTML`.
`npm run validate:deps` passed, and the lockfile contains no unexpected install
scripts from the four additions.

## Evidence-population checks

These checks ran before this evidence commit. The clean evidence-tip sequence
runs after the commit so its tested SHA does not change merely to record its own
result. The integrator handoff records that same-tip confirmation.

| Check | Result |
| --- | --- |
| `npm run validate:deps` | Passed |
| Focused content/domain Vitest, 6 files | 136 passed |
| Focused component/hook Vitest, 6 files | 77 passed |
| Focused smoke Playwright | 23 passed, 2 environment-mode skips |
| Focused full Playwright | 32 passed |
| Impeccable context audit | Passed; `PRODUCT.md` and `DESIGN.md` resolved |
| Impeccable detection audit | Passed with `[]` after the blockquote side stripe was removed |
| Banned-prose scan | No matches |
| Frozen-base `git diff --check` | Passed |
| TypeScript and focused ESLint | Passed |

The full lint, Vitest, smoke E2E, full E2E, build, and every exact focused
command remain subject to the clean evidence-tip confirmation. No result is
claimed here before it runs.

## Production-compiled proof

All three builds used `NODE_ENV=production`, the approved WP7A environment,
and these explicit public settings. Inline settings override the development
values in `.env.local`.

| Build | Runtime | DAO | Review controls | Global mocks | E2E controls | Debug UI | Simulation fallback | Build result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Enabled | `production` | true | false | false | false | false | false | Passed; compile 5.6 s, TypeScript 10.6 s |
| Evidence preview | `preview` | true | false | true | true | false | false | Passed; compile 5.9 s, TypeScript 10.5 s |
| Disabled | `production` | false | false | false | false | false | false | Passed; compile 5.9 s, TypeScript 10.6 s |

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
`E2E_WP7B_BUILD_SHA=184429ab1d40d063a157f553d69432e0690104a7`.

| Run | Mode | Capture | Port | Result |
| --- | --- | ---: | ---: | --- |
| Enabled capture | `enabled` | true | 3430 | 1 passed, 2 mode skips, 13.4 s |
| Enabled confirmation | `enabled` | false | 3431 | 1 passed, 2 mode skips, 4.5 s |
| Mutable-state evidence | `preview` | true | 3432 | 1 passed, 2 mode skips, 10.6 s |
| Disabled proof 1 | `disabled` | false | 3433 | 1 passed, 2 mode skips, 1.7 s |
| Disabled proof 2 | `disabled` | false | 3434 | 1 passed, 2 mode skips, 1.6 s |

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
All images were visually inspected for state accuracy, focus context, clipping,
and horizontal containment.

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
