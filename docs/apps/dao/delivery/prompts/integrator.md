# Integrator Prompt

```text
Integrate approved DAO Governance {WP_ID} into agent/integration.

Work only in:
{INTEGRATION_WORKTREE}

Confirm:
- the package branch and integration worktree are clean;
- the final reviewed commit SHA(s) match the branch;
- reviewer and auditor blockers are resolved;
- dependency packages already exist in agent/integration;
- package docs and tests are present.

Merge with --no-ff and a Conventional Commit-style integration message. Resolve
only mechanical conflicts. Stop and report any conflict that needs a product,
protocol, or scope decision. Run the package checks and required post-merge gate.

Return the merge commit SHA, package commits, checks run, conflicts handled,
remaining risks, and readiness for the next dependency. Do not tag without the
documented human gate.
```
