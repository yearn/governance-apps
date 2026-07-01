This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

- `NEXT_PUBLIC_RUNTIME_MODE`: Runtime mode selector (`development`, `preview`, `production`).
- `NEXT_PUBLIC_WC_PROJECT_ID`: WalletConnect project ID retained for RainbowKit-compatible wallet configuration.
- `NEXT_PUBLIC_RPC_URLS`: Comma-separated RPC URLs used to seed wagmi transports (`https://` required on HTTPS sites). Required in production; optional in non-production.
- `NEXT_PUBLIC_USE_MOCKS`: Set to `true` to use mock clients instead of on-chain reads/writes.
- `NEXT_PUBLIC_E2E`: Enables deterministic E2E wallet behavior and mock identity wiring.
- `NEXT_PUBLIC_GLOBAL_DATA_URL`: URL for the stYFI / veYFI global stats JSON payload.
- `NEXT_PUBLIC_TEAMS_DATA_URL`: URL for the Teams feed JSON payload.
- `NEXT_PUBLIC_YETH_GLOBAL_DATA_URL`: URL for the yETH global stats JSON payload.
- `NEXT_PUBLIC_YBC_DATA_URL`: URL for the YBC feed JSON payload.
- `NEXT_PUBLIC_ENABLE_YBC`: Enables YBC routes/host in production runtime.
- `NEXT_PUBLIC_ENABLE_YETH`: Enables yETH routes/host in production runtime.
- `NEXT_PUBLIC_ENABLE_DEBUG_UI`: Enables `/debug/ui` in production runtime.

Production invariant checks:

- `npm run validate:deps`: Enforces deterministic dependency policy.
- `npm run validate:prod-env`: Enforces required production env guards and required variables.

Quick mode checklist:

1. Local dev: `NEXT_PUBLIC_RUNTIME_MODE=development`
2. Preview deploy: `NEXT_PUBLIC_RUNTIME_MODE=preview`
3. Production deploy: `NEXT_PUBLIC_RUNTIME_MODE=production`

For the full mode matrix and deployment checklists, see:

- `docs/shared/runtime-modes.md`

## Cloudflare Worker Targets

- Production Worker config: `wrangler.jsonc` (`app.dao-ops.com`)
- Preprod Worker config: `wrangler.preprod.jsonc` (`styfi-beta.dao-ops.com`, `veyfi-beta.dao-ops.com`, `yeth-beta.dao-ops.com`, `ybc-beta.dao-ops.com`)

## Cross-App Link Routing

Cross-app links (`/styfi`, `/veyfi`, `/yeth`, `/ybc`) are resolved by `lib/governance-links.ts`
using the current request host surface:

- Local/shared path hosts (`localhost`, `127.0.0.1`, `app.dao-ops.com`) -> path-scoped links (`/styfi`)
- Preprod subdomain hosts (`*-beta.dao-ops.com`) -> canonical beta app domains (`https://styfi-beta.dao-ops.com`)
- Production subdomain hosts (`*.yearn.fi`) -> canonical production app domains (`https://styfi.yearn.fi`)

Host/app mappings are centralized in `lib/runtime/governance-hosts.ts`.

Deploy helpers:

- `npm run worker:deploy:prod`
- `npm run worker:deploy:preprod`

## APR Inspection

Use the APR inspection helper to validate veYFI / LLYFI base APR derivation from a
global-data payload before doing any deploy:

- `npm run check:veyfi-apr`
- `npm run check:veyfi-apr -- /tmp/veyfi-stats.json`
- `npm run check:veyfi-apr -- /tmp/veyfi-stats.json --boost-epochs 95 --current-epoch 2`

The script reads the payload, treats each locker `aprBps` as canonical effective APR,
back-calculates the implied base APR from effective APR, boost, and staked ratio, and
prints the per-locker values plus the common derived base APR.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
