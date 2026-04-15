# Codex Delivery Guide for Teams + YBC

This guide is for running the new Teams and YBC work in controlled parallel tracks.

## 1. Pick the work package first

Before creating a worktree, decide:

- track: `teams` or `ybc`
- milestone: `m0`, `m1`, `m2`, ...
- work package: `wp0`, `wp1`, ...

Do **not** create every future worktree up front.

## 2. Create a focused worktree

Create the long-lived integration worktree first from the `bootstrap` checkout:

```fish
cd /Users/hydra/Developer/yearn/governance-apps
./scripts/agent-worktree.sh create integration --no-install
```

This creates:

```text
../governance-apps.agent.integration
```

and branch:

```text
agent/integration
```

Work package branches should start from `agent/integration`.

Example:

```fish
cd /Users/hydra/Developer/yearn/governance-apps.agent.integration
./scripts/workpkg-worktree.sh create --track teams --milestone m1 --wp wp3 --base agent/integration --seed-template
```

`--seed-template` is optional. It uses a local `.env.worktree.example` file when present
and warns without failing when that local template is absent.

This creates a worktree under:

```text
../governance-apps.agent.integration.teams.m1.wp3
```

and a branch like:

```text
agent/teams/m1/wp3
```

## 3. Open the right docs in the worktree

For the current package, read in order:

1. `AGENTS.md`
2. `docs/shared/teams-ybc-delivery-roadmap.md`
3. the app README (`docs/apps/teams/README.md` or `docs/apps/ybc/README.md`)
4. the work package doc under `onchain-integration-plan/work-packages/`
5. the role prompt you are using

## 4. Implement in small scope

For implementers:
- stay inside the stated work package
- do not consume later milestone scope
- use the existing repo patterns before inventing new abstractions

## 5. Run the minimum validation

```fish
npm run typecheck
npm run lint
npm run test
```

Run e2e only when the package touches UI flows or route behavior.

## 6. Reviewer pass

Use the reviewer prompt in the app prompt folder, plus the WP-specific reviewer section.

The reviewer should check:
- scope discipline
- state coverage
- docs updated
- tests changed where behavior changed

## 7. Integrate into `agent/integration`

Merge approved WP branches into the long-lived integration worktree:

```fish
cd /Users/hydra/Developer/yearn/governance-apps.agent.integration
git merge --no-ff agent/teams/m1/wp3
```

Re-run the minimum validation after each accepted merge.
Do not merge every WP directly into `master`.

## 8. Remove finished worktrees

```fish
./scripts/workpkg-worktree.sh remove --track teams --milestone m1 --wp wp3 --prune
```

Add `--keep-branch` if you want to retain the branch temporarily.

## 9. Promotion path

Recommended promotion path:

1. WP branch
2. `agent/integration`
3. milestone tag such as `integration/m1`
4. shared release branch if needed
5. `master`

## 10. Default role split

### Implementer
Builds the scoped package.

### Reviewer
Checks correctness, scope, tests, accessibility, and consistency.

### Integrator
Owns merge order, conflict resolution, milestone assembly, and release readiness notes.
