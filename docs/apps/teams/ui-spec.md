# Team Finances UI Spec

Status: UX command-center overhaul in implementation
Applies to: `/teams` route, `teams-beta.dao-ops.com` beta host, and gated
production host `teams.yearn.fi`
App key / slug: `teams`
Route key: `/teams`
Display label: `Team Finances`

## 1. Why `teams` is the app key

`teams` is the best durable app key because the surface is team-centric and lifecycle-centric.

Rejected as primary route keys:

- `accounting` — too narrow once registry, funding, bonus, and admin views exist
- `budget` — too narrow because revenue and bonus are first-class
- `pnl` — too narrow and too jargon-heavy

## 2. Primary personas

### Team owner
Needs:
- team overview
- claim funding
- return funding visibility
- claim bonus
- owner transfer visibility

### Team contributor / finance operator
Needs:
- deposit revenue on behalf of a team
- understand conversion / credited USD value
- inspect recent reporting history

### Protocol operator / admin
Needs:
- registry overview
- approval / funding operations
- revenue bucket operations
- bonus period finalization
- oracle / converter / split configuration visibility

## 3. Route structure

Approved initial route structure:

```text
/teams
  page.tsx
  TeamsPageClient.tsx
  messages.ts
  components/
    TeamsDirectory.tsx
    TeamWorkspace.tsx
    TeamOverviewCard.tsx
    RevenueDepositCard.tsx
    FundingApprovalsTable.tsx
    BonusCard.tsx
    TeamLifecycleCard.tsx
    AdminConsole.tsx
```

## 4. Information architecture

The default landing state is a table-first directory. It prioritizes fast comparison
across teams, while keeping a Cards view behind an explicit view toggle. The selected
view is saved in local storage.

Design alignment follows the root `DESIGN.md` product baseline. Teams should feel like
the same governance app family as `/styfi`, `/veyfi`, and `/yeth`: restrained neutral
surfaces, 8px cards and controls, compact tabular numbers, persistent blocked-state
copy, and no decorative dashboard tropes. The command-center layout is domain-specific;
the visual language is shared.

Approved top-level structure:

1. Directory table by default, with Cards available as a saved preference.
2. Selected team workspace rendered as a single flattened command center.
3. Admin, shown only for operator/admin contexts and kept outside the team workspace.

The selected workspace no longer hides core workflows behind workspace tabs. It renders
an overview header, an action deck, and the full ledger/audit sections as scroll targets
on one page. Existing deep links such as `#revenue`, `#funding`, `#bonus`, `#lifecycle`,
and `#admin` must scroll to the matching section and keep that section reachable.

## 4.1 Directory layer

Landing directory cards should show:

- team name
- address
- owner
- status: active / retiring / retired
- scoped revenue
- scoped cost
- scoped profit / loss
- all-time revenue, cost, and net context
- primary action: open workspace
- secondary context: whether revenue, funding, bonus, or lifecycle work needs attention

The Table view must stay reachable for reviewers, operators, and test automation.
Table rows and the explicit row action both open the selected-team workspace.

### Financial scope controls

The directory must make the financial scope explicit because protocol accounting spans
multiple budget periods and all-time lifetime state.

Approved directory financial scopes:

- **Current period**: default. Shows `team.currentPeriod` values for operational review.
- **Historical period**: shows one selected historical period across all teams. Historical
  periods render as direct period tabs populated from `team.financialPeriods[].period`
  and should default to the most recent non-current period when one exists.
- **All-time**: shows `team.lifetime` values for cumulative review.

Rules:

- Revenue, cost, and net must always use the same selected scope within a row/card.
- Current-period values must remain the default so launch operations do not lose the
  period-sensitive funding and bonus context.
- Scope selection must use one tabbed control: current period on the left, historical
  period tabs in the horizontally scrollable middle, and all-time pinned on the right.
- Cards and Table must use the same selected scope.
- Cards should also retain compact all-time context so a current-period loss does
  not hide lifetime performance.
- Historical period tabs should be hidden when no non-current periods are available.
- Missing values for a selected historical period should render as unavailable, not as
  real zero financials.
- Labels must include the active scope, for example `Current period #2 financials`,
  `Period #1 financials`, or `All-time financials`.
- The frontend must not reconstruct history from browser-side log scans. Feed-backed
  history comes from `teams.json`; mock-backed history comes from the mock data contract
  and runtime normalization.

## 4.2 Team workspace

The workspace should render:

1. Overview header with current-period and lifetime context.
2. Financial history table with period, dates, revenue, cost, and profit/loss rows.
3. Action deck that makes the next useful actions obvious.
4. Revenue section, including the permissionless deposit flow and revenue ledger.
5. Outflows & Yield section that groups funding and bonus actions without blending their
   protocol meanings.
6. Lifecycle section with ownership, retirement, and migration visibility.
7. Audit ledgers for revenue, funding, bonus, and lifecycle, each reachable by stable ids.

Admin is intentionally not nested inside the workspace. It remains a separate
operator/admin surface so privileged review does not compete with team-owner tasks.

The financial history table is read-only audit context. Each row represents one
`TeamFinancialPeriod` entry from the domain model:

- `period`
- `startsAt` / `endsAt`, shown as a UTC date range when available
- `financials.revenueUsd`
- `financials.costUsd`
- profit/loss derived from `financials.profitUsd` / `financials.lossUsd`

The current period row may be marked, but historical and all-time values must not alter
write eligibility. Funding, revenue deposit, return, and bonus write readiness continue
to derive from raw protocol state, wallet state, current chain, and simulation.

## 4.3 Debug-backed route coverage

The route-local prototype controls used during the early mock phase are retired. Teams
now seeds review coverage through the shared floating debug panel and the shared E2E
bridge so the default `/teams` route can keep production-like copy and navigation.

The accepted debug-backed route must keep explicit state coverage for:

- populated directory with multiple teams
- selected team overview with current-period and lifetime cards
- revenue deposit preview, validation, and recent history
- funding approvals table with claim and return selection state
- claim and return validation plus success feedback
- bonus summary with period drilldown and hidden math detail
- ownership and status state with owner, pending owner, retirement, and migration visibility
- operator/admin console loading and empty states once operator/admin access is active
- loading state
- empty state

The debug-backed controls should apply coherently across the whole route:

- loading and empty controls blank the stat strip as well as the directory/workspace panes
- preset changes revert the workspace to that preset's declared selected team
- preset changes also reset any staged mock bonus action to the target fixture default
- bonus math stays out of the default view until the period drilldown or tooltip is opened
- bonus and ownership/lifecycle section anchors remain present across selected, loading, empty, and no-team states
- admin navigation and the admin console appear only in the operator/admin runtime
- when operator/admin access is active, loading and empty controls keep the admin section mounted with explicit state copy
- the floating debug panel must be viewport-bounded and scrollable, with long Teams
  control groups hidden behind disclosures so UAT controls do not clip or dominate the
  product route

## 5. Must-show interactions

All blocked action CTAs must explain the blocked state in the button text and in
persistent accessible copy next to the action. Tooltip-only explanations are not enough.

## 5.1 Deposit Revenue

Key UX rules:
- permissionless action
- preview token conversion if naked token auto-converts into a vault token
- show estimated accountant credit in USD
- explain that the credit may differ from nominal token count because of conversion / pricing

### Suggested UI block

- token selector
- amount input
- conversion line
- estimated credit line
- submit CTA
- recent deposits list

## 5.2 Funding Claim

Per approval row, show:

- approval id
- approved period
- token
- total approved
- used
- claimable now
- recipient
- stream / liquid status

Statuses to visualize:
- claimable this period
- partially claimed
- late claim / fully liquid
- not claimable this period
- fully used

The accepted WP4 prototype implements this as a mock approvals table plus a separate
claim form that can be pointed at a selected approval row. Each row keeps the token
symbol and total approved amount visible next to used and claimable balances so the
remaining budget can be compared at a glance.

Funding approval context must stay visible near claim actions, especially when a claim
is blocked or no longer stream-backed.

## 5.3 Return Funding

This should be described as a return flow, not as an owner-only reverse claim flow.

Expose:
- token amount input
- refund estimate in USD
- note that refund accounting uses historical average claim price

The accepted WP4 prototype keeps this as a distinct mock return card rather than
blending it into the claim flow.

## 5.4 Bonus

Keep the default presentation simple:

- total claimable bonus
- period count included
- primary CTA
- short detail rows

For the WP5 prototype, the primary CTA is a mock `Claim Bonus` action. It should be
visibly available in claimable states, visibly blocked in non-claimable states, and
must not imply that a live write has been submitted yet.

Hide the heavier math in expandable details or tooltip copy:
- team profit
- spot price
- adjusted bonus price
- growth factor / cap note
- YBC split

## 5.5 Lifecycle

Show:
- owner
- pending owner
- retirement state
- migration readiness
- successor registry if relevant

## 6. Admin console

Admin is a separate surface within the app, not the default landing state.

In the accepted debug-backed route, the admin console unlocks only in the
`Operator/admin view` preset or equivalent operator/admin runtime state and remains
hidden from the default team-owner, observer, and contributor workspaces. The
unlocked view should keep four groups distinct:

- registry state with lifecycle, retirement, migration, and workspace-readiness context
- revenue ops with bucket usage and whitelisted token wiring
- funding ops with approval queue summaries and operator-attention markers
- bonus ops with finalization readiness and historical period visibility

Approved admin groups:

### Registry
- teams list
- retirements
- successor / migration state

### Revenue ops
- whitelisted tokens
- price oracles
- converters
- rewards / treasury / recovery bucket budgets and usage

### Funding ops
- approvals list
- claim/refund history
- token pricing / vesting metadata

### Bonus ops
- period finalization queue
- growth cap / smoothing / split config
- price source visibility

## 7. Mock-first scenario set

These scenarios remain the seed contract for the mock data model, but the debug-backed
runtime now exposes them as hidden debug presets and granular bridge setters instead
of page-local hero controls.

Required mock scenarios:

1. active team with no approvals yet
2. active team with partially used approval
3. late claim that is fully liquid
4. team with bonus available
5. retiring / retired team in read-only view
6. admin view with bucket usage near limits

## 8. Copy posture

Prefer:
- `Team Finances`
- `Deposit Revenue`
- `Claim Funding`
- `Return Funding`
- `Claim Bonus`
- `Current Budget Period`

Avoid:
- overly accounting-heavy jargon as the only terminology
- implying vest claim management is handled in this app
- implying revenue deposits are owner-only
