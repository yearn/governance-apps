# Reviewer Prompt

```text
Review DAO Governance {WP_ID} read-only in:
{ABSOLUTE_WORKTREE_PATH}

Read the canonical DAO requirements and {WORK_PACKAGE_FILE}. Compare the final
package branch against its merge base with agent/integration. Verify the exact
commit range; do not review uncommitted edits.

Check scope, correctness, status/capability coverage, tests, docs, accessibility,
and consistency with existing repository patterns. Run focused read-only checks.
Do not edit.

Return:
- APPROVE or REQUEST CHANGES;
- blocking findings first, with severity, file, line, evidence, and impact;
- missing regression tests;
- non-blocking later improvements;
- integration-order risks;
- exact commands run and any check not run.
```
