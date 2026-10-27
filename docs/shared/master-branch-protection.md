# Master Branch Protection

## Policy

Only `0xPickles` and `0xkorin` can merge changes into `master`.
Every change requires a pull request (PR).
Direct pushes, force pushes, and branch deletion stay blocked.

Outside and bot PRs normally require one approval from either maintainer.
New changes dismiss previous approvals.
The `verify` check must normally pass against the latest `master`.
The required check comes from GitHub Actions (app ID `15368`).

Either maintainer can merge their own PR without the other person's approval.
Either maintainer can override pending, failed, or unavailable checks.
These exceptions apply only through PRs.
RoboKitty, Dependabot, other apps, and other contributors receive no master exceptions.

GitHub applies an exception to the person who merges, not to the PR author.
Thus, either maintainer can also waive approval on an outside PR.
The normal process still includes an explicit approving review.

## Upstream Feature Branches

Only Pickles, Korin, and the Dependabot GitHub App can create, update, or delete upstream feature branches.
All other contributors and bots must push their branches to their own forks.
They can submit PRs from those forks.

The feature-branch rule targets every upstream branch except `master`.
It permits direct branch pushes from the two maintainers and Dependabot.
The three master rulesets still apply to `master`.
Dependabot receives no permission to merge to master or bypass its review and CI rules.

The exception identifies Dependabot by its GitHub App ID (`29110`).
A branch name such as `dependabot/example` does not grant an exception.
GitHub Actions and other apps receive no feature-branch exception.
Existing upstream branches remain in place, but the rule restricts subsequent updates and deletion.

This branch ruleset applies to the upstream repository.
It does not restrict work inside contributor forks.
The policy covers branches, not tags.

## Ruleset Files

The four JSON files in [`.github/rulesets`](../../.github/rulesets) start disabled.
A commit does not install or activate these rules.
The live GitHub settings determine enforcement.

| File | Purpose | Bypass list |
| --- | --- | --- |
| [01-master-pr-and-history.json](../../.github/rulesets/01-master-pr-and-history.json) | Requires a PR and blocks force pushes and deletion | Empty |
| [02-master-merge-access.json](../../.github/rulesets/02-master-merge-access.json) | Restricts updates to the two maintainers | Pickles and Korin, for PRs only |
| [03-master-reviews-and-checks.json](../../.github/rulesets/03-master-reviews-and-checks.json) | Requires review, resolved conversations, and successful CI | Pickles and Korin, for PRs only |
| [04-upstream-feature-branch-access.json](../../.github/rulesets/04-upstream-feature-branch-access.json) | Restricts feature-branch creation, updates, and deletion | Pickles, Korin, and Dependabot, always |

The first ruleset has no exceptions.
An override of the third ruleset cannot remove the first ruleset's protections.
The second ruleset excludes all other merge actors.
The fourth ruleset excludes master, so its exceptions cannot override master protections.

The files identify the maintainers by their public GitHub account IDs:

| Login | Account ID |
| --- | --- |
| `0xPickles` | `130217224` |
| `0xkorin` | `117271860` |

Both maintainers need repository write access or a higher role.
Repository and organization administrators can edit these rules.
Those administrator accounts remain trusted.

## Administrator Setup

1. Open the repository's **Settings → Collaborators and teams** page.
2. Verify that both maintainer accounts have write access or a higher role.
3. Review inherited access, installed apps, write deploy keys, and existing branch rules.
4. Merge the PR that adds `.github/CODEOWNERS` before enabling required code-owner review.
5. Download the four JSON files from this repository.
6. Open **Settings → Rules → Rulesets**.
7. Select **New ruleset → Import a ruleset** for each file.
8. Verify that each imported ruleset remains **Disabled**.
9. Verify that files 01, 02, and 03 target only `master`.
10. Verify that file 04 targets all branches and excludes `refs/heads/master`.
11. Verify that the first ruleset's bypass list is empty.
12. Verify that files 02 and 03 list only Pickles and Korin, with **For pull requests only**.
13. Verify that file 04 lists only Pickles, Korin, and Dependabot, with **Always allow**.
14. Create all four disabled rulesets.
15. Activate `master-pr-and-history`.
16. Activate `master-reviews-and-checks`.
17. Activate `master-merge-access`.
18. Activate `upstream-feature-branch-access` last.
19. Under **Settings → General → Pull Requests**, disable **Allow auto-merge**.

If an import rejects individual User actors, stop before activation.
Do not replace them with the entire Write or Admin role.
A visible Yearn team containing exactly these two maintainers is an alternative.
An organization administrator can create that team.
The bypass lists in files 02, 03, and 04 must use that same team.
Dependabot remains a separate app exception in file 04 only.

The repository's public [rules page](https://github.com/yearn/governance-apps/rules) shows active rulesets.
For the bypass lists, use the administrator settings page.
CODEOWNERS also covers workflow files, ruleset files, and CODEOWNERS itself.

## Add the Feature-Branch Rule to Existing Master Protection

If the three master rulesets are already active, keep them in place.

1. Download only `04-upstream-feature-branch-access.json`.
2. Import that file with enforcement **Disabled**.
3. Verify that it targets all branches and excludes `refs/heads/master`.
4. Verify that its bypass list contains only Pickles, Korin, and the Dependabot app.
5. Verify that all three exceptions use **Always allow**.
6. Activate `upstream-feature-branch-access`.

No source merge can activate this rule.
Existing master protections remain unchanged.

## Normal Use

For an outside or bot PR:

1. Review the latest changes.
2. Submit an approving review as Pickles or Korin.
3. Wait for `verify` and resolve review conversations.
4. Merge the PR as either maintainer.

For a maintainer's own PR:

1. Inspect the final diff.
2. Wait for `verify` during normal work.
3. Use the PR bypass to merge without a second maintainer's approval.

## Urgent Fixes

1. Inspect the final diff.
2. Add a short reason for the override to the PR.
3. Use the PR bypass as Pickles or Korin.
4. Review the eventual CI result.
5. Correct or revert the change if CI reveals a regression.

The override can waive review conversations as well as approval and CI.
GitHub does not distinguish an infrastructure outage from a real test failure.
The maintainer makes that decision.

## Verification

After activation, verify all four rulesets in GitHub.
Verify the exact branch, account IDs, bypass modes, approval count, and check source.
Verify that CODEOWNERS recognizes both maintainers.
Inspect an outside PR's merge box for the normal review and check requirements.
Verify that a maintainer can select the PR bypass for an urgent merge.
Verify the feature-branch rule's all-branch target, master exclusion, and three exact bypass identities.
Verify that Dependabot appears only in the feature-branch bypass list.

Do not merge an unwanted PR or push a test commit into `master` for verification.
A public ruleset list alone does not prove the private bypass lists are correct.

## References

- [Create rulesets and PR-only exceptions](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [Import rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository#importing-a-ruleset)
- [Rule layering](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets#about-rule-layering)
- [CODEOWNERS requirements](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
