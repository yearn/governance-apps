# Team Finances UI Spec

Status: WP8 production-parity UI and debug controls accepted
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

The default landing state is the directory layer. A user opens a team workspace from
the directory, then uses the workspace sections for more focused operational tasks.

Approved top-level shell sections:

1. Team directory
2. Team workspace overview
3. Revenue
4. Funding
5. Bonus
6. Ownership & lifecycle
7. Admin, shown only for operator/admin contexts

## 4.1 Directory layer

Landing directory should show:

- team name
- address
- owner
- status: active / retiring / retired
- current-period revenue
- current-period cost
- current-period profit / loss
- quick action: open workspace
- quick action: deposit revenue

## 4.2 Team workspace

Sections / tabs:

1. Overview
2. Revenue
3. Funding
4. Bonus
5. Ownership & Lifecycle
6. Admin (conditional)

## 4.3 Debug-backed route coverage

The route-local prototype controls used during the early mock phase are retired. Teams
now seeds review coverage through the shared floating debug panel and the shared E2E
bridge so the default `/teams` route can keep production-like copy and navigation.

The accepted debug-backed route must keep explicit state coverage for:

- populated directory with multiple teams
- selected workspace overview with current-period and lifetime cards
- revenue deposit preview, validation, and recent history
- funding approvals table with claim and return selection state
- claim and return validation plus success feedback
- bonus summary with period drilldown and hidden math detail
- ownership and lifecycle state with owner, pending owner, retirement, and migration visibility
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

## 5. Must-show interactions

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
