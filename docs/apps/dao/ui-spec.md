# DAO Governance UI Specification

## 1. Design stance

DAO Governance is a reading and decision surface, not an analytics dashboard.
Proposal content and the current action come first. Timing, rules, provenance,
and raw contract data stay available without competing for attention.

Use the established route shell, Yearn blue, neutral surfaces, shared controls,
and route-local messages. Avoid decorative governance imagery, glass effects,
large marketing heroes, and nested cards for every metadata group.

## 2. Information architecture

```text
/dao
  proposal list
  active/upcoming/closed filters
  proposal creation entry point

/dao/proposals/[id]
  proposal header and outcome
  immutable content and forum discussion
  vote/action panel
  lifecycle and results
  execution analysis
  technical details

/dao/propose
  forum discussion
  immutable content
  signal/executable selection
  full script input and structural checks
  review, publish, and propose
```

## 3. Proposal list

### Header

- Title: `DAO Governance`
- Supporting copy: `Review proposals and take part in Yearn DAO decisions.`
- Primary action: `Create proposal`
- Do not call the product `Yearn Governance`; `gov.yearn.fi` already names the
  forum surface.

### Filters

Use a compact segmented control or tabs:

- Active
- Upcoming
- Closed

The default is `Active`. Preserve the selection in the URL only if an existing
shared pattern already supports it cleanly.

### Proposal row or card

Each item contains:

- status badge;
- `Signal` or `Executable` label;
- proposal ID and title;
- proposer identity;
- relevant start/end time;
- Yea/Nay bar and percentages;
- `of votes cast` caption;
- quiet execution indicator for executable proposals;
- content or discussion warning only when needed.

Prefer a dense list on desktop and stacked rows on mobile. Do not create a large
tile grid. Status, title, and timing must scan in that order.

### Empty and error states

- No active proposals: link to upcoming and closed proposals. Show the next
  scheduled vote only when an upcoming proposal supplies that time.
- No proposals at all: show a neutral empty state and proposal CTA.
- Feed unavailable: keep the shell and show retry plus the last-good snapshot
  time when available.

## 4. Proposal detail

### Header block

Show:

- proposal ID;
- title;
- status;
- type;
- proposer;
- primary timing statement;
- forum discussion link;
- IPFS or content warning when applicable.

The primary timing statement uses one clear line such as:

- `Voting opens in 3 days`
- `Voting ends in 18 hours`
- `Approved on 14 August 2026`
- `Execution expires in 2 days`

Countdowns use tabular numerals.

### Desktop layout

Use a main reading column and a narrower action column. The action panel may
remain visible while reading when viewport height permits, but it must not cover
the footer or technical details.

```text
┌─────────────────────────────────────┬──────────────────────┐
│ Header and proposal content         │ Vote/action panel    │
│                                     │                      │
│ Specification                       │ Weight and choices   │
│                                     │                      │
│ Lifecycle and results               │ Eligibility reason   │
│                                     │                      │
│ Execution analysis                  │ Contextual action    │
└─────────────────────────────────────┴──────────────────────┘
```

On mobile, the action panel follows the header and precedes the long proposal
body. Users should not have to read to the bottom before finding an open vote.

### Vote results

Use one horizontal Yea/Nay bar with exact percentages and weights. Supporting
copy:

```text
62% Yea · 38% Nay
of votes cast · 55% approval threshold
```

The rules disclosure contains:

> No minimum turnout is required.

Do not use a warning banner for the no-quorum rule.

### Vote panel

States:

- wallet disconnected;
- wrong network;
- no voting weight;
- scheduled but not open;
- open and eligible;
- late-weight decay;
- already voted;
- participation-only after veto;
- transaction pending;
- awaiting feed indexing;
- closed.

Yea and Nay are equal-weight choices until selected. Neither is preselected.
Confirmation shows direction, effective weight, proposal title, and that the vote
cannot be changed through the public Voter.

Post-veto participation uses a restrained persistent notice, not an alarming
full-page banner:

> This proposal has been vetoed and cannot be approved or executed. You may
> still vote to record your participation.

### Signal outcome

Show:

```text
Approved
No executable actions
```

Do not display `Executed` as the primary outcome for an empty script.

### Execution analysis

The section contains:

- analysis state;
- proposal-time simulation result and block;
- ordered calls;
- target name and address;
- function and arguments for verified decoding;
- raw selector and calldata for unknown calls;
- script hash verification;
- current execution simulation when the action is available.

Possible labels:

- `Analysis pending`
- `Decoded · simulation succeeded`
- `Partially decoded · simulation succeeded`
- `Simulation failed`
- `Unable to decode`

Never use `Safe` as a status.

### Technical details

Use a disclosure for:

- chain ID;
- Voting and Voter addresses;
- proposal identity;
- creation transaction and block;
- raw contract status;
- content CID and digest;
- script hash and bytes;
- flag or veto event details;
- feed snapshot block and time.

Long values use copy controls with at least 40-pixel hit areas. Code blocks wrap
or scroll within their own region; the page itself must not overflow.

## 5. Proposal authoring

Use a single-page stepped form with visible sections rather than a modal wizard.
Preserve entered values when a later section fails.

### Section 1: discussion

- Field: `Forum discussion`
- Accept only `https://gov.yearn.fi/t/.../<topicId>` in the supported app flow.
- Mock mode provides deterministic valid, missing, wrong-category, and unavailable
  responses.
- Successful validation shows normalized title, category, author, and creation
  time.

Copy should not promise that the app enforces governance policy on direct
contract callers.

### Section 2: proposal content

- Title
- Summary
- Specification
- Optional supporting links, if the content schema includes them

Explain that these fields become the immutable proposal snapshot. The forum may
continue to change.

### Section 3: proposal type

Use two choices:

- `Signal`: `Records a DAO decision without executable calls.`
- `Executable`: `Includes an onchain script prepared with development tools.`

### Section 4: execution script

Only for `Executable`:

- multiline monospace input;
- full `0x`-prefixed Executor script;
- byte count and call count;
- first structural error with byte offset;
- target and calldata-size list;
- computed script hash.

Valid-state copy:

> Script structure is valid: 3 calls, 684 bytes.

Supporting copy:

> Detailed decoding and simulation will be published on the proposal page after
> submission.

### Section 5: review and submit

Review exact forum data, immutable content, type, script, hash, calls, current
eligibility, expected voting epoch, and the two submission steps.

Mock submission and follow-up steps:

1. Publish proposal content
2. Create onchain proposal
3. Wait for proposal indexing and analysis

Keep IPFS publication failure separate from wallet rejection or onchain revert.

## 6. Lifecycle menus

Retraction, flagging, and veto are destructive to the proposal lifecycle. Place
them in a contextual action area, require explicit confirmation, and show the
contract effect before signing.

Do not hide a currently available primary vote or execute action inside an
overflow menu. Role actions may use a secondary disclosure because most users
will never have them.

## 7. Shared debug controls

DAO controls live in the existing floating debug panel. No route-local scenario
bar or mock badge appears in the normal app.

Required groups:

- Persona: observer, voter, proposer, operator, guardian
- Content: available, unavailable, invalid, unverified forum
- Lifecycle: discussion, voting, approved, rejected, expired, retracted, flagged
- Veto: before votes, after votes
- Analysis: pending, decoded, partial, failed, hash mismatch
- Account: weight, no weight, already voted, late-decayed, disconnected, wrong network
- Execution: signal, executable, guarded, permissionless, simulation failure
- Authoring: valid signal, valid script, invalid frame, too many calls, too large
- Transaction: success, wallet rejection, revert, network error, index pending,
  clear pending

Personas are presets, not exclusive role types. After loading a preset, QA can
toggle proposer, operator, and guardian facts independently to cover combined
roles.

Reuse shared `+1 day`, `+7 days`, and `Reset App`. Time travel changes proposal
capabilities through domain logic rather than swapping a display label.

## 8. Responsive and accessibility requirements

- Use a 44-pixel target where space permits and never less than 40 pixels.
- Preserve visible focus and logical tab order.
- Status, Yea, Nay, warnings, and success are not color-only.
- Headings use balanced wrapping; short explanatory copy uses pretty wrapping.
- Dynamic weights, percentages, epochs, and timers use tabular numerals.
- Respect reduced motion. Interactive transitions are short and interruptible.
- Do not use `transition-all`.
- Confirmation dialogs restore focus to their trigger when closed.
- Script errors connect to the textarea with accessible description attributes.

## 9. Review widths

Review at minimum:

- 390-pixel phone;
- 768-pixel tablet;
- 1280-pixel desktop;
- a short-height desktop viewport for sticky-panel behavior.

The M2 acceptance review must cover every state in the mock schema, not only the
default proposal.

## 10. M1 route shell boundary

The first route package establishes production-shaped shells before the M2
proposal interactions:

- `/dao` reads the deterministic client and distinguishes loading, empty,
  ready, error, and disconnected states.
- `/dao/proposals/[id]` resolves numeric IDs against the active mock Voting
  contract and distinguishes loading, ready, not-found, error, and disconnected
  states.
- `/dao/propose` reads proposer eligibility for a connected wallet and shows a
  disconnected, loading, ready, or error shell without rendering the M2 form.
- Every shell keeps `DAO Governance` as its header identity. The forum link is
  labeled as a discussion surface and remains `gov.yearn.fi`.
- The routes are available by path in development and preview. Production
  runtime returns not found until the rollout package adds the final feature
  flag and data invariants.
- `dao.yearn.fi` is not registered for host routing, canonical metadata,
  sitemap publication, or other discovery during M1.

## 11. M2 read-only mock behavior

The proposal board consumes each proposal's domain-provided `displayGroup` for
the `Active`, `Upcoming`, and `Closed` filters. Rows remain dense on desktop and
stack on smaller screens. Status, title, timing, author, vote percentages, the
`of votes cast` caption, proposal type, discussion provenance, and content
failures stay visible without a wallet.

When the active filter is empty, its empty state provides keyboard-accessible
shortcuts to the upcoming and closed groups. It reports the earliest upcoming
vote time only when an upcoming proposal supplies one; filter membership and
counts continue to use the domain-provided `displayGroup` rather than
recalculating lifecycle status in the UI.

A refresh or synthetic feed error preserves the last successfully surfaced
feed as a stale board beneath a restrained outage notice and retry control. The
notice labels the last successful snapshot using `canonicalBlock.timestamp`.
An initial request that has never surfaced a successful feed remains a distinct
cold-start error and does not reveal an in-flight response as last-good data.

The read-only detail surface keeps four trust layers distinct:

1. immutable proposal content and its validation state;
2. contract lifecycle, vote results, and terminal events;
3. producer-owned decoding and proposal-time simulation, including provenance;
4. raw onchain identity and feed metadata in the technical disclosure.

Proposal content and technical feed metadata render from one read envelope. A
proposal is ready only when its serialized composite reference resolves inside
that same surfaced feed; a proposal found by an older or hidden query is not
combined with a newer empty or mismatched feed. The technical feed snapshot time
comes from `canonicalBlock.timestamp`, independently of producer generation
time.

Producer-owned provenance values render verbatim. The read layer maps only
explicitly supported producer error codes to public explanations; it does not
rewrite arbitrary registry, engine, contract, function, ABI-source, or error
text. Fixture source data uses production-shaped presentation values so the
public route never explains its test implementation.

Unavailable or invalid immutable content replaces only the content body. The
proposal identity, status, timing, vote results, discussion state, lifecycle,
and technical record remain available. Unknown calls retain target, selector,
calldata, byte size, and the absence of a verified ABI source. Long identifiers,
addresses, hashes, and scripts scroll or wrap inside their own regions rather
than widening the page. Copy controls for Voting, Voter, Executor, and call
target addresses stay visibly available with at least 40-pixel targets for
coarse pointers while desktop explorer links retain their new-tab behavior.

An approved signal uses `Approved` as its primary outcome and always pairs it
with `No executable actions`, even when its raw contract status is `EXECUTED`.
The rules disclosure says `No minimum turnout is required.` without presenting
that rule as an alert.

## 12. M2 mock action behavior

The detail sidebar now places `Your action` before vote results. On phone and
tablet widths the whole sidebar precedes immutable content; on desktop it stays
in the right column without becoming a height-obscuring sticky panel.

The action panel renders only account facts and capability reasons supplied by
the DAO client. Yea and Nay start unselected. A vote review repeats the selected
direction, proposal title, effective weight, original weight and decay when
applicable, and the public-Voter irreversibility. A post-vote veto retains the
same binary choices under the participation notice; an early veto exposes no
vote choice.

Unavailable immutable content requires one acknowledgement before voting.
Invalid immutable content requires that acknowledgement plus a separate review
of the available onchain record. These warnings do not alter client-supplied
authorization.

Retract, flag, and veto remain in the lifecycle disclosure. Their dialogs state
the exact lifecycle effect; flag and veto reasons are required and limited to
256 UTF-8 bytes. Execute is present only for executable proposals, stays disabled
with the client-supplied reason until its supplied capability is true, and never
appears for a signal. Its review uses the accepted script hash, guard, and
current-state preflight facts already in the mock client. It does not perform a
new simulation or submit an onchain transaction.

All five actions prepare through the DAO client and execute through shared
`useTx`. Normal route copy says `Transaction submitted.` and never exposes a
mock label. A successful mock submission updates live account authorization and
enters `awaiting proposal indexing`; canonical proposal totals, status,
moderation, and event history remain unchanged until the debug indexer applies
the pending event. Wallet rejection, revert, and network failure create no
pending action.

Confirmation dialogs are modal, trap focus, close with Escape or the backdrop,
and restore focus to their trigger. Action targets remain at least 40 pixels,
focus remains visible, and reduced-motion mode removes interactive transitions.
