# YBC voting interface refresh

Status: local implementation for product review.

## Scope

This package updates the overview and membership proposal board. It also exposes vote
events that the existing feed already supplies. The roster, rewards route, and operator
permissions retain their existing behavior.

## Review findings

| Area | Previous behavior | New behavior |
| --- | --- | --- |
| Overview | Large nested cards repeated weight and viewer information. | Compact collective metrics and a separate wallet summary. |
| Proposal list | Several expanded cards hid later proposals. | Collapsed rows show deadlines, results, and participation. |
| History | Active and closed proposals shared one long list. | Active, History, and All filters with search. |
| Voting status | Eligible voters could see an unavailable-action message. | Action copy follows permissions and recorded participation. |
| Voting record | The page discarded individual feed events. | Searchable records show identities, choices, weights, dates, and transactions. |
| Thresholds | Rounded values could imply that a near-threshold result passed. | Exact integer comparisons determine the displayed threshold state. |
| Identity | Interactive explorer controls sat inside disclosure summaries. | Canonical addresses appear inside expanded details and voter rows. |

## Acceptance criteria

- Desktop and 360px layouts contain proposal names, addresses, dates, and controls.
- Keyboard users can select filters and open or close proposal details.
- Proposal deep links select the matching filter and remain usable with browser history.
- Empty, observer, blocked, recorded-vote, and closed states have persistent explanations.
- Vote records remain separate from canonical aggregate totals.
- Proposal actions use the existing transaction pipeline and eligibility checks.
- Required repository checks pass before the implementation is ready for review.

## Limits

Individual feed events are source records. The app does not independently verify every
event or infer that the record list is complete. An unavailable vote choice remains
unknown. Local browser tests use deterministic mock data and simulated transactions.

This package adds no dependency, contract write, deployment configuration, or production
exposure. Product acceptance and live preproduction validation remain separate gates.

## Member activation and shared components

Owner feedback requested clear zero-stake states and closer reuse of DAO components.

- Zero stake is empty, even if an older maturity field says 100%.
- Positive stake with no active weight shows 0% active and its remaining weight.
- Partial activation preserves current weight and shows only the remaining weight as ramping.
- Fully active stakes omit old maturity dates. Removed members have no active progress.
- The wallet summary, roster table, and roster cards use the same activation component.
- DAO's detailed and compact vote bars and YBC's vote bars use one shared VoteResultsBar.
- Preview fixtures include no stake, new stake, 50%, 75%, and fully active states.

The feed provides aggregate weights, not deposit batches. The UI does not attribute
remaining weight to a particular deposit or estimate an unavailable maturity date.
This follow-up changes display state only; voting and proposal permissions are unchanged.
