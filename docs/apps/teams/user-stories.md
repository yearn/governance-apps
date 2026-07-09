# Team Finances User Stories

## Team owner

- As a team owner, I can open my team details and understand current-period and lifetime revenue, cost, and profit/loss.
- As a team owner, I can inspect period-by-period financial history for my team.
- As a team owner, I can use one team page where revenue, funding, bonus, and status sections are visible without switching tabs.
- As a team owner, I can claim approved funding to a recipient and understand whether it will stream or arrive liquid.
- As a team owner, I can see why a claim, return, or bonus action is blocked from persistent copy next to the disabled action.
- As a team owner, I can see bonus available for finalized periods and claim it.
- As a team owner, I can view and transfer ownership state.
- As a team owner, I can see if my team is retiring or has migration actions pending.

## Contributor / finance operator

- As a contributor, I can deposit revenue on behalf of a team without being the owner.
- As a contributor, I can preview conversion and estimated USD credit before submitting revenue.
- As a contributor, I can inspect recent revenue entries and understand what period they affected.

## Protocol operator

- As an operator, I can view all teams and their status.
- As an operator, I can switch between Table and Cards without losing the selected team.
- As an operator, I can switch the directory between current-period, historical-period, and all-time financial scopes.
- As an operator, I can open a team from either its table row or its row action.
- As an operator, I can inspect funding approvals and claim / refund history.
- As an operator, I can monitor revenue recipient bucket budgets and usage.
- As an operator, I can inspect bonus period state and finalization readiness.
- As an operator, I can inspect oracle / converter / treasury / recovery settings.

## UX invariants

- The UI must not imply vest claiming is handled here.
- The UI must not imply revenue deposits are owner-only.
- The UI must clearly distinguish current-period values from lifetime values.
- The UI must keep revenue, cost, and net on the same selected financial scope within each team row or card.
- The UI must clearly indicate when a funding claim is no longer stream-backed and is liquid immediately.
- Deep links to `#revenue`, `#funding`, `#bonus`, `#lifecycle`, and `#admin` must remain valid.
- Table data is the default view. Cards must remain available as a saved preference.
- Operator/admin controls must remain isolated from team-owner actions and permission-gated.
