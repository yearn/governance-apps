# Codex Delivery Workflow

This is the canonical workflow for planned app work in `governance-apps`. App
delivery plans define scope and dependencies; this guide defines how agents use
branches, worktrees, reviews, and the accepted integration lane.

Repository `AGENTS.md` instructions override generic Codex defaults. In
particular, this repository uses `agent/` branches rather than `codex/` branches.

## 1. Accepted-work lane

Use one long-lived integration worktree:

```text
branch:   agent/integration
worktree: ../governance-apps.agent.integration
```

Create it only if it does not already exist:

```fish
cd /Users/hydra/Developer/yearn/governance-apps
./scripts/agent-worktree.sh create integration --no-install
```

If it exists, inspect it before use:

```fish
git -C ../governance-apps.agent.integration status --short --branch
git rev-list --left-right --count agent/integration...master
```

Fast-forward or merge the approved baseline into `agent/integration` before
creating dependent work packages. Never reset the integration branch to discard
accepted work.

## 2. Work-package branches

Use one branch and one worktree per package:

```text
branch:   agent/<track>/<milestone>/<wp>
worktree: ../governance-apps.<track>.<milestone>.<wp>
```

Supported tracks include `dao`, `teams`, `ybc`, and `shared`.

Create packages only when their dependencies have landed in
`agent/integration`. The helper ignores `--base` if the branch or worktree
already exists, so creating future packages early can leave them on stale
baselines.

Example:

```fish
cd /Users/hydra/Developer/yearn/governance-apps.agent.integration
./scripts/workpkg-worktree.sh create \
  --track dao \
  --milestone m1 \
  --wp wp1 \
  --base agent/integration \
  --install
```

The script resolves the main repository name even when run from the integration
worktree, so this creates:

```text
../governance-apps.dao.m1.wp1
agent/dao/m1/wp1
```

Use `--no-install` when another process will install dependencies. Environment
sync never overwrites existing local files.

## 3. Roles

### Root orchestrator

- reads the app plan and current package dependencies;
- creates worktrees from the accepted integration head;
- assigns one editing owner per worktree;
- schedules independent review and specialist audits;
- keeps product gates with the user;
- does not merge work that still has blocking findings.

### Implementer

- owns all edits in one package worktree;
- stays inside package scope;
- adds tests and behavior docs with the change;
- runs the package checks;
- makes focused Conventional Commits;
- never merges the branch.

### Reviewer

- works read-only against the committed package diff;
- checks scope, correctness, tests, docs, and existing patterns;
- cites files and lines for findings;
- separates blockers from later improvements.

### Specialist auditor

Checks the risk relevant to the package: contract behavior, transaction safety,
indexer determinism, accessibility, interface quality, deployment, or security.
The auditor works read-only and does not silently fix findings.

### Fixer

- reproduces accepted findings in the same package worktree;
- makes the smallest scoped corrections;
- adds regression tests for behavior bugs;
- commits the fixes and returns the finding-to-fix map.

### Integrator

- verifies the reviewed commit range and clean branch;
- confirms dependency packages are already present;
- merges with `--no-ff` in the documented order;
- runs post-merge checks in the integration worktree;
- records conflicts, deferred work, and rollout effects.

Never let two agents edit the same worktree. A reviewer can inspect while an
implementer is idle, but review must target committed code.

## 4. Package loop

For each package:

1. Verify dependencies in `agent/integration`.
2. Create the package branch and worktree from that exact head.
3. Assign one implementer.
4. Require a focused commit and clean worktree.
5. Run an independent reviewer.
6. Run the needed specialist auditor.
7. Assign a fixer for every accepted blocker.
8. Re-review the final commit range.
9. Merge the approved branch into `agent/integration` with `--no-ff`.
10. Run the post-merge test gate.
11. Remove the worktree only after the merge is verified.

Safe cleanup that retains the branch:

```fish
./scripts/workpkg-worktree.sh remove \
  --track dao \
  --milestone m1 \
  --wp wp1 \
  --keep-branch \
  --prune
```

Do not use `--force` unless the exact worktree and its uncommitted state have
been checked.

## 5. Integration and tags

Merge from the integration worktree:

```fish
cd /Users/hydra/Developer/yearn/governance-apps.agent.integration
git status --short --branch
git merge --no-ff agent/dao/m1/wp1 \
  -m "chore(integration): merge DAO Governance M1 WP1"
```

Use domain-scoped annotated milestone tags because generic integration tags may
already exist:

```fish
git tag -a integration/dao-m1 -m "Accept DAO Governance M1"
```

Tag only after the milestone tests pass and the required human gate is accepted.
Do not merge every work package directly into `master`.

## 6. Validation gates

Every meaningful package:

```fish
npm run typecheck
npm run lint
npm run test
```

Route or user-flow changes:

```fish
npm run test:e2e
npm run test:e2e:full
```

Milestone integration:

```fish
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:e2e:full
npm run build
```

Run `npm run validate:deps` when dependencies or the lockfile change. Record any
check that cannot run and why; do not report it as passing.

## 7. Cross-repository packages

Keep producer work in its own repository. `governance-apps` owns consumer
schemas, frontend validation, route behavior, writes, and rollout docs.
`gov-apps-stats` owns historical event indexing, snapshot generation, backend
analysis, and feed publication.

Each repository uses its own integration lane and instructions. Land the
consumer contract first, implement the producer second, validate real producer
output third, then wire production reads.

## 8. Product gates

Do not let an autonomous delivery run skip a product gate. For a mock-first app:

1. accept functional requirements;
2. build and review deterministic mocks;
3. present the mock UX for user acceptance;
4. define and implement the producer feed;
5. wire onchain reads and writes;
6. prove the lifecycle on a fork;
7. test preproduction;
8. expose production behind its feature flag.

An open contract PR, pending deployment addresses, or pending producer work does
not block the mock milestone unless the mock would encode an unknown product
choice.
