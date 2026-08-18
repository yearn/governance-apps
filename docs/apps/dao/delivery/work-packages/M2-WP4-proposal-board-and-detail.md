# M2 WP4: Proposal Board and Detail

Branch: `agent/dao/m2/wp4`

## Objective

Build the complete read-only mock proposal list and detail experience.

## Depends on

- Accepted M1.

## Expected ownership

- DAO list, filters, proposal rows/cards, and detail components
- route-local read copy
- component and responsive E2E tests

## Scope

- Active, Upcoming, and Closed filters.
- Proposal identity, type, status, timing, author, vote bar, and discussion state.
- Immutable content, lifecycle, results, analysis states, and technical details.
- All terminal and content-failure fixtures.

## Non-goals

- No voting or lifecycle mutation.
- No proposal form.
- No feed or live reads.

## Acceptance criteria

- Status and timing scan clearly at phone and desktop widths.
- Percentages say `of votes cast`; no-quorum copy stays in rules.
- Passed signals display `Approved` and `No executable actions`.
- Missing content leaves the onchain record visible.
- Unknown calls and analysis provenance remain clear.
- Long scripts and addresses do not overflow the page.

## Validation

- Component coverage for every display state.
- Accessibility checks for filters, disclosures, and copy controls.
- Responsive E2E at required widths.
- Standard repository checks.

## Review

Frontend/UX reviewer and contract-state auditor. Integrate before WP5.
