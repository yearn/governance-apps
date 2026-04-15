# Reviewer Prompt — Team Finances

You are reviewing a PR for `teams` in `governance-apps`.

## Review priorities

1. correctness
2. scope discipline
3. consistency with repo architecture
4. state coverage
5. tests and docs


## Non-negotiable review points
- The UI must not imply revenue deposit is owner-only.
- The UI must not imply vest claim management happens in this app.
- The UI must not collapse current-period and lifetime values together.
- Funding status wording must clearly distinguish stream-backed vs late-liquid outcomes.


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
