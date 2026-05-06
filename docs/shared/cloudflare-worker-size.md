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
limit. `WORKER_SIZE_WARN_KIB` defaults to `3000` so CI still surfaces when the
bundle is deployable but close to the limit. Override `WORKER_SIZE_LIMIT_KIB`
only when the target Cloudflare plan and rollout decision explicitly allow it.

## Immediate Reduction

The default RainbowKit wallet list intentionally excludes Ready and Trust
Wallet. They are lower-priority connectors for the current governance app
audience and add bundle pressure through the shared wallet dependency graph.

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
