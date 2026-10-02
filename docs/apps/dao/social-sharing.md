# DAO social sharing

DAO pages provide Open Graph and Twitter metadata. The board and submission page use DAO copy. Proposal pages use the proposal title and a summary excerpt of at most 200 characters.

The excerpt uses the Summary section when present, including numbered headings such as `1. Summary`. Otherwise, it uses the first paragraph after the title. This keeps author attribution out of previews for existing proposals with a Summary section.

The server reads the existing `DAO_DATA_URL` feed. It validates the feed, configured deployments, content digest, canonical content bytes, and Markdown before it uses proposal text. It does not query a wallet, call an RPC endpoint, or follow links from a proposal.

A proposal identity contains the chain ID, Voting address, and proposal ID. Social URLs preserve this identity and omit the board navigation parameter (`from`). A bare proposal ID resolves only when the configuration contains one Voting deployment.

Metadata reads have a two-second deadline and the existing feed payload limit. Missing proposals, feed errors, and ambiguous identities use generic DAO copy. Invalid or unavailable proposal content uses the proposal number. None of these conditions prevents the proposal page from loading.

The DAO feature flag still controls route metadata. Disabled routes have no social metadata. Mock mode uses generic DAO copy and does not read the live feed.

## Image

`public/og-DAO.png` is a static 1200 × 630 image. It uses Yearn blue, the existing Yearn mark, and the same fonts and layout as the stYFI and veYFI cards. A static PNG works with social crawlers and adds no image renderer to the Worker. Proposal titles and summaries remain specific to each proposal.

To regenerate the card, run:

```fish
node scripts/generate-dao-social-image.mjs
```

The script uses the existing Playwright dependency and local fonts. It needs the Chromium browser that the project uses for browser tests.

## Hosts and indexing

Known production, preproduction, shared, and local hosts receive absolute social image URLs. Preproduction and local URLs stay on their current host. Only resolved production routes receive a canonical URL. Unresolved proposals do not claim a canonical identity.

All DAO pages retain `noindex, nofollow`. This change does not add DAO to the sitemap, indexable host list, or structured data. Unknown request hosts cannot set an external canonical URL.

## Review

1. Open the board and a proposal on the normal local or preproduction setup.
2. Inspect `og:title`, `og:description`, `og:url`, `og:image`, and the `twitter:*` metadata in the page source.
3. Check that the proposal URL includes its chain and Voting address.
4. Open `/og-DAO.png` and check the image dimensions and text.
5. Share the production proposal URL after deployment.

Social platforms can retain previous previews until they fetch the URL again.
