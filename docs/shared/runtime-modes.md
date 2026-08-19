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
| `production` | Disabled unless explicitly enabled | Sent except on approved public `*.yearn.fi` hosts | On |

The discoverability allowlist is separate from route feature flags. Enabling a gated
route does not make it indexable; its `*.yearn.fi` host must also be explicitly promoted
in the shared discoverability registry after rollout approval. Non-public hosts such as
preview, local, and internal operational domains remain `noindex` and do not publish
sitemap or `llms.txt` discovery content.

### Production-only feature gates

In `production` mode:

- `NEXT_PUBLIC_ENABLE_DAO=true` exposes the temporary route-local DAO mock
  review candidate. This exception is permitted only in the preproduction
  workflow; the production workflow hardcodes it false.
- `NEXT_PUBLIC_ENABLE_TEAMS=true` is required to expose Team Finances routes.
- `NEXT_PUBLIC_ENABLE_YBC=true` is required to expose YBC routes.
- `NEXT_PUBLIC_ENABLE_YETH=true` is required to expose yETH routes.
- `NEXT_PUBLIC_ENABLE_DEBUG_UI=true` is required to expose `/debug/ui`.
- `NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK` must remain `false` (UAT/fork-only safety override).

For the Teams/YBC launch, `NEXT_PUBLIC_ENABLE_TEAMS` and `NEXT_PUBLIC_ENABLE_YBC` are
whole-app exposure gates. There are no separate Teams/YBC write flags and no per-app
mock/live switches. Production must run with `NEXT_PUBLIC_USE_MOCKS=false`; if a severe
Teams or YBC issue appears, disable that app's production flag rather than switching it
to mocked flows.

## Required production checklist

Before deploying production:

1. `NEXT_PUBLIC_RUNTIME_MODE=production`
2. `NEXT_PUBLIC_USE_MOCKS=false`
3. `NEXT_PUBLIC_E2E=false`
4. `NEXT_PUBLIC_WC_PROJECT_ID` is set
5. `NEXT_PUBLIC_GLOBAL_DATA_URL` is set
6. `NEXT_PUBLIC_ENABLE_TEAMS` is set to `true` only after production approval
7. `NEXT_PUBLIC_ENABLE_YBC` is set to `true` only after production approval
8. If `NEXT_PUBLIC_ENABLE_TEAMS=true`, `NEXT_PUBLIC_TEAMS_DATA_URL` is set
9. If `NEXT_PUBLIC_ENABLE_YBC=true`, `NEXT_PUBLIC_YBC_DATA_URL` is set
10. If `NEXT_PUBLIC_ENABLE_YETH=true`, `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL` is set
11. `NEXT_PUBLIC_RPC_URLS` is set (comma-separated list, at least one URL)
12. `NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK=false`
13. No app-specific mock or write-only flags are set for Teams/YBC
14. Run `npm run validate:prod-env`

`NEXT_PUBLIC_ENABLE_DAO` must be false in the public production workflow. It is
not an approved production app flag in this checklist.

## DAO internal preproduction review checklist

The temporary M2 review candidate is production-shaped but mock-backed:

1. `NEXT_PUBLIC_RUNTIME_MODE=production`
2. Protected preproduction environment sets `NEXT_PUBLIC_ENABLE_DAO=true`
3. `NEXT_PUBLIC_USE_MOCKS=false`
4. `NEXT_PUBLIC_E2E=false`
5. `NEXT_PUBLIC_ENABLE_DEBUG_UI=false`
6. WalletConnect, global-data, and HTTPS RPC inputs satisfy production
   validation; never use loopback RPC URLs
7. `dao-beta.dao-ops.com` serves clean DAO paths and returns
   `X-Robots-Tag: noindex, nofollow`
8. DAO stays absent from canonical metadata, sitemap, and `llms.txt`

The DAO flag applies to the shared preproduction deployment, not only the beta
hostname. Other hosts served by the same Worker can reach `/dao` while it is
true. The custom domain is unlisted, not authenticated; require Cloudflare
Access separately if “internal” must mean access-controlled.

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
- If DAO, Team Finances, YBC, yETH, or debug routes are unexpectedly hidden:
  check mode and the corresponding `NEXT_PUBLIC_ENABLE_*` flag.
- If startup/build fails with invariant errors: confirm production checklist values above.
