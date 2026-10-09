# Treasury compact tables

## Scope

Replace the initial text-heavy dashboard with compact financial tables. Keep the shared Yearn app styles and the existing feed contract.

## Acceptance

- The portfolio headline sits above the tabs and has greater visual emphasis.
- Holdings have token icons and address groups. Robo custody shares one group.
- Empty addresses do not create groups. Known balances below $100 remain collapsed and included in subtotals.
- Missing prices never imply zero. Unclassified tokens remain available in a separate disclosure.
- Loans show funding, measured current amounts, teams, and references. Expected-return fields do not appear. Supporting notes remain in expanded details.
- Details and closed positions remain accessible without dominating the initial view.
- Filters, YFI exclusion, stale data, and failed refresh behavior retain their accounting meaning.
- Tables support keyboard use, mobile widths, enlarged text, and the shared themes.
- Production exposure remains gated.

## Design references

[DeBank's ychad profile](https://debank.com/profile/0xFEB4acf3df3cDEA7399794D0869ef76A6EfAff52) uses compact token tables and small-balance disclosures.
[Yearn Vaults](https://yearn.fi/vaults) uses token icons, compact pills, numeric columns, and expandable rows.

The references guide presentation. Treasury values continue to come from the validated producer, not scraped profile totals.

## Integration

Base: frontend integration commit `b88a960f`. The UI does not require a schema change.

A parallel producer configuration update covers verified vaults missed by the initial asset configuration. The frontend must retain partial-valuation notices for unsupported positions.

Merge after the selector, component, browser, and independent review checks pass. Keep this package separate from production deployment.

## Accepted result

The accepted milestone is `integration/treasury-m1` in both repositories.
The producer code is commit `54aabad`. The frontend package starts from `b88a960f`.
Both changes merge into `agent/integration`. Production deployment remains separate.

The producer adds sixteen verified Yearn vault adapters and ten metadata-only identities.
Metadata-only identities retain unknown prices and withdrawal status. They do not receive an invented team assignment.
The shared schema and position registry remain unchanged.

The captured snapshot contains 370 holdings across fifteen accounts at Ethereum block **26,156,292**.
The dashboard combines those accounts into three address groups.
Fifty holdings have prices. Of 320 unpriced holdings, sixteen reviewed holdings remain visible in the main tables.
The remaining unpriced holdings stay available in a separate disclosure. They are not classified as spam or worthless.

The priced total is **$14,011,899.327771669675278035**.
The priced total excluding YFI is **$12,679,311.997652701726519648**.
Both totals remain partial. These are dated verification values, not current balance promises.

Snapshot SHA-256: `588fce28a00f385a6de0f8a2b13986f799d005cca97fb40feff2fea64ba4c16f`.

## Validation

| Check | Result |
| --- | --- |
| Typecheck and lint | Passed |
| Complete frontend unit suite | 1,862 tests passed across 176 files |
| Final display and component checks | 28 tests passed, including the added mobile precision case |
| Browser smoke suite | All 48 cases passed across the initial run and updated treasury rerun. One production-only case skipped. |
| Full browser suite | All 45 cases passed across the initial run and targeted rerun. |
| Mobile and accessibility checks | 320px, 390px, enlarged text, dark theme, keyboard access, and numeric fit passed |
| Actual producer through frontend API | Exact snapshot equality and both group subtotal reconciliations passed |
| Live browser acceptance | Address groups, loaded icons, YFI exclusion, tabs, pending funding, mobile widths, and retained data after 503 passed |
| Producer validation | 99 Rust tests, formatting, strict Clippy, packaging, and feed validation passed |
| Independent chain verification | 33 balances, 22 conversions, 22 USD valuations, and six oracle rounds matched the pinned evidence |
| Independent review | No remaining blocking findings |

The initial smoke run used two old treasury selectors. Both updated cases passed on rerun.
Four unchanged DAO and veYFI browser cases encountered navigation timing errors. All four passed on sequential rerun.
The initial full run found a treasury numeric-fit issue at 390px with enlarged text.
Reduced mobile cell padding corrected it. The affected test passed after the correction.

The [live browser record](evidence/compact-live-browser.json) records the final snapshot and acceptance checks.
The producer repository records pinned evidence in `docs/treasury/evidence/coverage-pinned-20261009.json` and `coverage-snapshot-20261009.json`.
The independent review covers accounting, metadata, links, attribution, missing values, and rollout gates. It is not a formal protocol audit.

## Integrator notes

The frontend accepts both the prior feed and the expanded producer coverage. There is no schema migration or required merge order.
Known balances below $100 stay in subtotals even when collapsed. The threshold uses values including YFI to keep the disclosure stable.
Mobile tables use compact precision. Expanded details and desktop rows retain the usual precision.
Expected-return fields do not appear in the UI. Supporting allocation notes remain in expanded details.
WBTC and unsupported LP or staking positions remain unpriced until a verified adapter supports them.

The local preview remains at `http://127.0.0.1:3339/treasury`.
It reads the captured snapshot from `http://127.0.0.1:3340/treasury.json`.
The local server does not acquire new chain snapshots. The dashboard marks the capture stale as it ages.
No remote publication, production deployment, or subdomain rollout occurred.
