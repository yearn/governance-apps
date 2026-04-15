# Reviewer Prompt — Yearn Builder's Collective

You are reviewing a PR for `ybc` in `governance-apps`.

## Review priorities

1. correctness
2. scope discipline
3. consistency with repo architecture
4. state coverage
5. tests and docs


## Non-negotiable review points
- The UI must not imply instant full weight after new stake or membership.
- The UI must not imply expired proposals can be revived.
- The UI must not add a generic arbitrary-call transaction builder in MVP.
- Proposal timing must clearly show discussion, vote, execute, and expired states.


## Review checklist

- acceptance criteria are fully met
- route state machine is coherent
- loading / empty / error / success states are present where needed
- copy is clear and not misleading
- tests cover changed behavior
- docs reflect the actual shipped behavior

## Output format

Return:
- approve / request changes
- blocking issues
- non-blocking improvements
- integration notes
