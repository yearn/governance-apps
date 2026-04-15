# Team Finances Planning Spec

## 1. Canonical naming

- app name / slug: `teams`
- route key: `/teams`
- display label: `Team Finances`
- initial beta exposure: `teams-beta.dao-ops.com` with mock / dummy data
- production host: `teams.yearn.fi` (gated until live contract wiring and production approval)

## 2. MVP scope

Included:
- team directory
- team workspace overview
- revenue deposit interaction with conversion preview
- funding claim / return interaction
- bonus visibility and claim
- lifecycle state
- admin overview panels

Out of scope for MVP:
- vest claim management after initial funding claim
- exhaustive low-level admin setters as first-class UX
- generic governance transaction builders

## 3. Data strategy

### Mock phase
Use `docs/apps/teams/mock-data-schema-v1.md` and the example JSON as the source of truth.

### Onchain phase
Plan for:
- read-only team directory and workspace data first
- wallet-specific writes only after read model is stable
- historical price rendering supplied by indexer / feed, not inferred ad hoc in UI

## 4. Approved route shell and file layout

The initial `/teams` route lands on the team directory. From there, users open a
team workspace whose sections are:

1. Overview
2. Revenue
3. Funding
4. Bonus
5. Ownership & lifecycle
6. Admin, shown only for operator/admin contexts

Approved file layout:

```text
app/teams/
  page.tsx
  TeamsPageClient.tsx
  messages.ts
  components/
    TeamsDirectory.tsx
    TeamWorkspace.tsx
    RevenueDepositCard.tsx
    FundingApprovalsTable.tsx
    BonusCard.tsx
    TeamLifecycleCard.tsx
    AdminConsole.tsx

lib/clients/teams/
  types.ts
  client.ts
  mock.ts
  onchain.ts
  index.ts

lib/hooks/
  useTeams.ts
```

## 5. Milestone outcomes

### M1
Static mock-backed surface accepted.

### M2
Interactive mock flows accepted.

### M3
Onchain reads work on fork.

### M4
Onchain writes work on fork.

### M5
UAT and preprod accepted.

### M6
Controlled production rollout approved.

## 6. Risks

- over-scoping the surface into a full back-office system too early
- confusing funding-claim timing and vesting edge cases
- overwhelming the default user experience with admin detail
- coupling the UI too tightly to historical pricing logic not yet owned by the frontend

## 7. Launch stance

Required launch order:
1. mock / dummy data beta host
2. live-contract wiring accepted
3. production green light recorded
4. production exposure on `teams.yearn.fi` after release checklist approval
