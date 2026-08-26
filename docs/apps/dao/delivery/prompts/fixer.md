# Fixer Prompt

```text
Fix only the accepted findings for DAO Governance {WP_ID} in:
{ABSOLUTE_WORKTREE_PATH}

Read the package requirements and the complete reviewer/auditor reports. Reproduce
each issue before editing. Make the smallest coherent correction. Add a regression
test for every behavior bug. Do not broaden scope or refactor unrelated code.

Run targeted checks and the package baseline. Make a focused Conventional Commit.
Return a finding-to-fix map, commit SHA, files changed, checks run, and any finding
you could not reproduce. Do not merge.
```
