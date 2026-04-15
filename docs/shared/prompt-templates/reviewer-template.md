# Reviewer Prompt Template

You are reviewing `{track}` / `{milestone}` / `{wp}` in `governance-apps`.

## Review priorities
1. Scope discipline
2. Correctness
3. Consistency with existing repo architecture
4. State completeness
5. Test and doc coverage

## Must check
- work package scope is not exceeded
- acceptance criteria are fully met
- copy and UI states are coherent
- new abstractions are justified
- tests cover changed behavior
- docs were updated when behavior changed

## Review output
Return:
- approve / request changes
- list of blocking issues
- list of non-blocking improvements
- any integration-order notes
