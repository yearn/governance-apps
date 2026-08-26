# Sol Ultra Kickoff Prompt

Copy the prompt below into a new GPT-5.6 Sol Ultra context rooted in this
repository.

```text
Implement DAO Governance as the root orchestrator, following the committed delivery plan.

Repository:
/Users/hydra/Developer/yearn/governance-apps

Integration worktree:
/Users/hydra/Developer/yearn/governance-apps.agent.integration

Start by reading AGENTS.md, docs/shared/codex-usage-guide.md, the canonical
product documents listed in docs/apps/dao/README.md, and
docs/apps/dao/delivery/README.md. Read the active work-package file and all of
its dependencies in full before assigning work. Verify that the annotated tag
integration/dao-m0 peels to 04224b3c930fd72efee6b65afa07f83c70369446, that
3d746e84b02d58bbe196525fb5a2510b4bfbce64 is an ancestor of that merge, and that
the merge is an ancestor of the accepted agent/integration base for the run.
Stop and report the mismatch if any check fails. Do not redo discovery unless
repository code or a newer pinned contract revision contradicts the
specification.

Act as the root orchestrator. Use sub-agents for implementation, independent
review, specialist auditing, fixes, and integration. Use one branch and worktree
per work package. Never let two agents edit the same worktree. Never merge a
branch with unresolved blockers or a final commit range that was not reviewed.

Begin with M1 and follow the dependency and integration order in
docs/apps/dao/delivery/README.md. For each package:
1. verify its dependencies in agent/integration;
2. create agent/dao/<milestone>/<wp> from the current integration head with
   scripts/workpkg-worktree.sh;
3. assign one implementer using delivery/prompts/implementer.md;
4. require a focused Conventional Commit and clean worktree;
5. assign a read-only reviewer and the required specialist auditor;
6. assign a fixer for accepted blockers in the same package worktree;
7. re-review the final commit range;
8. assign an integrator to merge with --no-ff into agent/integration;
9. run the documented post-merge checks;
10. report accepted commits, evidence, and remaining risks.

Maintain docs/apps/dao/delivery/status.md after every accepted merge. Record the
reviewed range, merge commit, checks, evidence, accepted risks, next dependency,
and gate state. Use a separate post-merge documentation commit when the merge
SHA cannot be known in advance.

Use up to four total agent slots, including the root. Parallelize only packages
marked independent. Preserve unrelated work. Do not create future package
worktrees before their dependencies land.

Complete M1 and M2 mock-first. Use the shared debug controls, deterministic time,
typed mock store, and test bridge. Keep normal routes production-shaped. Do not
start gov-apps-stats, feed-backed reads, IPFS publication, or onchain wiring
before the M2 mock UX has been shown to the user and accepted. Stop at that gate.

At the M2 gate, provide:
- merged package branches and commit SHAs;
- browser screenshots or equivalent visual evidence at phone, tablet, and desktop;
- the lifecycle and authoring states exercised;
- commands and tests run;
- open UX questions and known risks;
- a recommendation on readiness for M3.

Non-negotiable product rules:
- display name is DAO Governance;
- routes are /dao, /dao/proposals/[id], and /dao/propose;
- governance has no quorum; show “of votes cast” and a quiet rules explanation;
- a veto before any votes prevents voting;
- a veto after votes exist permits Yea/Nay participation voting while the window remains open;
- signal proposals display Approved and “No executable actions”;
- authoring accepts the full Executor script as hex;
- the browser checks only hex, framing, declared sizes, the 64-call limit, the
  2,048-byte limit, target extraction, and script hash;
- the UI never calls a structurally valid script safe or verified;
- backend indexing owns historical events, IPFS fetch, decoding, and stored
  proposal-time simulation;
- execution requires the exact event script, hash verification, and a fresh
  current-state simulation;
- display status and action capabilities are separate domain facts;
- global history never comes from browser log scanning;
- all writes use prepared domain transactions and shared useTx;
- production exposure remains path-first and feature-gated.
```
