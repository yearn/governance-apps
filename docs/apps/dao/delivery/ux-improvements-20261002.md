# DAO UX review — October 2, 2026

This change set improves authoring, proposal review, and social sharing. The user reviewed and accepted the local preview on `agent/fix`.

## Changes

| Before | After |
| --- | --- |
| Markdown errors referenced invisible line numbers. | A line-number gutter follows source lines, wrapped text, scrolling, and resizing in the shared live/mock editor. |
| Same-document links failed validation. | Links such as `#references` reach deterministic heading targets. Duplicate and Unicode headings work with keyboard navigation. |
| Every proposal used generic sharing text. | Validated titles and Summary sections supply Open Graph and Twitter text, with full proposal identity in URLs. |
| DAO had no sharing image. | A static 1200 × 630 Yearn card matches the existing application cards. A local script can regenerate it. |
| A large snapshot notice preceded the proposal. | A compact freshness disclosure sits inside the first card. Delayed updates and refresh failures remain visible. |
| Forum links carried repeated verification warnings. | Safe forum URLs appear as ordinary links on the board and proposal page. Submission validation remains intact. |
| The header repeated ID, status, and type. | Each fact appears once. Shorter content and lifecycle copy removes redundant explanations. |
| The board repeated the executable type. | One `Executable` badge identifies the type. Actual execution blockers retain their distinct warning. |
| Each script call repeated unknown contract, function, and source labels. | One explanation covers unavailable decoding. Each call retains its target, explorer link, and copy control. |
| Raw calldata expanded every call by default. | Each call has a disclosure for its selector and exact calldata, including calls with decoded metadata. |
| Undecoded calls appeared as warnings. | Neutral badges identify raw data. Failed decoding and script hash mismatches retain warnings. Theme tokens keep dark-mode badges quiet. |

## Findings

The live feed contains discussion URLs but no forum category ancestry. The previous UI interpreted absent ancestry as an unverified discussion.
Both current topics were public and had category ID 21 when checked. That category is an approved child of Proposals.

The script reader splits supported Executor bytes into targets and calldata. It does not obtain contract ABIs or explorer verification records.
Missing local decoding therefore does not establish whether a target contract has verified source. The change explains this distinction without inventing function names.

Both live proposals start with author attribution. Sharing descriptions prefer their `Summary` or `1. Summary` section instead of that first paragraph.
Metadata falls back safely on missing content or feed errors. Each metadata request has a two-second deadline.

## Validation

| Check | Result |
| --- | --- |
| TypeScript and ESLint | Passed |
| Unit and component suite | 174 files, 1,831 tests passed |
| Final board and script polish | 45 focused component tests passed |
| Smoke browser suite | 48 passed, one expected production-disabled scenario skipped |
| Final editor and forum browser checks | Three passed: line wrapping/scrolling/resizing, keyboard section links, and independent board controls |
| Full browser suite | 40 passed in the full run; one obsolete forum-warning assertion was updated and passed on a focused rerun |
| Production Next.js build | Passed |
| OpenNext Cloudflare build | Passed |
| Worker package dry run | 3,381.47 KiB compressed, within the repository budget |
| Documentation links | Passed |
| Live proposal walkthrough | Both proposals loaded; no browser page errors |
| Responsive review | No document overflow at 1280 × 900, 390 × 844, or 768 × 1024 |
| Social crawler response | Twitterbot received proposal metadata in the initial HTML head |

Independent agent reviews covered Markdown safety, script transparency, metadata, and proposal presentation. No blocking findings remain from those reviews.

Screenshots and observed metadata are in [the review evidence](evidence/ux-20261002/README.md).
The browser walkthrough uses the normal application routes and public feed. It needs no fork, copied proposal state, or production configuration edits.

## Review steps

1. Open proposal 0 in the local preview or preproduction application.
2. Expand its snapshot disclosure and compare its age with the exact UTC timestamp.
3. Open the forum link from the proposal and from its board row.
4. Inspect the ten script calls and expand `Call data`.
5. Open proposal 1 and inspect its sharing title and Summary excerpt.
6. In the mock authoring setup, enter a long paragraph and a link to `#references`.
7. Add `## References`, then open the link from Preview with the keyboard.

The existing [local development guide](../local-development.md) describes the mock and live setups.
The [social sharing guide](../social-sharing.md) describes metadata behavior and image regeneration.

## Integration notes

The work reuses the existing `agent/fix` checkout. The approved changes are committed for the user to push. The integration lane remains unchanged.
No new dependency, database migration, contract write path, publication provider, or deployment configuration is required.
The change adds no ABI registry or contract verification service. Social platforms can retain earlier previews until they fetch the URL again.
DAO feature gates and `noindex, nofollow` remain unchanged. No deployment or remote publication occurred during validation.
