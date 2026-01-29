# Hybrid Architecture Review Tracker

Checklist for issues identified during the hybrid data architecture review. Each item is scoped with file references for easy auditing.

## High Priority

- [ ] Prevent S3-missing flash of "0 YFI" by gating stats queries or returning a non-data state; ensure skeletons render until S3 or wallet data is ready. (`lib/clients/styfi/onchain.ts`, `lib/hooks/useStyfi.ts`, `app/styfi/StyfiPageClient.tsx`)
- [ ] Wrong-network guard: only create `publicClient` when `walletClient` exists and chain is mainnet; otherwise keep it `null` so UI stays in S3 read-only mode. (`state/protocol.tsx`)
- [ ] Make `toNumber` safe for DeFi usage: rename to `toBps`/`toRate`, add runtime bounds check (e.g., < 100000), and audit usage to ensure it is never used for wei-sized values. (`lib/clients/veyfi/onchain.ts`)
- [ ] Make query keys chain-aware to avoid stale data after network change (include chain id in allowance/stats keys). (`lib/hooks/useTokenAllowance.ts`, `lib/hooks/useStyfi.ts`, `lib/hooks/useVeyfi.ts`)

## Medium Priority

- [ ] Inventory card should render a skeleton or empty state when stats are `null` (avoid layout shift). (`app/veyfi/components/InventoryCard.tsx`)
- [ ] Refine global-data caching: remove `cache: "no-store"` or replace with a short TTL so browser/CDN caching works with React Query. (`lib/clients/global.ts`, `app/api/global-data/route.ts`)
- [ ] Document why `totalStaked = staked + unstaking` (correct, not double counting). (`lib/clients/styfi/onchain.ts`, `docs/12-global-data-schema.md`, `docs/8-styfi-ui-spec.md`)

## Low Priority

- [ ] Remove debug logs from hot paths. (`lib/clients/styfi/onchain.ts`)
- [ ] Remove or gate the noisy RPC warning (expected in prod). (`web3/wagmi.ts`)
- [ ] Improve multicall typing to avoid `as unknown as Type` casts. (`lib/clients/veyfi/onchain.ts`)
- [ ] Move `E2E_MOCK_ADDRESS` out of `lib/test` to avoid importing test paths in prod bundles. (`web3/wagmi.ts`, `lib/test/constants.ts`)
- [ ] Optional: tighten `zBaseUnit` to disallow leading zeros if desired. (`lib/schemas/global.ts`)
- [ ] Optional: unify epoch math between mocks and helpers (or document why mocks are hardcoded). (`lib/clients/styfi/mock.ts`, `lib/format.ts`)
- [ ] Verify edge runtime is appropriate for current deployment target (Cloudflare OK; if Node, remove). (`app/api/global-data/route.ts`, `next.config.ts`)
