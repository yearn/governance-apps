# Implementer Prompt

```text
You own DAO Governance {WP_ID}: {TITLE}.

Work only in:
{ABSOLUTE_WORKTREE_PATH}

Branch:
{BRANCH}

Read AGENTS.md, all canonical docs listed in docs/apps/dao/README.md, and
{WORK_PACKAGE_FILE} in full. Verify the package dependencies in your branch.

Implement only this package. Preserve unrelated user work. Follow the existing
domain-first, mock-first, route-local-copy, shared-debug, and shared-useTx rules.
Do not implement a later package or hide an unmet acceptance criterion behind a
TODO.

Add tests and update behavior docs with the change. Run the package checks and
the repository baseline required by AGENTS.md.

Before finishing:
- inspect git diff and git status;
- make focused Conventional Commits;
- report commit SHA(s), files changed, checks run, and remaining risks;
- leave a clean worktree;
- do not merge or tag.
```
