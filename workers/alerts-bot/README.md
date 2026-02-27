# Alerts Bot Worker

This worker scans confirmed mainnet blocks, normalizes governance actions, and delivers Telegram notifications with centralized operational routing (`ENABLED` + `DRY_RUN` + test/prod chat ids).

## Scanner Defaults

- `LOG_CHUNK_SIZE`: `2000` blocks
- `MAX_CHUNKS_PER_RUN`: `10` chunks per Durable Object run
- Log query strategy: one `eth_getLogs` call per chunk with address filter + topic0 OR filter
- Subrequest budget per run: `MAX_SUBREQUESTS_PER_RUN` (default `45`)
  - Includes outbound RPC + Telegram calls.
  - When the budget is exhausted mid-chunk, the run stops early and checkpoints a safe cursor instead of failing the request.
  - Live runs reserve one send slot per chunk so scan RPC cannot consume the entire budget before any Telegram delivery.
- Scan replay protection:
  - Before decoding a log, the worker checks dedupe storage (`sent:${txHash}:${logIndex}`) and skips already-sent logs.
  - This avoids same-block replay stalls where repeated high-cost decode paths could otherwise starve unsent logs in later positions.
- Runtime stall tracking:
  - Consecutive runs that stop early due to scan budget exhaustion with unchanged cursor are counted in DO state (`runMeta:scanBudgetNoProgressCount`).
  - When the counter crosses `BUDGET_STALL_ALERT_THRESHOLD`, the worker emits a Telegram incident alert to the same configured chat, rate-limited by `BUDGET_STALL_ALERT_COOLDOWN_SECONDS`.

## Telegram Delivery

- Bot API method: `sendMessage`
- Message mode: `parse_mode=HTML`
- Link previews: disabled (`disable_web_page_preview=true`)
- Dedupe key: `${txHash}:${logIndex}` stored as `sent:${key}` in Durable Object storage
- Null-render handling:
  - `penalty` events are intentionally skipped and still persisted in dedupe storage.
  - Unknown/unmapped templates are skipped without dedupe persistence so they can be retried after a template fix.
- Dedupe pruning:
  - every 24 hours, and
  - whenever dedupe key count exceeds `5000`
- Dry-run behavior:
  - `DRY_RUN=true` routes to `TEST_TO_CHAT_ID` when configured, otherwise runs in log-only mode.
  - Dry-run still writes dedupe keys for rendered alerts.
  - This means a dry-run can suppress later live delivery for the same `${txHash}:${logIndex}` unless dedupe keys are reset.
  - Stall incident alerts follow the same active chat route (test chat when configured, otherwise log-only).
- Per-run alert cap:
  - `MAX_MESSAGES_PER_RUN` limits emitted alerts per run.
  - Overflow emits exactly one summary alert (`⚠️ Alerts throttled`) to the active chat, or logs it in dry-run log-only mode.

## HTTP Trigger Security

- `GET /health` is public.
- `POST /run` is disabled by default and guarded by:
  - `MANUAL_RUN_ENABLED=true`
  - `MANUAL_RUN_TOKEN` secret
  - `Authorization: Bearer <MANUAL_RUN_TOKEN>` header
- Cron-triggered runs do not require HTTP auth and continue to work with manual runs disabled.
- Optional admin endpoints:
  - `POST /admin/disable`
  - `POST /admin/enable`
  - `POST /admin/reset`
  - all require `Authorization: Bearer <ADMIN_TOKEN>`
  - effective enable: `(ENABLED == "true") && (overrideEnabled ?? true)` (`ENABLED=false` is a hard kill switch)

## Normalized Actions

Each decoded action includes:

- `kind`
- `tokenSymbol`
- `user`
- `amounts`
- `txHash`
- `blockNumber`
- `logIndex`

## ModifyLock Classification Safety

Legacy veYFI `ModifyLock` classification depends on historical state from `locked(user)` at `blockNumber - 1`.
If that lookup fails, the event is skipped and never force-classified to `lock`, `extension`, or `update`.

## Deterministic Test Harness

Deterministic fixture coverage for all supported action kinds lives at:

- `tests/unit/workers/alerts-bot.scanner.test.ts`

The harness avoids live-chain dependency and includes an explicit `locked()` failure-path test for `ModifyLock`.

## Environment Variables

- Required secrets:
  - `RPC_URL`
  - `TELEGRAM_BOT_TOKEN` (required when an active Telegram chat route is configured)
  - `TELEGRAM_CHAT_ID` (required when `DRY_RUN=false`)
- Optional secrets:
  - `TEST_TO_CHAT_ID` (dry-run test chat route)
  - `ADMIN_CHAT_ID` (optional prod-only destination for operational warnings such as throttling and scan-budget stall alerts)
  - `ADMIN_TOKEN` (required for `/admin/*` endpoints)
  - `MANUAL_RUN_TOKEN` (required only when `MANUAL_RUN_ENABLED=true`)
- Optional vars:
  - `CONFIRMATIONS` (default `6`)
  - `ENABLED` (`true`/`false`, default `true`)
    - invalid value fallback is disabled (fail-safe)
  - `DRY_RUN` (`true`/`false`, default `true`)
    - invalid value fallback is `true` (fail-safe)
  - `MAX_MESSAGES_PER_RUN` (positive integer, default `5`)
  - `MANUAL_RUN_ENABLED` (`true`/`false`, default `false`)
  - `MAX_SUBREQUESTS_PER_RUN` (positive integer, default `45`)
  - `BUDGET_STALL_ALERT_THRESHOLD` (positive integer, default `3`)
  - `BUDGET_STALL_ALERT_COOLDOWN_SECONDS` (positive integer, default `3600`)

Operational runbook: `docs/alerts-bot.md`.

## Incident Recovery

Durable Object state keys:

- Cursor keys: `startBlock`, `cursorBlock`
- Dedupe keys: `sent:*`

Recommended reset playbooks:

1. Replay from the current cursor only (most common):
   - Delete `sent:*` keys.
   - Keep `startBlock` and `cursorBlock`.
2. Re-scan from genesis:
   - Delete `startBlock`, `cursorBlock`, and all `sent:*` keys.
3. Resume from a specific block after an incident:
   - Set `cursorBlock = targetBlock - 1`.
   - Delete `sent:*` only if you want to re-deliver already-sent alerts.

Apply these DO storage edits via your normal maintenance workflow (one-off migration/maintenance script, DO admin tool, or temporary admin endpoint) with strict access controls.
