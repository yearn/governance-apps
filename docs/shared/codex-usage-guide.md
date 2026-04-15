# Codex Delivery Guide for Teams + YBC

This guide is for running the new Teams and YBC work in controlled parallel tracks.

## 1. Pick the work package first

Before creating a worktree, decide:

- track: `teams` or `ybc`
- milestone: `m0`, `m1`, `m2`, ...
- work package: `wp0`, `wp1`, ...

Do **not** create every future worktree up front.

## 2. Create a focused worktree

Example:

```bash
./scripts/workpkg-worktree.sh create --track teams --milestone m1 --wp wp3 --seed-template
```

`--seed-template` is optional. It uses a local `.env.worktree.example` file when present
and warns without failing when that local template is absent.

This creates a worktree under:

```bash
../governance-apps.shared.m0.teams.m1.wp3
```

and a branch like:

```bash
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

```bash
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

## 7. Integrate into milestone branch

Use a milestone worktree such as:

```bash
./scripts/workpkg-worktree.sh create --track teams --milestone m1 --seed-template
```

Merge accepted WP branches into the milestone branch first.
Do not merge every WP directly into `master`.

## 8. Remove finished worktrees

```bash
./scripts/workpkg-worktree.sh remove --track teams --milestone m1 --wp wp3 --prune
```

Add `--keep-branch` if you want to retain the branch temporarily.

## 9. Promotion path

Recommended promotion path:

1. WP branch
2. milestone integration branch
3. shared integration / release branch if needed
4. `master`

## 10. Default role split

### Implementer
Builds the scoped package.

### Reviewer
Checks correctness, scope, tests, accessibility, and consistency.

### Integrator
Owns merge order, conflict resolution, milestone assembly, and release readiness notes.
