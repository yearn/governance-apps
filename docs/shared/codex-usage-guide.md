# Codex Delivery Guide for Teams + YBC

This guide is for running Teams and YBC production work in controlled parallel tracks.
The current production path is feed-first: `governance-apps` defines and consumes the
feed contract, while `gov-apps-stats` produces `teams.json` and `ybc.json`.

## 1. Pick the work package first

Before creating a worktree, decide:

- repo: `governance-apps` or `gov-apps-stats`
- track: `shared`, `teams`, or `ybc`
- milestone: `m3a`, `m3b`, `m3c`, `m4`, ...
- work package: `wp0`, `wp1`, ...

Do **not** create every future worktree up front.

Use shared WP2 in the `gov-apps-stats` repo. Do not implement producer code in a
`governance-apps` worktree.

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
3. `docs/shared/teams-ybc-production-plan.md`
4. for producer work, `docs/shared/gov-apps-stats-teams-ybc-feed-brief.md`
5. the app README (`docs/apps/teams/README.md` or `docs/apps/ybc/README.md`)
6. the work package doc under `onchain-integration-plan/work-packages/` or
   `docs/shared/work-packages/`
7. the role prompt you are using

## 4. Implement in small scope

For implementers:
- stay inside the stated work package
- do not consume later milestone scope
- use the existing repo patterns before inventing new abstractions
- do not let browser code own historical Teams/YBC log indexing
- do not change feed schema shape without updating the consumer contract docs

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

For `gov-apps-stats`, the implementer owns producer indexing and staging publication only.
For `governance-apps`, the implementer owns schemas, validation, frontend reads, writes,
or rollout depending on the package.

### Reviewer
Checks correctness, scope, tests, accessibility, and consistency.

For producer work, also check event reducer determinism, cursor safety, snapshot block
consistency, and atomic publication.

### Integrator
Owns merge order, conflict resolution, milestone assembly, and release readiness notes.

## 11. Cross-repo handoff order

1. Complete shared WP1 in `governance-apps`.
2. Start shared WP2 in `gov-apps-stats` using the producer brief.
3. Publish staging `teams.json` and `ybc.json`.
4. Complete shared WP3 in `governance-apps` to validate staging feeds.
5. Start Teams WP9 and YBC WP8 for feed-backed reads.
6. Start Teams WP10 and YBC WP9 for launch-scope writes.
7. Finish Teams WP11 and YBC WP10 for fork/preprod/rollout.
