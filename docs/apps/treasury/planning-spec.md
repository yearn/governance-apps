# Treasury MVP: implementation specification

## Outcome and release boundary

Build a read-only treasury dashboard at /treasury. Deliver reviewed integration builds for local and preproduction testing.
Do not publish a production release or create a treasury subdomain in this milestone.
Use the DAO, stYFI, veYFI, Teams and YBC design family and shared UI primitives.

Portfolio is the default view. Loans & allocations is the second view. Closed positions appear in compact history.
Show position names and accountable teams. Keep legacy research IDs out of public views and feed records.
Full Robo auction history, transaction writes, performance history, runway, liabilities and alerts are excluded.

## Ownership and scope

The reviewed registry assigns all 12 active or pending research positions to four accountable teams.
Accountability does not change the counterparty, custodian or beneficial owner.
Team registry references can remain null until a verified mapping exists. Do not invent on-chain team identifiers.

Portfolio scope is Ethereum: ychad.eth, treasury.ychad.eth, the Robo destination, and attributable Robo conversion inventory.
Balances held by external allocation counterparties are not portfolio balances.
Known cross-chain allocations remain listed with their return terms. Live cross-chain position breakdowns are deferred.
Resolve scope addresses at the pinned snapshot and verify expected ownership or recipient rules for discovered Robo accounts.
Do not count GenericBucket reserve getters separately from the destination treasury balances.

## UI and accounting

Show snapshot age, Ethereum block, coverage and source state. Distinguish fixture, live, stale, loading, unavailable and retained-last-good states.
Provide an account filter and accountable-team filter. Show balances, underlying quotes, purpose and withdrawal conditions.
Show producer-supplied priced portfolio value with and without YFI exposure. Label incomplete valuation as partial.
Do not call an incomplete priced subtotal a complete treasury total. Do not call strategic holdings spendable cash.
Never add expected returns or outstanding claims to the portfolio headline.
Count one custody balance per account and token. An underlying quote explains a receipt; it is not a second holding.
Do not assume stablecoins equal one dollar. Price only verified adapters with fresh observations.
If a YFI component cannot be separated, leave its excluding-YFI value unknown and disclose that coverage gap.

Each allocation shows its kind, accountable team, counterparty, original funding, expected return and observed outstanding amount.
Preserve C06's provisional return target as 33 YFI plus 61 WETH. Do not attribute the full mixed Aerodrome LP to treasury.
Sherlock's original funding is not a verified current refundable amount.
YBC's original 200 YFI allocation is returnable through a YIP. The full YBC balance includes other funds.
Only unmatched veYFI reserve funds remain recoverable.
Pending Stonk funding is not outstanding debt. Verify execution before changing that classification.

History preserves settled, written-off, excluded and unfunded distinctions with one-line notes and evidence links.
The user settled R02, R03 and T02 after reviewing the research. Keep attribution limits in research records.
Do not reopen these cases merely because their historical settlement was not entirely cash.

## Feed contract

The canonical wire schema is feed.schema.json. The example is explicitly a fixture, never a live fallback.
All token units use unsigned integer strings and explicit decimals. USD values use lossless nonnegative decimal strings.
All objects are bounded. The public feed has a maximum size of 2 MiB.
Top-level timestamps are Unix seconds. The confirmed snapshot block pins balances, conversions and oracle reads.
The registry revision is SHA-256 of the exact registry file bytes. It identifies curated metadata separately from live observations.
research-decisions.json preserves research aliases, decision dates, evidence dates and sources. It is not part of the public feed.
The target interval is 900 seconds. The consumer marks a snapshot stale after 2700 seconds using observation time.
An RPC or required discovery failure must not replace a valid published snapshot.
An unsupported readable asset remains visible with an unknown valuation.
Unreadable unsolicited tokens can be omitted with an explicit coverage warning. Required registered balances must succeed. Unsupported pricing is a documented coverage gap, not zero value.
No credentials, raw RPC errors or internal deployment paths belong in public JSON.

The producer computes summary values. The consumer checks schema, references and arithmetic consistency, then formats values.
Holding IDs and allocation IDs remain stable across team/name changes. Account addresses are unique.
Every holding references one account and at most one known team. Allocation team references must exist.
Unavailable valuation requires null values, source and observation time. Valid excluding-YFI value cannot exceed its full value.
Summary counts and sums must match holdings. Unpriced count means null full USD value.
Unknown YFI split count includes priced holdings with null excluding-YFI value. Each subtotal sums only known values. If no positive holding can be priced, priced summary value is null.
If there are no holdings, both summary values are zero. Pending allocations have no observed outstanding amount.
Closed history is not an outstanding allocation. Native assets use a null token address.

## Producer and publication

Add gov-apps-treasury beside gov-apps-dao in gov-apps-stats. Preserve existing producer behavior.
Use existing HTTP/IPC transport and R2 publication infrastructure. Keep treasury state and object keys separate.
Use a reviewed token/price/vault adapter configuration plus bounded inventory discovery and a persistent known-token set.
Report the discovery method and its coverage limits. Do not advertise an exhaustive on-chain audit.
Read Resupply debt, LQTY stake, matching reserve and OTC balances at the snapshot block.
Publish curated return terms independently from measured balances. Never invent unknown claim values.
Support local output without publication for tests. Publishing requires an explicit invocation and configured credentials.
Validate complete bytes before atomic local replacement and conditional stable-object publication.
Reject older or conflicting concurrent snapshots. Preserve the last valid snapshot on failed cycles.

## Work packages and review

WP0: lead owns the specification, registry, wire schema, fixture and consumer schema validation.
WP1: frontend agent owns route, domain client, mock states, same-origin API, filters, UI and route tests.
WP2: producer agent owns registry loading, RPC adapters, discovery, valuation, snapshot generation, publication and producer tests.
WP3: independent reviewer checks data correctness, unsafe metadata, publication integrity and scope boundaries.
The lead owns cross-repo contract tests, integration, visual checks and the testing handoff.
Coordinate schema changes before implementation. Keep each work package in its assigned worktree.
Merge accepted commits into each repository's agent/integration branch. Do not change the primary checkout.

## Acceptance criteria

- The route works without a connected wallet and uses shared application styling.
- Every agreed open or pending allocation has the correct accountable team and financial classification.
- Production exposure is off unless the treasury feature flag is enabled. No treasury subdomain is introduced.
- Mock states are deterministic and clearly identified. Live failure never selects demo data.
- Unknown prices and entitlements remain unknown. Retained data retains its original observation time.
- A real producer snapshot passes consumer validation and renders through the same-origin API.
- Raw amounts, vault quotes and YFI exclusion agree with independent snapshot-pinned checks for representative positions.
- Receipt assets, underlying quotes, allocation custody and Robo reserves are not counted twice.
- Required frontend checks, browser tests and Rust checks pass, or a reproducible pre-existing blocker is documented.
- Independent review findings are resolved or recorded with a clear testing limitation.
- The handoff names both integration commits, setup instructions, validation evidence and remaining operational steps.
