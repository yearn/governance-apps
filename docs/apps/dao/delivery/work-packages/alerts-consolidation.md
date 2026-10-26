# DAO alerts: transaction consolidation

## Scope and acceptance

One implementer owns branch `agent/dao/alerts/consolidation`.
The base is upstream master `731dbc98e2de5a27a2bd4f098fe16d7018381495`.

This package supersedes the proposed vote presentation in
[PR #134](https://github.com/yearn/governance-apps/pull/134).
It builds on Wavy's role identification, weight formatting, footer, and tests from
head `cc3e9d9081731a146dd3306aaa87d7cd95e3e2b6`.
That revision already removed the earlier estimate of each member's collective influence.
The compact vote header and footer also retain the layout improvement in
`d022f6152f709d43d41cf2325290e1be855435d9`.

Acceptance criteria:

- One vote message covers each transaction and proposal.
- Personal recorded weight remains separate from the YBC collective contribution.
- The YBC contribution includes stYFIx.
- Exact replacement arithmetic supplies before/after tallies when history reconciles.
- Missing optional enrichment leaves confirmed vote facts deliverable.
- A text bar marks the stored threshold and displays the current approval gap.
- Vetoes, retractions, and flags take priority over passing tallies.
- Message limits, retries, caps, and existing delivery receipts remain supported.
- Existing lifecycle and configuration alerts remain available.

## Evidence and checks

The producer fixture captures a real threshold-crossing transaction.
Its provenance and limitations are recorded in the fixture and
[alert guide](../../telegram-alerts.md#consolidated-vote-validation).

Required checks are typecheck, lint, the full unit suite, and the alert Worker dry-run build.
No website route or wallet flow changes; browser flow suites are outside this package.
Independent review must cover the committed diff.
The specialist audit covers contract replacement semantics, grouping, and receipt recovery.
Validation on 26 October 2026 passed typecheck, lint, and 2,490 tests across 226 files.
The alert Worker dry-run build passed. A 390 px Chromium HTML preview had no horizontal overflow.
Native Telegram rendering and live delivery were not tested.
Independent code review and specialist audit of the implementation reported no blocking findings.
The specialist also ran 92 focused tests successfully.
Record the final formatting review in the PR.

## Integrator notes

This change adds no dependency, secret, binding, configuration flag, or object generation.
Keep `alerts:dao:v3`, its cursor, and its receipts.
Do not replay delivered history or deploy the old per-log renderer over partially
delivered groups. New group receipts do not write legacy receipts for every source log.
Pause DAO delivery before any rollback that changes the receipt scheme, then review
the saved cursor and pending block.

One group consumes one message from the existing per-run cap.
Partially delivered old groups omit personal rows whose receipts already exist.
Fully delivered old groups receive a group receipt without another Telegram message.
A group receipt remains stable if optional role or history reads change on retry.
The existing Telegram-accepted-before-storage duplicate window remains.

Historical reads add two bounded batches per proposal/account set, split by the
existing RPC batch limit. They use the canonical parent block hash.
The scanner verifies replayed totals against the final block before displaying changes.
If those reads fail or disagree, it explicitly labels final-block totals and omits changes.

Keep this branch available for review. Integration, deployment, and private-chat
acceptance remain separate maintainer steps.
