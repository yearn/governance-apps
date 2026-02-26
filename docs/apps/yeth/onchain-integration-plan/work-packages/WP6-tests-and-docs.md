# WP6 — Tests, Cleanup, and Docs

## Objective
Update tests and docs to reflect the simplified yETH MVP.

## Scope
- Update any unit tests impacted by:
  - removal of `opensAt`
  - removal of eligibility/ineligible UI branches
  - yETH global feed-backed disconnected rendering
  - UI state machine simplification
- Ensure `tests/unit/app/yeth/messages.test.ts` still passes after copy cleanup.
- Ensure yETH mock controls (if present) still compile.
- Update `docs/apps/yeth/implementation-status.md` to reflect onchain mode and new simplified states.

## Dependencies
- WP1

## Acceptance Criteria
- `pnpm test` passes.
- `pnpm lint` passes.
- Docs reflect the actual behavior of `/yeth`.
