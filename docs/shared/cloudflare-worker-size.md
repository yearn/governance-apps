# Cloudflare Worker Size

Cloudflare validates the OpenNext Worker script during deploy. The account uses
Workers Paid, which allows a 10 MiB compressed upload. CI checks the Wrangler
dry-run bundle size after `npm run worker:build` and before any deploy step.

## Current Guard

Run the size check locally after a Worker build:

```bash
npm run validate:worker-size -- wrangler.preprod.jsonc
```

The default internal release ceiling is `9216 KiB` (9 MiB), leaving 1 MiB below
Cloudflare's `10240 KiB` paid-plan limit for dependency and build variance.
`WORKER_SIZE_WARN_KIB` defaults to `7680` (7.5 MiB), so CI surfaces growth well
before the release ceiling. Override `WORKER_SIZE_LIMIT_KIB` only when the
target Cloudflare plan and rollout decision explicitly allow it.

Current measurement after enabling the paid-plan policy with Next.js 16.2.11,
OpenNext 1.20.2, Wrangler 4.120.0, viem 2.55.11, and wagmi 2.19.5:

- Date: 2026-08-17
- Build posture: production runtime with `NEXT_PUBLIC_ENABLE_TEAMS=true`,
  `NEXT_PUBLIC_ENABLE_YBC=true`, and `NEXT_PUBLIC_ENABLE_YETH=true`
- Commands: `npm run validate:worker-size -- wrangler.jsonc` and
  `npm run validate:worker-size -- wrangler.preprod.jsonc`
- Result for both targets: `15562.43 KiB / gzip: 3139.44 KiB`

This uses about 31% of the paid-plan limit. It leaves `6076.56 KiB` below the
internal release ceiling and `7100.56 KiB` below Cloudflare's platform limit.
It is `67.44 KiB` above the former Free-plan cap. Require a fresh measurement
before every deploy and revisit the deployment shape when the Worker reaches
the warning range rather than waiting for the platform limit.

## Paid-Plan Decision

The account moved to Workers Paid on 2026-08-17. The current recommendation is
to keep one production Worker and one preprod Worker for the web application.
This preserves atomic cross-app releases and the existing local, CI, routing,
and rollback model while providing enough measured headroom for `dao.yearn.fi`
and expected small follow-on surfaces.

Reconsider splitting by deployment unit when the bundle approaches 7.5-8 MiB,
when independent app release cadence or failure isolation becomes valuable, or
when an app requires materially different bindings, secrets, or dependencies.
Prefer static asset deployment for a future mini app that does not need the
OpenNext runtime.

## Observability

Both web Wrangler configs enable Workers Logs, retain logs in Cloudflare, sample
all invocations, and keep invocation logs enabled. Treat those files as the
source of truth. A dashboard-only change can be lost on a later Wrangler deploy.

Keep full sampling while traffic fits comfortably within the account's log
allowance. If log volume becomes material, lower the production sampling rate
in version control and keep preprod fully sampled for release validation.

## Immediate Reduction

The default RainbowKit wallet list is intentionally limited to injected
wallets, MetaMask, Safe, Rabby, and WalletConnect. Coinbase Wallet, Rainbow
Wallet, Ledger, Ready, and Trust are excluded from the production list because
their SDK graph is traced into the OpenNext server function and pushes the
compressed Worker over the former 3 MiB free-plan cap when reintroduced together.
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
one production Worker and one preprod Worker. Every route, shared provider,
mock surface, and wallet dependency competes for the same per-Worker budget,
but the paid-plan headroom makes this the lowest-complexity operating model.

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

Prefer this path when measured growth makes the single Worker hard to keep
below the internal release ceiling, or when app ownership and release isolation
justify the additional build and operational cost independently of bundle size.

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

Keep the paid monolith while it remains below the warning threshold and the apps
share an operating model. Add new domain routes to both the production and
preprod builds. Revisit per-app or coherent multi-zone Workers only when the
measured size, release cadence, failure isolation, or dependency boundaries
justify the complexity. Keep OpenNext multi-worker as a last resort and use a
static deployment selectively for client-first mini apps.
