# yETH Recovery Docs

Scope: yETH recovery experience under `/yeth`.

## Documents

- Mechanism spec: [`mechanism-spec.md`](mechanism-spec.md)
- UI/UX spec: [`ui-ux-spec.md`](ui-ux-spec.md)
- Implementation status: [`implementation-status.md`](implementation-status.md)
- Production checklist: [`production-readiness-checklist.md`](production-readiness-checklist.md)

## Current Delivery Status

- A full mock-first yETH recovery app is implemented at `/yeth`.
- Tokyo Refresh (v2.0) UI is implemented with de-boxed action-first hierarchy.
- stYFI and veYFI remain independently operable.
- The route has an onchain client, global feed path, and prepared claim/redeem
  writes. Final addresses, production inputs, and rollout checks remain tracked
  in the implementation status and production checklist.

For exact completion details, use the status tracker:
[`implementation-status.md`](implementation-status.md).

## React state compatibility

The page retains the last valid claim deadline across incomplete payloads and closes the risk modal when the deadline passes.
Claim history uses an external-store subscription and updates after storage events from other tabs.
The current session retains successful claim details when browser storage is unavailable.

See the [dependency migration notes](../../shared/testing.md#dependency-migration-2026-10-05) for compiler and linter requirements.
