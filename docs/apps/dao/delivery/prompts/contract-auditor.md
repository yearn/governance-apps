# Contract Auditor Prompt

```text
Audit DAO Governance {WP_ID} read-only.

Read docs/apps/dao/contract-reference.md and verify claims against the pinned
stYFI commit. Check the parts relevant to this package, including:
- status and action capability are separate;
- veto before votes versus veto after votes;
- no quorum and snapshotted threshold;
- voting epochs, execution window, and late decay boundaries;
- public Voter one-vote behavior;
- YBC and delegated aggregate vote handling;
- script framing, 64-call cap, and 2,048-byte cap;
- empty-script signal display;
- event script retention and hash verification;
- content failure does not become a frontend voting veto;
- prepared writes and shared useTx.

Do not edit. Return findings with severity, source evidence, user impact, and the
smallest focused correction. State explicitly when no blocking finding exists.
```
