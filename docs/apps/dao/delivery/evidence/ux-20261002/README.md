# DAO UX review evidence

The screenshots show the local production build with public data from [the DAO feed](https://data.dao-ops.com/prod/dao.json).
Publication was disabled, and the wallet stayed disconnected.

| View | Capture |
| --- | --- |
| Proposal header, desktop | [Screenshot](desktop-proposal.png) |
| Proposal header, phone | [Screenshot](mobile-proposal.png) |
| Script calls, dark tablet | [Screenshot](tablet-dark-script.png) |
| Proposal board, desktop | [Screenshot](desktop-board.png) |
| Markdown editor, desktop | [Screenshot](desktop-editor.png) |
| Markdown editor, phone | [Screenshot](mobile-editor.png) |
| Browser observations and metadata | [Results](results.json) |

The editor captures use the existing mock authoring setup with sample text. Its debug controls do not appear in production.

Public forum checks found both current topics visible in category 21:

- [Extend stYFI reward expiry periods](https://gov.yearn.fi/t/proposal-extend-styfi-reward-expiry-periods/14699)
- [Discretionary Fund: On-chain accounting](https://gov.yearn.fi/t/proposal-discretionary-fund-on-chain-accounting/14701)

The metadata check used both live proposals and the actual server reader. A separate Twitterbot request received the same fields in the initial HTML head.
The full implementation and validation record is in [the review notes](../../ux-improvements-20261002.md).
