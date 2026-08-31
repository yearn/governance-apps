# Governance alerts bot runbook

## Scope

This runbook covers `governance-alerts-bot-v2`, the three-domain replacement
for the live `governance-alerts-bot` singleton. The v2 Worker owns three
independent Durable Object instances and three Telegram destinations. It does
not migrate or adopt the old singleton's cursor.

The two Workers run side by side while the v2 histories are replayed and
reviewed privately. The old Worker continues serving its existing combined
chat until an explicit cutover. `governance-alerts-bot-v2` is the permanent
production identity after cutover; it must not be renamed back to the old
Worker name.

No command in this document should be run against production until the code
review and local verification gates pass.

## Production shape

| Worker | Purpose during rollout | Destination |
| --- | --- | --- |
| `governance-alerts-bot` | Existing live singleton; leave unchanged | Existing combined chat |
| `governance-alerts-bot-v2` | New permanent Worker; replay privately | Three final domain chats |

| Domain | Durable Object | Telegram destination | Start block |
| --- | --- | --- | ---: |
| stYFI | `alerts:styfi:v1` | final private stYFI chat | 24,386,915 |
| veYFI | `alerts:veyfi:v1` | final private veYFI chat | 24,386,915 |
| yETH | `alerts:yeth:v1` | final private yETH chat | 24,522,098 |

Each object stores one versioned state record and immutable event receipts. The
state contains the cursor and terminal hash, redacted run status, Telegram
backoff, and yETH accounting where relevant. It does not contain chat IDs,
tokens, endpoints, warning leases, migration phases, or rollback generations.

## Configuration

Set these as Cloudflare secrets, never as committed values:

- `RPC_URL`: archive-capable Ethereum RPC.
- `TELEGRAM_BOT_TOKEN`.
- `STYFI_TELEGRAM_CHAT_ID`.
- `VEYFI_TELEGRAM_CHAT_ID`.
- `YETH_TELEGRAM_CHAT_ID`.
- `ADMIN_TOKEN`: bearer token for `GET /status`.

The committed variables are deliberately inert:

```text
ALERTS_STYFI_ENABLED=false
ALERTS_VEYFI_ENABLED=false
ALERTS_YETH_ENABLED=false
CONFIRMATIONS=6
MAX_MESSAGES_PER_RUN=5
MAX_RANGES_PER_RUN=6
LOG_RANGE_SIZE=10000
YETH_DAILY_CHECKPOINT_BLOCKS=7200
YETH_DAILY_MIN_DELTA_ETH=5
```

An enabled domain without its chat ID fails closed. If no domains are enabled,
the cron performs no RPC or Telegram work.

## Rate and capacity choices

The Worker now runs on Cloudflare's paid plan. It therefore uses simple bounds
instead of the old free-tier request ledger:

- one cron invocation per minute;
- up to six 10,000-block ranges per domain run while catching up;
- log-range halving only when the RPC explicitly rejects the range size;
- block headers loaded only for event blocks and range terminals, not every
  block in a range;
- exact-block RPC batches limited to 25 calls;
- five Telegram messages per domain run, sent in order about 1.1 seconds apart;
- persisted Telegram `retry_after` backoff.

These settings catch up quickly without doing repeated head scans or consuming
capacity that has no user benefit.

## yETH cadence

Y1–Y4 are emitted from claim and withdrawal events. Y5 is derived when those
events reduce outstanding recovery debt. Y6–Y9 are evaluated once per fixed
7,200-block checkpoint. The scanner does not inspect every block for protocol
metric changes.

The committed daily materiality threshold is 5 ETH. Before yETH is opened to
users, review the complete replay history and the structured
`alert_yeth_daily_checkpoint` records. Those records include every candidate
delta and whether the configured threshold emitted it. A threshold change must
update the catalogue examples and focused tests. The first checkpoint
establishes a baseline and sends no protocol message.

## Status and failures

`GET /status` requires:

```text
Authorization: Bearer <ADMIN_TOKEN>
```

It returns only redacted domain state: cursor, cursor hash, last observed
confirmed head, caught-up state, last run and success times, last error code,
and Telegram backoff expiry.

There is no automatic health monitor in this release. During replay and the
first production week, check status and structured logs manually. A scanner,
context, rendering, cursor-hash, RPC, or Telegram failure leaves the domain at
its saved cursor for retry. Unknown monitored data is never silently skipped.

## Local release gates

Run at minimum:

```bash
npm run typecheck -- --incremental false
npm run lint
npm run validate:deps
npm run test
npm run alerts:catalogue-examples
npx wrangler deploy --dry-run --config wrangler.alerts.jsonc
git diff --check master...
```

The dry run must not deploy. Confirm that all three enable flags remain false
and that the working tree is clean after the release commit.

## Bounded rollout

Run production commands from a clean checkout of the exact reviewed release
commit, preferably after the accepted `agent/data` range has been merged to
`master`. Confirm the configured Worker identity before every deploy:

```fish
git status --short
git rev-parse HEAD
rg '"name"|"ALERTS_.*_ENABLED"' wrangler.alerts.jsonc
npx wrangler whoami
```

The name must be `governance-alerts-bot-v2`, and all three flags must initially
be `false`.

### 1. Prepare final destinations

1. Create the final stYFI, veYFI, and yETH Telegram chats and keep them private.
2. Add the bot to each chat with permission to post.
3. Record the three final chat IDs. Never use the old combined chat ID for a v2
   destination.

Do not replay into a temporary chat and then change its destination. Event
receipts belong to the final destination history.

### 2. Deploy v2 inert

Run the local release gates, then create the separate Worker while every domain
is disabled:

```fish
npx wrangler deploy --dry-run --config wrangler.alerts.jsonc
npx wrangler deploy --config wrangler.alerts.jsonc
```

The deploy output must identify `governance-alerts-bot-v2`. At this point the
old `governance-alerts-bot` continues running unchanged, and v2 performs no RPC
or Telegram work.

### 3. Configure v2 secrets

Wrangler prompts for each value without writing it to the repository:

```fish
npx wrangler secret put RPC_URL --config wrangler.alerts.jsonc
npx wrangler secret put TELEGRAM_BOT_TOKEN --config wrangler.alerts.jsonc
npx wrangler secret put STYFI_TELEGRAM_CHAT_ID --config wrangler.alerts.jsonc
npx wrangler secret put VEYFI_TELEGRAM_CHAT_ID --config wrangler.alerts.jsonc
npx wrangler secret put YETH_TELEGRAM_CHAT_ID --config wrangler.alerts.jsonc
npx wrangler secret put ADMIN_TOKEN --config wrangler.alerts.jsonc
```

Each `secret put` creates a Worker version. This is safe only because all three
domain flags remain disabled.

Use the `workers.dev` URL printed by the deploy command to verify the redacted
status response:

```fish
set alerts_v2_url 'https://governance-alerts-bot-v2.<workers-subdomain>.workers.dev'
read --silent --prompt-str 'v2 ADMIN_TOKEN: ' alerts_v2_admin_token
curl --fail --silent --show-error \
  --header "Authorization: Bearer $alerts_v2_admin_token" \
  "$alerts_v2_url/status" | jq
set -e alerts_v2_admin_token
```

Keep a second terminal available for structured logs:

```fish
npx wrangler tail governance-alerts-bot-v2 --format pretty
```

### 4. Replay stYFI

Change only `ALERTS_STYFI_ENABLED` to `true` in `wrangler.alerts.jsonc`, review
the diff, commit the operational change, and redeploy:

```fish
git diff --check
git diff -- wrangler.alerts.jsonc
git add wrangler.alerts.jsonc
git commit -m "chore(alerts): enable stYFI v2 replay"
npx wrangler deploy --config wrangler.alerts.jsonc
```

The new stYFI object starts at block 24,386,915. Poll the authenticated status
route until stYFI reports `caughtUp: true`. Review the entire private history,
links, ordering, amounts, account context, and formatting. Pin the approved
stYFI introduction manually only after acceptance.

### 5. Replay veYFI

Leave stYFI enabled, change only `ALERTS_VEYFI_ENABLED` to `true`, then repeat
the review, commit, and deploy sequence:

```fish
git diff --check
git diff -- wrangler.alerts.jsonc
git add wrangler.alerts.jsonc
git commit -m "chore(alerts): enable veYFI v2 replay"
npx wrangler deploy --config wrangler.alerts.jsonc
```

Wait for veYFI to report `caughtUp: true`, approve its complete private
history, and then pin its introduction.

### 6. Replay yETH

Leave stYFI and veYFI enabled, change only `ALERTS_YETH_ENABLED` to `true`, then
commit and deploy:

```fish
git diff --check
git diff -- wrangler.alerts.jsonc
git add wrangler.alerts.jsonc
git commit -m "chore(alerts): enable yETH v2 replay"
npx wrangler deploy --config wrangler.alerts.jsonc
```

Wait for yETH to report `caughtUp: true`. Review Y1–Y5, every structured
`alert_yeth_daily_checkpoint` record, and the complete set of daily checkpoint
candidates before accepting the 5 ETH threshold. Pin the yETH introduction
only after approval.

### 7. Observe privately and cut over

Keep both Workers live briefly after all three v2 domains are caught up. They
scan the same chain but deliver to different chats: the old Worker protects
existing coverage while the final v2 histories remain private.

Immediately before cutover, confirm all three v2 domains are caught up and have
recent successful runs. Then disable the old singleton using its existing
authenticated endpoint:

```fish
set alerts_v1_url 'https://governance-alerts-bot.<workers-subdomain>.workers.dev'
read --silent --prompt-str 'v1 ADMIN_TOKEN: ' alerts_v1_admin_token
curl --fail --silent --show-error --request POST \
  --header "Authorization: Bearer $alerts_v1_admin_token" \
  "$alerts_v1_url/admin/disable"
set -e alerts_v1_admin_token
```

Confirm the response is `disabled`, the old chat stops receiving alerts, and
v2 continues processing. Pin a redirect in the old chat, then invite users to
the three new chats.

Keep the old Worker deployed but disabled through the first production week.
Retiring or deleting it is a separate destructive operation and is not part of
this rollout.

## Rejecting a replay

If reviewers reject a private chat's history:

1. Disable that domain.
2. Keep the rejected chat private.
3. Create a new final chat.
4. Bump only that domain's object name from `v1` to `v2` in a reviewed commit.
5. Update its chat-ID secret and replay from the canonical start block.

Do not add a reset endpoint or mutate production Durable Object storage to
force a replay. A new versioned object is simpler and leaves an auditable path.

## Pause and recovery

Set a domain's enable flag to `false` and redeploy to pause it. Its cursor and
receipts remain intact. Re-enabling resumes from that cursor.

The old singleton and v2 may deliver concurrently only during private replay,
when their destinations are distinct. Never point a v2 domain at the old
combined chat.

To roll back after cutover, first call the old singleton's authenticated
`/admin/enable` endpoint so coverage resumes immediately. Then set all three v2
enable flags to `false` and redeploy v2. A brief overlap across distinct chats
is preferable to a delivery gap. Do not call either old reset endpoint.

The duplicate window after Telegram accepts a message but before its receipt is
written cannot be removed without an external transactional sender. If it
occurs, keep the duplicate in history or remove it manually after comparing the
transaction link and block.
