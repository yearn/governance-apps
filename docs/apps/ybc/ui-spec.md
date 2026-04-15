# YBC UI Spec

Status: planning baseline
Applies to: `/ybc` path first, later `ybc.yearn.fi` if desired
Recommended app key: `ybc`
Recommended display label: `Yearn Builder's Collective`

## 1. Product framing

This is a governance-and-membership workspace, not another generic staking screen.

The surface should emphasize:

- collective status
- membership
- proposal lifecycle
- voting thresholds
- execution timing
- weight maturity
- rewards visibility

## 2. Primary personas

### Observer
Needs:
- what YBC is
- who is in it
- what proposals exist
- how much governance influence it has

### Member
Needs:
- personal effective weight
- proposal actions
- vote actions
- execution timing
- rewards visibility

### Operator / management
Needs:
- member overrides in allowed scope
- operator list / thresholds / hooks visibility
- reward distributor and bonus recipient visibility

## 3. Route structure

Recommended initial structure:

```text
/ybc
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
```

## 4. Information architecture

Sections:

1. Overview
2. Members
3. Proposals
4. Rewards
5. Admin (conditional)

## 5. Core UX rules

## 5.1 Separate raw stake from effective weight

Always show:
- raw staked amount
- effective voting weight now
- fully matured target weight

This distinction is required because YBC weight ramps over epochs.

## 5.2 Make timing obvious

Every proposal should clearly show:
- proposal epoch
- discussion phase
- voting window
- execution window
- expired state

## 5.3 Make thresholds visible

Do not hide thresholds in docs text only.

Show:
- addition threshold
- expulsion threshold
- current yea / total
- clear passing / failing state

## 5.4 Keep rewards simple

Show:
- member’s YBC-related rewards
- statement that rewards are claimed through the shared reward flow
- CTA that hands off to the shared claim surface instead of duplicating reward-claim machinery

## 6. Hero section

Recommended hero stats:

- member count
- internal member weight
- public delegated weight
- total governance influence
- current epoch
- active proposals
- proposals awaiting execution

## 7. Members table

Columns:
- member
- status
- raw staked
- effective weight
- target weight
- maturity progress
- source mix summary

Visual priority:
- maturity progress bar
- effective vs target weight

## 8. Proposal board

Each card should show:
- addition vs expulsion
- target account
- proposer
- threshold
- votes
- phase
- next available action

Actions to model in mock flows:
- propose addition
- propose expulsion
- retract
- vote yea
- vote nay
- execute

## 9. Admin scope for MVP

Expose only in-scope operator/admin affordances:

- add member
- remove member
- operator list visibility
- hooks visibility
- threshold visibility
- reward / bonus-related status

Do **not** build a generic arbitrary-call transaction builder in MVP.

## 10. Mock-first scenario set

Required mock scenarios:

1. observer, not a member
2. member with matured weight
3. member with ramping weight
4. proposal in discussion phase
5. proposal in voting phase
6. passed proposal awaiting execution
7. expired proposal
8. operator/admin view

## 11. Copy posture

Prefer:
- `Collective Influence`
- `Voting Weight`
- `Ramping`
- `Proposal`
- `Execute`
- `Awaiting Execution`

Avoid:
- implying instant full weight for new stake
- implying expired proposals can be revived
- implying YBC has a fully generic arbitrary-execution UI in scope
