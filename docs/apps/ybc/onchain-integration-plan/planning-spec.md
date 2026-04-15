# YBC Planning Spec

## 1. Canonical naming

- app name / slug: `ybc`
- route key: `/ybc`
- display label: `Yearn Builder's Collective`
- initial beta exposure: `ybc-beta.dao-ops.com` with mock / dummy data
- production host: `ybc.yearn.fi` (gated until live contract wiring and production approval)

## 2. MVP scope

Included:
- collective overview
- members roster
- proposal board
- proposal lifecycle visualization
- threshold visualization
- reward visibility and cross-app claim handoff
- scoped operator/admin panel

Out of scope for MVP:
- generic arbitrary-call transaction builder UI
- duplicate staking UX already owned by other routes
- a separate isolated YBC claim engine

## 3. Data strategy

### Mock phase
Use `docs/apps/ybc/mock-data-schema-v1.md` and the example JSON as the source of truth.

### Onchain phase
Plan for:
- read-only hero, members, proposals, and weights first
- wallet-specific proposal and vote writes only after read model is stable
- shared reward claiming left to the existing reward path

## 4. Suggested route and file layout

```text
app/ybc/
  page.tsx
  YbcPageClient.tsx
  messages.ts
  components/
    YbcHero.tsx
    MembersTable.tsx
    ProposalBoard.tsx
    ProposalCard.tsx
    RewardsCard.tsx
    OperatorPanel.tsx

lib/clients/ybc/
  types.ts
  client.ts
  mock.ts
  onchain.ts
  index.ts

lib/hooks/
  useYbc.ts
```

## 5. Milestone outcomes

### M1
Static mock-backed surface accepted.

### M2
Interactive mock proposal flows accepted.

### M3
Onchain reads work on fork.

### M4
Onchain writes work on fork.

### M5
UAT and preprod accepted.

### M6
Controlled production rollout approved.

## 6. Risks

- hiding too much timing detail around proposal lifecycle
- collapsing raw stake and effective weight
- accidentally implying generic arbitrary execution is in MVP
- duplicating rewards UX that belongs in the shared claim path

## 7. Launch stance

Recommended launch order:
1. mock / dummy data beta host
2. live-contract wiring accepted
3. production green light recorded
4. production exposure on `ybc.yearn.fi` after release checklist approval

Production exposure must stay feature-gated until steps 2 and 3 are complete. Shared-host
path routing on `/ybc` and beta-host routing on `ybc-beta.dao-ops.com` are the validation
targets before production.
