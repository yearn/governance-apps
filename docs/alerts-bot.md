# Alerts Bot Operational Runbook

## Purpose

`governance-alerts-bot` scans confirmed Ethereum blocks for monitored governance events and posts normalized alerts to Telegram.

This runbook describes the single-service operational mode for safe validation in a test group, controlled production rollout, and rapid shutdown.

## Required Configuration

### Secrets

- `RPC_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` (production Telegram chat/group id)

### Optional Secrets

- `TEST_TO_CHAT_ID` (test Telegram chat/group id)
- `ADMIN_CHAT_ID` (optional prod-only destination for operational warnings such as throttling and scan-budget stall alerts)
- `ADMIN_TOKEN` (required if using `/admin/*` endpoints)
- `MANUAL_RUN_TOKEN` (only used when `MANUAL_RUN_ENABLED=true`)
- `GLOBAL_DATA_URL` (optional S3/global JSON URL used to enrich YFI-denominated alerts with USD values via `global.yfi.priceCts`)

### Vars (or secrets)

- `ENABLED` (`"true"|"false"`, default `"true"`)
- `DRY_RUN` (`"true"|"false"`, default `"true"`)
- Invalid `ENABLED` values are treated as disabled (fail-safe).
- Invalid `DRY_RUN` values are treated as `true` (fail-safe).

### Other runtime vars

- `CONFIRMATIONS` (default `"6"`)
- `MAX_MESSAGES_PER_RUN` (default `"5"`)
- `MAX_SUBREQUESTS_PER_RUN` (default `"45"`)
- `BUDGET_STALL_ALERT_THRESHOLD` (default `"3"`)
- `BUDGET_STALL_ALERT_COOLDOWN_SECONDS` (default `"3600"`)
- `MANUAL_RUN_ENABLED` (default `"false"`)
- `DAILY_IMPACT_DIGEST_ENABLED` (default `"false"`, sends one UTC daily impact summary when enabled; buckets alerts by the event block UTC date)

## Routing Rules

Routing is centralized in runtime logic and always resolves to exactly one mode:

1. If `ENABLED != "true"`:
- No RPC scanning
- No Telegram sends
- Run returns quickly and logs disabled mode

2. Else if `DRY_RUN == "true"`:
- If `TEST_TO_CHAT_ID` is set: alerts go only to `TEST_TO_CHAT_ID`
- If `TEST_TO_CHAT_ID` is unset: no Telegram sends (log-only mode)

3. Else (`DRY_RUN == "false"`):
- Alerts go only to `TELEGRAM_CHAT_ID`

## Throttling Behavior

`MAX_MESSAGES_PER_RUN` limits how many alert messages are emitted in one run (test, prod, or log-only).

If more than `MAX_MESSAGES_PER_RUN` alerts are ready:

- Send/log only `MAX_MESSAGES_PER_RUN` alerts
- Emit exactly one summary:
  - Title: `⚠️ Alerts Throttled`
  - `Severity: WARN`
  - `Sent: <b>X</b>`
  - `Deferred: <b>Y</b>`
  - `Blocks: <b>{from}-{to}</b>`
  - `Last tx: ...` link to last tx sent (if available)
  - footer with block + UTC timestamp

If there is no active chat (`DRY_RUN=true` and no `TEST_TO_CHAT_ID`), summary is logged instead of sent.

When `DRY_RUN=false` and `ADMIN_CHAT_ID` is set, throttling and scan-budget stall warnings route to `ADMIN_CHAT_ID` instead of the main `TELEGRAM_CHAT_ID`.

## Standard Procedure: Test Group, Stop, Then Prod

1. Configure test mode:
- `ENABLED=true`
- `DRY_RUN=true`
- set `TEST_TO_CHAT_ID`

2. Deploy:
- `wrangler deploy --config wrangler.alerts.jsonc`

3. Watch runtime:
- `wrangler tail --config wrangler.alerts.jsonc`

4. Stop the bot cleanly after validation:
- set `ENABLED=false` and deploy, or
- call `POST /admin/disable` with `Authorization: Bearer <ADMIN_TOKEN>`

5. Promote to production:
- `ENABLED=true`
- `DRY_RUN=false`
- keep `TELEGRAM_CHAT_ID` set
- if you previously stopped via `/admin/disable`, call `POST /admin/enable`
- deploy

## Admin Endpoints (Optional)

All admin endpoints require:

- `ADMIN_TOKEN` secret configured
- header `Authorization: Bearer <ADMIN_TOKEN>`

Endpoints:

- `POST /admin/disable`: sets DO-local `overrideEnabled=false`
- `POST /admin/enable`: sets DO-local `overrideEnabled=true`
- `POST /admin/reset`: clears cursor/backfill state (`startBlock`, `cursorBlock`) and dedupe keys (`sent:*`)

Effective enable rule:

- `effectiveEnabled = (ENABLED == "true") && (overrideEnabled ?? true)`

## Important Note About Secrets

Cloudflare Worker secrets are stored server-side in the Worker environment. They are not tied to git branches and are not versioned in your repository.
