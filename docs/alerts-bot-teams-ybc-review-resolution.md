# Teams and YBC alert review resolution

Status: code-complete; production flags remain disabled pending an accepted
private historical replay.

This ledger tracks the request-changes review received on 2 September 2026.
The numbered rows match that review.

| # | Disposition | Resolution | Regression evidence |
|---:|---|---|---|
| 1 | Fixed | B3 starts from the prior block's proposal totals, applies same-block `Vote` logs in order, and verifies the replay against end-of-block state. Undecayed weight comes from the event and contract time formula, not a later same-block read. | Same-block two-vote scanner test; exact B3 golden |
| 2 | Fixed | Stake- and aggregator-driven B14 actions retain the causal log and transaction. Epoch-only B14 remains synthetic and block-linked. | Stake-driven B14 source/footer test; exact B14 golden |
| 3 | Fixed | Suppress T7 when token amount and revenue are both zero, T11 when gross and YBC totals are both zero, and T12/T13 when the adjustment is zero. Evidence is still validated first. | Combined no-op scanner test |
| 4 | Fixed | Bonus claim runs are paired with their following YBC deposit. A multicall can produce one T11 and one B8 per source team. | Two-team multicall scanner test for both domains |
| 5 | Fixed | Hero and roster totals sum active members only. The label is “Total collective voting power.” | Removed-member mapper test; component and smoke assertions |
| 6 | Fixed | Every accepted log hash must match the canonical block hash. T1 also proves `Team.registry()`, `TeamRegistry.teams(index)`, and `TeamRegistry.is_team(team)` at the event block. | Orphan-log rejection and T1 positive-proof tests |
| 7 | Fixed | T1–T16 and B1–B14 now have checked-in exact Telegram HTML snapshots in the approved catalogue. Scanner regression coverage includes state, canonical evidence, vote ordering, B14, multi-team pairing, no-op behavior, and runtime replay controls. | Catalogue snapshot suite and product scanner suite |
| 8 | Fixed | Required companions use exact cardinality checks. Membership calls are matched by operation and member, so unrelated calls are ignored while duplicate or contradictory evidence fails closed. | Scanner companion paths and failure assertions |
| 9 | Fixed | Unknown or malformed proposal IDs are removed, other query parameters survive, and the URL always falls back to `#proposals`. | Component test and three smoke URL cases |
| 10 | Fixed | Controlled failures retain a validated reason, contract, block, transaction, and event where known. Arbitrary text and provider bodies stay redacted. | Durable-runtime diagnostic test |
| 11 | Fixed | Teams and YBC deployment values now originate in `lib/deployment.json`. Replay ABIs moved to the shared `lib/abis` authority and are pinned to a verified stYFI commit. | Typecheck, deployment assertions, and ABI-backed scanner tests |

## Release gate still open

No private historical replay was supplied or accepted as part of this change.
`ALERTS_TEAMS_ENABLED` and `ALERTS_YBC_ENABLED` therefore remain `false`. Before
production enablement, an operator must replay from each documented deployment
block, review the output and controlled failures, confirm the two Telegram chat
destinations, and record acceptance separately.
