# Runtime Modes and Environment Checklist

This project now uses a single explicit runtime mode signal for operational behavior:

- `NEXT_PUBLIC_RUNTIME_MODE`
- Allowed values: `development`, `preview`, `production`

If `NEXT_PUBLIC_RUNTIME_MODE` is not set, the app falls back to deployment markers (`VERCEL_ENV`, `CF_PAGES_ENV`, `DEPLOYMENT_ENV`) and then `NODE_ENV`.

## Why this exists

`NODE_ENV=production` is used in many contexts (including local builds), which can blur intent.
`NEXT_PUBLIC_RUNTIME_MODE` makes intent explicit for both server and client logic.

## Mode behavior summary

| Mode | Gated app/debug default | `X-Robots-Tag` | Production invariant enforcement |
|---|---|---|---|
| `development` | Enabled | Sent (`noindex`) | Off |
| `preview` | Enabled | Sent (`noindex`) | Off |
| `production` | Disabled unless explicitly enabled | Not sent | On |

### Production-only feature gates

In `production` mode:

- `NEXT_PUBLIC_ENABLE_TEAMS=true` is required to expose Team Finances routes.
- `NEXT_PUBLIC_ENABLE_YBC=true` is required to expose YBC routes.
- `NEXT_PUBLIC_ENABLE_YETH=true` is required to expose yETH routes.
- `NEXT_PUBLIC_ENABLE_DEBUG_UI=true` is required to expose `/debug/ui`.
- `NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK` must remain `false` (UAT/fork-only safety override).

## Required production checklist

Before deploying production:

1. `NEXT_PUBLIC_RUNTIME_MODE=production`
2. `NEXT_PUBLIC_USE_MOCKS=false`
3. `NEXT_PUBLIC_E2E=false`
4. `NEXT_PUBLIC_WC_PROJECT_ID` is set
5. `NEXT_PUBLIC_GLOBAL_DATA_URL` is set
6. `NEXT_PUBLIC_MOTD_URL` is set
7. `NEXT_PUBLIC_ENABLE_TEAMS` is set to `true` only after production approval
8. `NEXT_PUBLIC_ENABLE_YBC` is set to `true` only after production approval
9. If `NEXT_PUBLIC_ENABLE_YETH=true`, `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL` is set
10. `NEXT_PUBLIC_RPC_URLS` is set (comma-separated list, at least one URL)
11. `NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK=false`
12. Run `npm run validate:prod-env`

## Preview checklist

For preview deployments:

1. `NEXT_PUBLIC_RUNTIME_MODE=preview`
2. Keep `NEXT_PUBLIC_USE_MOCKS=false` unless intentionally testing mock-only UX
3. Keep `NEXT_PUBLIC_E2E=false` unless running controlled test environments
4. Confirm `X-Robots-Tag: noindex, nofollow` is present

## Local development checklist

For normal local dev:

1. `NEXT_PUBLIC_RUNTIME_MODE=development`
2. `npm run dev`
3. Set `NEXT_PUBLIC_USE_MOCKS=true` only when intentionally using mock clients
4. Set `NEXT_PUBLIC_E2E=true` only for deterministic test wiring

## Troubleshooting

- If production behavior appears locally: check `NEXT_PUBLIC_RUNTIME_MODE` first.
- If Team Finances, YBC, yETH, or debug routes are unexpectedly hidden: check mode and corresponding `NEXT_PUBLIC_ENABLE_*` flags.
- If startup/build fails with invariant errors: confirm production checklist values above.
