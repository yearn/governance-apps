# Team Finance User Stories

## Team owner

- As a team owner, I can open my team workspace and understand current-period and lifetime revenue, cost, and profit/loss.
- As a team owner, I can claim approved funding to a recipient and understand whether it will stream or arrive liquid.
- As a team owner, I can see bonus available for finalized periods and claim it.
- As a team owner, I can view and transfer ownership state.
- As a team owner, I can see if my team is retiring or has migration actions pending.

## Contributor / finance operator

- As a contributor, I can deposit revenue on behalf of a team without being the owner.
- As a contributor, I can preview conversion and estimated USD credit before submitting revenue.
- As a contributor, I can inspect recent revenue entries and understand what period they affected.

## Protocol operator

- As an operator, I can view all teams and their status.
- As an operator, I can inspect funding approvals and claim / refund history.
- As an operator, I can monitor revenue recipient bucket budgets and usage.
- As an operator, I can inspect bonus period state and finalization readiness.
- As an operator, I can inspect oracle / converter / treasury / recovery settings.

## UX invariants

- The UI must not imply vest claiming is handled here.
- The UI must not imply revenue deposits are owner-only.
- The UI must clearly distinguish current-period values from lifetime values.
- The UI must clearly indicate when a funding claim is no longer stream-backed and is liquid immediately.
