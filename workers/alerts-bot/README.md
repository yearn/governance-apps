# Governance alerts bot

One Cloudflare Worker scans confirmed Ethereum events and routes three alert
domains to three Telegram chats. One Durable Object class is instantiated once
per domain:

| Domain | Object name | Contents |
| --- | --- | --- |
| stYFI | `alerts:styfi:v1` | stYFI and stYFIx |
| veYFI | `alerts:veyfi:v1` | legacy and migrated veYFI plus LLYFI |
| yETH | `alerts:yeth:v1` | recovery claims, withdrawals, and protocol updates |

Teams, YBC, and DAO remain explicit disabled registry entries.

## Runtime model

- A one-minute cron invokes each enabled object independently.
- Each object owns one cursor, event receipts, Telegram backoff, and its chat.
- New objects begin at their domain's canonical start block. Replay and live
  alerts use the same scanner, exact-block context, renderer, and sender.
- User messages include the affected account's event-block position. They do
  not reconstruct balances from watched logs.
- Telegram delivery is sequential, capped at five messages per domain run, and
  obeys Telegram's `retry_after` response.
- The only accepted duplicate window is Telegram accepting a message before
  the event receipt can be written.
- A cursor hash mismatch, malformed monitored event, unsupported action, or
  required context failure stops that domain at its saved cursor.

yETH claim and withdrawal messages are event-driven. Debt paydown is derived
from claim/accounting changes. Recovery and yield-capacity messages are
evaluated at one fixed 7,200-block checkpoint and sent only when their change
meets the configured threshold. There is no daily impact digest.

There is deliberately no health monitor or Telegram warning subsystem. Failures
produce structured logs and appear in the authenticated status response. This
can be revisited when DAO alerts add stronger operational requirements.

## Configuration

Required secrets when any domain is enabled:

- `RPC_URL`
- `TELEGRAM_BOT_TOKEN`
- `STYFI_TELEGRAM_CHAT_ID`
- `VEYFI_TELEGRAM_CHAT_ID`
- `YETH_TELEGRAM_CHAT_ID`
- `ADMIN_TOKEN` for `GET /status`

All domains are disabled in `wrangler.alerts.jsonc`. Enable them independently
with `ALERTS_STYFI_ENABLED`, `ALERTS_VEYFI_ENABLED`, and
`ALERTS_YETH_ENABLED` after their final private chats and secrets are ready.

The paid Workers plan removes the old free-tier pressure to micro-budget every
subrequest. The remaining bounds protect providers and Telegram without adding
a general request governor: 10,000-block log ranges, at most six ranges per
domain run, RPC batches of 25, and five Telegram messages per domain run.

See [the operational runbook](../../docs/alerts-bot.md) and
[the approved message catalogue](../../docs/alerts-bot-message-catalogue.md).
