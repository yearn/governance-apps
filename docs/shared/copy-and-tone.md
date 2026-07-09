# 7. Copywriting & Tone of Voice

**Version:** 1.2
**Sources:** Yearn Tone of Voice Guide, Plain English review rules
**Scope:** All user-facing text, error messages, toasts, tooltips, and route
documentation that defines user-visible behavior.

---

## 1. Product Register

Write code, talk human.

Governance Apps is a calm, precise product UI for finance and governance work.
Copy should help users understand state, risk, and the next action without
sounding like a contract error, a marketing page, or an AI assistant.

Use Plain English as a review lens, not as a blind rewrite rule. It adds useful
pressure to cut filler, vague words, and AI-style prose. It does not override
canonical token names, contract names, protocol terms, legal/security wording,
or domain terms that carry real meaning.

## 2. Repository Rules

- Keep route copy in `app/<domain>/messages.ts`.
- Keep shared shell copy in `app/_shared/messages.ts`.
- Keep shared components copy-agnostic. Components accept strings or ReactNodes
  through props and do not import route `messages.ts` directly.
- Avoid inline strings longer than about 60 characters in components unless the
  string is an accessibility attribute.
- Dynamic text belongs in message functions, for example
  `positionSummary(amount: string) => string`.
- Mature default routes must not show mock, prototype, QA, or implementation
  wording. Those controls belong in the shared debug panel, local test bridges,
  docs, or test-only routes.
- Blocked, terminal, loading, empty, permissioned, and read-only states need
  persistent visible copy. Tooltip-only explanations are not enough.
- Never show raw contract errors. Map them to user-readable messages.

## 3. Plain English Rules

Use these checks before review:

- Cut filler: "it is important to note that", "in order to", "due to the fact
  that", "it is worth noting", and similar throat-clearing.
- Prefer active verbs and concrete nouns.
- Use short words when they do the same job.
- Avoid AI/corporate words such as "delve", "tapestry", "leverage",
  "landscape", "realm", "multifaceted", "foster", "underscore", "robust",
  "comprehensive", "nuanced", "paramount", "crucial", "holistic", "pivotal",
  "facilitate", "utilize", "ameliorate", "expedite", "methodology",
  "commence", "terminate", "endeavour", "numerous", and "approximately".
- Allowed exception: keep a word when it is the product term, canonical label,
  or technically precise term. For example, "Ecosystem" is allowed as a header
  navigation label and "stYFI ecosystem" is allowed when it means the actual
  product family.
- Avoid false cheer, apologies without action, and preambles.
- Avoid hedge stacks. Say what is known, what is unknown, and what the user can
  do next.

## 4. UI Text Patterns

### Errors

Errors should answer:

1. What happened?
2. Why did it happen, if known?
3. What can the user do next?

| Context | Avoid | Use |
| :-- | :-- | :-- |
| Slippage | `Error: execution reverted` | "Slippage is too high. Increase tolerance and try again." |
| Rejected transaction | `UserRejectedRequestError` | "Transaction cancelled." |
| Cap hit | `Limit exceeded` | "Global deposit limit reached. You cannot stake more right now." |
| Restricted address | `Access Denied` | "This address is restricted from using this action." |

Do not use jokes in errors, permission states, risk disclosures, or money-moving
actions.

### Buttons and CTAs

Use specific verb plus object labels:

- "Stake YFI"
- "Withdraw YFI"
- "Claim rewards"
- "Connect wallet"
- "Switch network"

Avoid generic labels such as "Submit", "Proceed", "OK", and "Click here" unless
the surrounding UI makes the action fully obvious and there is no better compact
label. Use exact governance or protocol verbs when they are the real action, for
example "Execute proposal".

### Empty and Loading States

Empty states should explain whether the state is normal, blocked, or waiting
for user action.

Loading states should describe the work when it may last more than a brief
moment, for example "Loading proposal data" rather than only "Loading".

### Success States

Success copy should confirm the specific result. Celebration is allowed for
low-risk wins, but the default tone is restrained:

- "Stake confirmed."
- "Rewards claimed."
- "Settings saved."

## 5. Capitalization and Labels

- Use sentence case for helper text, errors, tooltips, toasts, and
  full-sentence copy.
- For headings and buttons, keep capitalization consistent within the route and
  control group. Prefer sentence case when adding new labels, but do not mix a
  single sentence-case label into an established title-case cluster. Convert
  route capitalization as an intentional route-wide copy pass.
- Use title case only for compact metric names, table labels, and canonical
  domain labels when that matches the existing app pattern, for example
  "Total Supply", "Claim Deadline", "Current Base APR", and "Recovery Vault".
- Do not title-case full sentences.
- Do not add periods to labels. Use periods for full sentences.
- Use `Aeonik Mono` / `font-number` for financial data, addresses, hashes,
  percentages, IDs, and dynamic counters.

## 6. Glossary

| Term | Usage |
| :-- | :-- |
| stYFI | Always lowercase `st`, uppercase `YFI`. |
| stYFIx | Always lowercase `st`, uppercase `YFI`, lowercase `x`. |
| veYFI | Always lowercase `ve`, uppercase `YFI`. |
| LLYFI | Liquid locker YFI token family. |
| Active | Funds currently staked, delegated, or otherwise in the active product state. |
| Unstaking | Funds currently in the linear cooldown stream. |
| Withdrawable | Funds fully unlocked but not yet withdrawn. |
| Gauge | The staking contract for BPT/LP tokens. |
| Vote weight | The power used in governance. |
| Terminal | A state that cannot return to active without a new proposal, position, or flow. |
