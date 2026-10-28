# YBC voting interface refresh

Status: local follow-up to PR #139, for product review.

## Scope

The overview shows available YBC voting power and its share of all DAO voting power.
A full-width bar uses the shared DAO component: solid blue for members' own power,
patterned blue for power steered by YBC, and gray for other DAO power. Hover, focus,
or tap the bar for amounts and percentages.
Proposals, Members, and Rewards use the same line tabs as DAO. The Operator tab
remains limited to authorized wallets.

The proposal board retains collapsed rows, lifecycle filters, voting records,
precise threshold comparisons, and the existing transaction pipeline.

## Overview and member positions

- Show available YBC voting power as members' own power plus the stYFIx and YBC pools.
- Read the system total from the validated DAO voting-power index. Verify membership,
  direct member power, and both pools at that index's canonical block.
- The roster feed supplies candidate addresses only; it can use a different block.
  Check the complete member count and indexed per-account weights before showing a share.
- Reject stale totals (over 300 seconds or across an epoch), reorgs, and inconsistent sums.
  Recheck freshness while the page remains open.
- Without a verified nonzero denominator, show DAO share unavailable and an empty bar.
  Independently verified absolute YBC power can remain visible.
- Member position reads remain at the roster snapshot block.
- Exclude pool addresses from the members' own total to prevent double counting.
- Explain that actual influence depends on participation and voting time.
- Keep the observer, member, or operator explanation in a compact accessible badge.
- Remove epoch, proposal counts, and the separate wallet summary from the header.
- Use Table by default, with Distribution as a saved preference.
- Show staked YFI, current YBC weight, share of YBC weight, and position state.
- Use shared tooltips to explain these terms. YBC share describes collective voting
  allocation, not ownership of the underlying delegated stake.

The distribution chart uses current YBC weights. Hover, focus, click, Enter, or
Space selects a member and shows their position. The legend includes zero-weight
members. Removed members contribute no weight. An all-zero roster has an empty state.

## Activation and withdrawal states

Zero stake shows No stake. Positive stake below the contract's weight precision
shows Below voting precision. Neither state shows activation progress.

For an activating position, show current weight, attainable full weight, and the
date full weight becomes available if the position does not change. The projection
uses the contract's four packed epoch slots, including YBC's membership ramp.
Round full weight down to the contract's 1e6-wei precision.

Read withdrawal streams from stYFI and the three liquid locker depositors. Sum
unwithdrawn amounts in YFI equivalents. Do not apply the locker scale twice.
Unstaking includes unlocked funds that have not been withdrawn. It can appear
alongside Activating because withdrawals and new deposits can overlap.

Position badges have a consistent visible height, separate from their larger touch
targets. Rows reserve two lines for position details and use equal vertical padding.
Desktop rows have the same minimum height and can grow for enlarged text.

The UI does not infer deposit batches from aggregate weights. If verified schedule
data is unavailable, label a feed date as an estimate. Failed withdrawal reads
remain unknown. Do not interpret them as zero withdrawals.

## Rewards

stYFI owns the shared claim flow and already accounts for YBC reward income.
The Rewards tab explains this and links directly to stYFI's rewards section.
It does not repeat unverified reward balances or add another claim action.
Observers can follow the link because they may hold stYFI outside YBC.

## Shared components

Use the existing Tabs, Table, Tooltip, VoteResultsBar, ViewToggle, MemberIdentity,
and UTC date components. DAO and YBC share VoteResultsBar, with Yearn blue for
yea and neutral gray for nay. The distribution chart is a small accessible SVG;
this package adds no chart dependency.

## Acceptance criteria

- Desktop and 360px layouts contain names, addresses, dates, and controls.
- Tabs support keyboard selection, deep links, and browser history.
- Proposal links open the matching row and preserve unrelated query parameters.
- Switching tabs retains proposal filters and member display preferences.
- Help controls work with hover, focus, touch, and Escape.
- No-stake, activating, active, unstaking, and overlapping states are distinct.
- Missing DAO power shows unavailable values, never internal YBC weight as a substitute.
- Canonical proposal totals remain separate from individual feed events.
- Proposal and operator permissions remain unchanged.
- Required repository checks and independent reviews pass.

## Limits and sources

Browser checks use deterministic mocks and simulated transactions. Live contract
reads require a verified feed block and fail closed on roster or weight mismatch.
Individual vote events remain publisher records; the app does not prove completeness.

The weight schedule follows
[YBCWeightAggregator](https://github.com/yearn/stYFI/blob/9389a7c/contracts/ybc/YBCWeightAggregator.vy).
The power split follows
[Voter](https://github.com/yearn/stYFI/blob/001dda500be30e16d0837f8e7e05a75c8fe9710f/contracts/governance/Voter.vy).
Withdrawal amounts follow
[StakedYFI](https://github.com/yearn/stYFI/blob/001dda500be30e16d0837f8e7e05a75c8fe9710f/contracts/StakedYFI.vy)
and
[LiquidLockerDepositor](https://github.com/yearn/stYFI/blob/001dda500be30e16d0837f8e7e05a75c8fe9710f/contracts/LiquidLockerDepositor.vy).

The shared voting-power endpoint is available when either DAO or YBC is enabled.
The YBC percentage requires NEXT_PUBLIC_DAO_VOTING_POWER_URL; without it, the
absolute overview remains available. No feature flags or deployments are enabled.
No dependencies or contract writes change.
Product acceptance and live preproduction validation remain separate gates.
