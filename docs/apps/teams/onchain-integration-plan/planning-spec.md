# Team Finance Planning Spec

## 1. Canonical naming

- route key: `teams`
- recommended public label: `Team Finance`
- initial exposure: path-based `/teams`
- later public host if desired: `teams.yearn.fi`

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

## 4. Suggested route and file layout

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

Recommended launch order:
1. path-based route on shared host
2. internal / governance audience
3. later dedicated host if still useful
