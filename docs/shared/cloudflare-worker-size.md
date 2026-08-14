# Cloudflare Worker Size

Cloudflare validates the OpenNext Worker script during deploy. Free Workers are
limited to a 3 MiB compressed upload, so CI checks the Wrangler dry-run bundle
size after `npm run worker:build` and before any deploy step.

## Current Guard

Run the size check locally after a Worker build:

```bash
npm run validate:worker-size -- wrangler.preprod.jsonc
```

The default hard budget is `3072 KiB`, matching the 3 MiB Cloudflare free-plan
limit. `WORKER_SIZE_WARN_KIB` defaults to `2900` so CI still surfaces when the
bundle is deployable but close to the limit. Override `WORKER_SIZE_LIMIT_KIB`
only when the target Cloudflare plan and rollout decision explicitly allow it.

Current measurement after the Next.js 16.2.11, OpenNext 1.20.2, and Wrangler
4.120.0 platform upgrade plus the viem 2.55.11 and wagmi 2.19.5 refresh:

- Date: 2026-08-14
- Build posture: production runtime with `NEXT_PUBLIC_ENABLE_TEAMS=true`,
  `NEXT_PUBLIC_ENABLE_YBC=true`, and `NEXT_PUBLIC_ENABLE_YETH=true`
- Command: `npm run validate:worker-size -- wrangler.preprod.jsonc`
- Result: `14881.70 KiB / gzip: 2988.93 KiB`

This is deployable under the current `3072 KiB` guard, but it is `88.93 KiB`
above the warning threshold and leaves `83.07 KiB` of compressed headroom.
Treat the next sizeable app/runtime addition as a likely trigger for the
deferred split work below, and require a fresh measurement before deploy.

## Immediate Reduction

The default RainbowKit wallet list is intentionally limited to injected
wallets, MetaMask, Safe, Rabby, and WalletConnect. Coinbase Wallet, Rainbow
Wallet, Ledger, Ready, and Trust are excluded from the production list because
their SDK graph is traced into the OpenNext server function and pushes the
compressed Worker over the 3 MiB free-plan cap when reintroduced together.
The explicit Ledger tile remains excluded; Ledger Live can still be reached
through WalletConnect-compatible flows.

Reintroduce any excluded connector only with a fresh `npm run worker:build` and
`npm run validate:worker-size -- wrangler.preprod.jsonc` measurement, leaving
enough margin below the hard limit for build variance.

## Deferred Improvements

### Browser-only wallet runtime

Move the RainbowKit/wagmi runtime behind a browser-only boundary so the
OpenNext server function does not trace wallet SDKs. This should reduce Worker
size materially, but it changes provider timing and must be tested for
hydration, already-connected wallet state, and every component using wagmi
hooks.

### Static route cleanup

Several route entry points use `headers()` for host-aware metadata or client
hostname props. Removing only the safe request-time host reads may let those
routes become static and reduce server-function pressure. Do this route by
route, keeping host routing in middleware and avoiding any UX change to first
paint or canonical metadata that product still requires. Static conversion must
also handle client hooks that force CSR bailouts, such as `useSearchParams()`,
with explicit Suspense boundaries before it is safe to ship.

## Future Deployment Directions

The current deployment is a single Next.js/OpenNext application bundled into
one Cloudflare Worker. That is the simplest operating model, but every route,
shared provider, mock surface, and wallet dependency competes for the same
3 MiB compressed Worker budget on the Free plan.

Do not switch architecture only to recover a few KiB. Treat these options as
milestone-level work after the active app surfaces stabilize, or earlier only
if the Worker size check blocks a required release.

### Per-App Workers In One Repository

Keep one GitHub repository, but split deployable app entry points by product
surface, for example `styfi`, `veyfi`, `yeth`, `teams`, and `ybc`. Shared UI,
formatting, ABI, and protocol code can remain in common packages or shared
repo directories, while each app builds and deploys to its own Cloudflare
Worker and custom domain.

This gives each app its own Worker size budget and allows per-app rollout and
rollback. It also makes production bundles match exposed product surfaces more
directly than runtime feature flags do. The tradeoff is operational and code
organization cost: separate Wrangler configs, separate CI deploy jobs, clearer
shared package boundaries, and more care when changing shared providers or
layout primitives.

Prefer this path when two or more additional apps are stable enough that route
growth, wallet/runtime code, or app-specific mocks make the single Worker hard
to keep under budget.

### OpenNext Multi-Worker Split

OpenNext supports an advanced multi-worker setup that can split a single
Next/OpenNext application across multiple Workers. This preserves the single
Next app shape more than per-app entry points do, but it cannot use the
standard `@opennextjs/cloudflare deploy` command and has preview/skew
protection limitations.

Use this only if we need to keep one logical Next application while splitting
runtime bundle pressure. It is an operations-heavy path and should follow a
prototype that proves deployment, rollback, local development, and route
versioning are acceptable.

### Static SPA With Small API Workers

A Vite/static SPA direction would move most UI code into static browser assets
and keep Cloudflare Workers limited to small API, proxy, security, or data
routes. This can greatly reduce Worker bundle pressure because app UI,
RainbowKit, wagmi hooks, and route components are no longer part of the Worker
script budget.

The tradeoff is that this is closer to an app migration than a deployment
tweak. We would give up much of the current Next.js App Router/OpenNext model:
server route conventions, metadata behavior, middleware assumptions, route
handlers, and some SSR/static-generation semantics would need replacements.
Consider this only if the product is intentionally becoming a client-rendered
application with thin edge APIs, or if Worker size becomes a recurring blocker
even after per-app splitting.

### Recommendation

Finish and validate the active `/teams` and `/ybc` surfaces first unless Worker
size blocks deployment. After those surfaces stabilize, revisit a per-app
Worker split as the most conservative long-term scaling path. Keep OpenNext
multi-worker and Vite/static SPA as fallback options for different constraints:
single-app operational continuity for the former, minimal Worker scripts and
client-first delivery for the latter.
