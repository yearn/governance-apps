# Team Financial Reporting Scope Spec

Status: implemented for feed-backed and mock-backed Teams reads
Applies to: `/teams` directory and selected team workspace

## Objective

Make Teams financial reporting auditable across current-period, historical-period, and
all-time scopes without mixing values from different periods in the same row or card.

This solves the case where current-period costs are present but revenue was submitted
for earlier periods. The directory should remain operational by default, while the
historical and lifetime views should be one interaction away.

## Data Model

The Teams domain model exposes three financial scopes:

- `team.currentPeriod`: the active budget period selected by the feed/runtime.
- `team.financialPeriods[]`: period-level financial rows sorted newest first.
- `team.lifetime`: all-time team financials.

Each period row contains:

- `period`
- `startsAt`
- `endsAt`
- `financials.revenueUsd`
- `financials.costUsd`
- `financials.profitUsd`
- `financials.lossUsd`

Feed mode maps `team.financialPeriods[]` from `teams.json` `teams[].periods`.
Mock mode keeps fixture rows in `mock-data.example.json` and normalizes missing rows to
a current-period fallback.

## Directory Behavior

The directory defaults to current-period financials.

Available scopes:

- Current period: `team.currentPeriod`
- Historical period: selected `team.financialPeriods[].financials`
- All-time: `team.lifetime`

The selected scope affects both Cards and Table.

Rules:

- Revenue, cost, and net must always use the same scope.
- The directory uses a single tabbed scope control: current period on the left,
  historical period tabs in a horizontally scrollable middle segment, and all-time
  pinned on the right.
- Historical period tabs select one period across every team.
- Historical period tabs are only offered when at least one non-current period is
  available.
- Missing team data for a selected historical period renders unavailable values rather
  than falling back to another period or showing real zero financials.
- Cards retain compact all-time context even when the selected scope is current
  or historical.
- Table rows show the selected scope above the table.

## Workspace Behavior

The workspace keeps the existing current-period and lifetime overview cards.

Below those cards, the workspace renders a read-only financial history table:

- Period
- Dates
- Revenue
- Cost
- Profit / Loss

The current period row is marked when it appears in history.

## Non-Goals

- No browser-side historical log indexing.
- No changes to write eligibility.
- No changes to `teams.json` schema v1, because the feed already contains
  `teams[].periods` and `teams[].lifetime`.
- No aggregation of mixed scopes, such as lifetime revenue with current-period cost.

## Acceptance Criteria

- Directory Cards and Table can show current-period, selected-period, and
  all-time financials.
- Workspace exposes period financial history for the selected team.
- Feed-backed mapper preserves all feed period rows in the domain model.
- Mock fixtures and runtime expose compatible period rows.
- Tests cover feed mapping, feed-backed directory scope switching, workspace history,
  and mock fixture shape.
