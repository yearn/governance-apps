# Governance alerts bot runbook

## Scope

This runbook covers the three-domain rebuild of `governance-alerts-bot`. The
same Worker owns three independent Durable Object instances and three Telegram
destinations. It does not migrate or adopt the old singleton's cursor.

No command in this document should be run against production until the code
review and local verification gates pass.

## Production shape

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

1. Create the three final Telegram chats and keep them private.
2. Add the bot and configure all six secrets outside git.
3. Deploy the Worker with every domain disabled. Confirm the authenticated
   status route and inspect the deployment logs.
4. Enable stYFI only. Its new object starts at block 24,386,915 and replays into
   the final stYFI chat.
5. Wait for `caughtUp: true`. Review the entire history, links, ordering,
   amounts, account context, and formatting. Pin the approved stYFI
   introduction manually.
6. Repeat the same process for veYFI.
7. Enable yETH last. Review Y1–Y5 and the complete set of daily checkpoint
   candidates before accepting the 5 ETH threshold. Pin the yETH introduction
   only after approval.
8. Invite users only after all enabled domains are caught up and their private
   histories are approved.

Do not replay into a temporary chat and then change its destination. Event
receipts belong to the final destination history.

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

Before rolling code back to the old singleton Worker, disable all three new
domains. The old singleton and the three new objects have unrelated cursors and
destinations; they must never deliver concurrently.

The duplicate window after Telegram accepts a message but before its receipt is
written cannot be removed without an external transactional sender. If it
occurs, keep the duplicate in history or remove it manually after comparing the
transaction link and block.
