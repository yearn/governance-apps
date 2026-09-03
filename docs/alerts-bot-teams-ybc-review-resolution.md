# Teams and YBC alert review resolution

Status: code-complete after five request-changes reviews. All five checked-in
production flags remain disabled pending accepted private historical replay.

This ledger tracks the request-changes review received on 2 September 2026.
The numbered rows match that review.

| # | Disposition | Resolution | Regression evidence |
|---:|---|---|---|
| 1 | Fixed | B3 starts from the prior block's proposal totals, applies same-block `Vote` logs in order, and verifies the replay against end-of-block state. It reports the exact event weight and does not use a later same-block weight read. | Same-block two-vote scanner test; exact B3 golden |
| 2 | Fixed | Stake- and aggregator-driven B14 actions retain the causal log and transaction. Epoch-only B14 remains synthetic and block-linked. | Stake-driven B14 source/footer test; exact B14 golden |
| 3 | Fixed | Suppress T7 when token amount and revenue are both zero, T11 when gross and YBC totals are both zero, and T12/T13 when the adjustment is zero. Evidence is still validated first. | Combined no-op scanner test |
| 4 | Fixed | Bonus claim runs are paired with their following YBC deposit. A multicall can produce one T11 and one B8 per source team. | Two-team multicall scanner test for both domains |
| 5 | Fixed | Hero and roster totals sum active members only. The label is “Total collective voting power.” | Removed-member mapper test; component and smoke assertions |
| 6 | Fixed | Every accepted log hash must match the canonical block hash. T1 also proves `Team.registry()`, `TeamRegistry.teams(index)`, and `TeamRegistry.is_team(team)` at the event block. | Orphan-log rejection and T1 positive-proof tests |
| 7 | Fixed | T1–T16 and B1–B14 have checked-in exact Telegram HTML snapshots. The focused matrix now covers companion failures and batches, vote and decay boundaries, expulsion eligibility, four B14 ramps plus suppression, repeated-range recovery, conditional renderers, and browser history. | Catalogue, companion, state, renderer, runtime, and YBC smoke suites |
| 8 | Fixed | Teams companions are matched by complete payload and consumed once. YBC membership calls are matched by operation and member, so unrelated calls are ignored while missing, duplicate, malformed, or contradictory evidence fails closed. | Teams companion reconciliation tests and YBC membership failure assertions |
| 9 | Fixed | Unknown or malformed proposal IDs are removed, other query parameters survive, and the URL always falls back to `#proposals`. | Component test and three smoke URL cases |
| 10 | Fixed | Controlled failures retain a validated reason, contract, block, transaction, and event where known. Arbitrary text and provider bodies stay redacted. | Durable-runtime diagnostic test |
| 11 | Fixed | Teams and YBC deployment values now originate in `lib/deployment.json`. Replay ABIs moved to the shared `lib/abis` authority and are pinned to a verified stYFI commit. | Typecheck, deployment assertions, and ABI-backed scanner tests |

## Follow-up review received 2 September 2026

| # | Disposition | Resolution | Regression evidence |
|---:|---|---|---|
| 1 | Fixed | T7, T9, and T10 match complete event payloads and consume companions in canonical order. Valid same-team, same-period batches no longer appear ambiguous; unmatched related extras fail closed. | Batched revenue in mixed and identical-payload order; batched claim/return; missing, malformed, and contradictory companion cases |
| 2 | Fixed | Runtime configuration requires exactly six confirmations and caps messages, ranges, and range size at 5, 6, and 10,000. Unsafe environment overrides are rejected. | Configuration boundary table |
| 3 | Fixed | `wrangler.alerts.jsonc` now commits all five domain flags as `false`, matching the inert-deploy runbook. | Wrangler dry-run binding inspection in the release gates |
| 4 | Superseded | This pass added useful focused coverage but did not name every mandatory companion and collective-power case. The third review rows below record the completed matrix. | Earlier vote, ramp, retry, renderer, and browser-history tests remain in place |
| 5 | Corrected | This conclusion was wrong for the pinned deployment because the aggregator quantizes weights in `1e6` units. The third review records the validated reconstruction. | Earlier boundary fixtures were retained and corrected below |

## Third review received 2 September 2026

| # | Disposition | Resolution | Regression evidence |
|---:|---|---|---|
| 1 | Superseded | This pass correctly restored the pinned-wrapper inverse, but applied its `1e6` quantum to every Election aggregator. The fourth review records aggregator-aware reconstruction. | The pinned-wrapper boundary fixtures remain in place and are extended below |
| 2 | Superseded | This pass completed the named companion and collective-power cases, but omitted independent domain recovery, renderer loss/precision variants, and two browser requirements. | The completed acceptance coverage is recorded in the fourth review |
| 3 | Corrected | Exact-block ENS resolution and rendering were added, but unsafe names still aborted the block instead of using the documented fallback. | The fourth review adds an unsafe-name fallback regression |

## Fourth review received 3 September 2026

| # | Disposition | Resolution | Regression evidence |
|---:|---|---|---|
| 1 | Superseded | The scanner replayed Election `SetWeightAggregator` events correctly, but its generic-aggregator fallback read the block's final state rather than vote-time state. The fifth review records the transaction-position fix. | The aggregator-order and pinned-wrapper fixtures remain in place and are extended below |
| 2 | Fixed | The remaining acceptance cases now cover cross-domain failure isolation and recovery, Teams loss and Teams/YBC precision, lifecycle and bonus alert links, and prohibited visible YBC copy. | Durable-runtime, product-renderer, Teams smoke, and YBC smoke assertions |
| 3 | Fixed | An ENS name that fails normalization or safety checks is treated as unresolved and renders the linked short address. Malformed ABI and contradictory resolver evidence still fail closed. | Unsafe directional-control name fallback plus resolved and empty-name cases |
| 4 | Fixed | The Alerts Worker compatibility date moved to `2026-09-03`; the runbook requires a compatibility review at least quarterly followed by the complete release gate and private replay. | Wrangler schema inspection and deployment dry run |

## Fifth review received 3 September 2026

| # | Disposition | Resolution | Regression evidence |
|---:|---|---|---|
| 1 | Fixed | Generic-aggregator B3 base weight now comes from the exact `weight(voter)` `STATICCALL` in a log-aware replay of the vote transaction. The scanner binds the canonical `Vote` by global log index and payload, limits candidate calls to those completed before the log, validates the returned ABI word, and verifies the decay result. It no longer uses end-of-block weight as vote-time evidence. | Same-block wrapper-to-generic transition where the traced weight is `1,234,567`, the later block state is `1,234,566`, and both floor to `617,283`; unavailable and wrong-position trace failures; RPC trace shape, request, and size-limit tests |

## Release gate still open

No private historical replay was supplied or accepted as part of this change.
All checked-in domain flags therefore remain `false`. Before Teams or YBC
production enablement, an operator must replay from each documented deployment
block, review the output and controlled failures, confirm the two Telegram chat
destinations, prove that the configured RPC returns log-aware call traces for
any generic-aggregator YBC vote, and record acceptance separately.
