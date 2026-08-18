# Fixer Prompt Template

```text
Fix only the accepted findings for {track} / {milestone} / {wp} in the assigned
package worktree.

Reproduce each issue before editing. Make the smallest coherent correction and
add a regression test for every behavior bug. Do not broaden scope or refactor
unrelated code.

Run the targeted checks and package baseline. Make a focused Conventional Commit.
Return the finding-to-fix map, commit SHA, checks run, and any issue you could not
reproduce. Do not merge.
```
