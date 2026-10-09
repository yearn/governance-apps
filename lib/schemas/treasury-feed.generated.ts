// Generated from docs/apps/treasury/feed.schema.json. Run node scripts/generate-treasury-contract.mjs.
import { z } from "./zod";

export const TreasuryHashSchema = z.string().regex(new RegExp("^0x[a-fA-F0-9]{64}$"));

export const TreasuryKeySchema = z.string().regex(new RegExp("^[a-z0-9][a-z0-9:_-]{0,159}$"));

export const TreasuryAddressSchema = z.string().regex(new RegExp("^0x[a-fA-F0-9]{40}$"));

export const TreasuryAccountSchema = z.strictObject({
  id: TreasuryKeySchema,
  label: z.string().min(1).max(100),
  address: TreasuryAddressSchema,
  kind: z.enum(["wallet","robo-inventory"]),
});

export const TreasuryTeamSchema = z.strictObject({
  id: TreasuryKeySchema,
  label: z.string().min(1).max(60),
  registryTeamId: z.string().min(1).max(160).nullable(),
});

export const TreasuryAssetSchema = z.strictObject({
  chainId: z.number().int().min(1).max(9007199254740991),
  address: TreasuryAddressSchema.nullable(),
  symbol: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  decimals: z.number().int().min(0).max(36),
});

export const TreasuryRawSchema = z.string().max(78).regex(new RegExp("^(0|[1-9][0-9]*)$"));

export const TreasuryAmountSchema = z.strictObject({
  asset: TreasuryAssetSchema,
  raw: TreasuryRawSchema,
});

export const TreasuryUsdSchema = z.string().regex(new RegExp("^(0|[1-9][0-9]{0,35})(\\.[0-9]{1,18})?$"));

export const TreasuryValuationSchema = z.strictObject({
  usdValue: TreasuryUsdSchema.nullable(),
  usdValueExcludingYfi: TreasuryUsdSchema.nullable(),
  source: z.string().min(1).max(200).nullable(),
  asOf: z.number().int().min(0).max(253402300799).nullable(),
  status: z.enum(["current","stale","unavailable"]),
});

export const TreasuryHoldingSchema = z.strictObject({
  id: TreasuryKeySchema,
  accountId: TreasuryKeySchema,
  positionKey: TreasuryKeySchema.nullable(),
  asset: TreasuryAssetSchema,
  balanceRaw: TreasuryRawSchema,
  underlying: TreasuryAmountSchema.nullable(),
  valuation: TreasuryValuationSchema,
  purpose: z.enum(["operating","strategic","product-seed","conversion","unspecified"]),
  purposeNote: z.string().min(1).max(360).nullable(),
  withdrawal: z.strictObject({
  status: z.enum(["available","restricted","unknown"]),
  note: z.string().min(1).max(360).nullable(),
}),
  accountableTeamId: TreasuryKeySchema.nullable(),
});

export const TreasuryExpectedReturnSchema = z.strictObject({
  amounts: z.array(TreasuryAmountSchema).max(8),
  terms: z.enum(["confirmed","provisional","unknown"]),
  note: z.string().min(1).max(360).nullable(),
});

export const TreasuryOutstandingSchema = z.strictObject({
  amounts: z.array(TreasuryAmountSchema).max(8).nullable(),
  asOf: z.number().int().min(0).max(253402300799).nullable(),
  sourceKind: z.enum(["onchain","curated","unavailable"]),
  note: z.string().min(1).max(360).nullable(),
});

export const TreasuryEvidenceSchema = z.strictObject({
  label: z.string().min(1).max(100),
  url: z.string().max(512).regex(new RegExp("^https://(etherscan\\.io|basescan\\.org|github\\.com|gov\\.yearn\\.fi|app\\.safe\\.global|snapshot\\.org)/[^\\s]*$")),
});

export const TreasuryAllocationSchema = z.strictObject({
  id: TreasuryKeySchema,
  title: z.string().min(1).max(120),
  kind: z.enum(["loan","deposit","inventory","delegated-stake","strategic","reserve","managed"]),
  status: z.enum(["active","pending"]),
  accountableTeamId: TreasuryKeySchema,
  counterparty: z.string().min(1).max(120),
  originalFunding: z.array(TreasuryAmountSchema).max(8),
  originalFundingNote: z.string().min(1).max(360).nullable(),
  plannedFunding: z.array(TreasuryAmountSchema).max(8),
  expectedReturn: TreasuryExpectedReturnSchema,
  outstanding: TreasuryOutstandingSchema,
  note: z.string().min(1).max(480).nullable(),
  evidence: z.array(TreasuryEvidenceSchema).max(8),
});

export const TreasuryHistorySchema = z.strictObject({
  id: TreasuryKeySchema,
  title: z.string().min(1).max(120),
  status: z.enum(["settled","written-off","excluded","unfunded"]),
  closedAt: z.number().int().min(0).max(253402300799).nullable(),
  note: z.string().min(1).max(360),
  evidence: z.array(TreasuryEvidenceSchema).max(3),
});

export const TreasurySummarySchema = z.strictObject({
  holdingCount: z.number().int().min(0).max(2000),
  pricedUsdValue: TreasuryUsdSchema.nullable(),
  pricedUsdValueExcludingYfi: TreasuryUsdSchema.nullable(),
  unpricedHoldingCount: z.number().int().min(0).max(2000),
  unknownYfiSplitCount: z.number().int().min(0).max(2000),
});

export const TreasuryCoverageSchema = z.strictObject({
  inventory: z.enum(["indexed","registry-only"]),
  valuation: z.enum(["complete","partial","unavailable"]),
  warnings: z.array(z.string().min(1).max(360)).max(32),
});

export const TreasuryFeedSchema = z.strictObject({
  version: z.literal(1),
  chainId: z.literal(1),
  mode: z.enum(["live","fixture"]),
  generatedAt: z.number().int().min(0).max(253402300799),
  blockNumber: z.number().int().min(0).max(9007199254740991),
  blockHash: TreasuryHashSchema,
  blockTimestamp: z.number().int().min(0).max(253402300799),
  registryRevision: z.string().regex(new RegExp("^[a-f0-9]{64}$")),
  accounts: z.array(TreasuryAccountSchema).max(64),
  teams: z.array(TreasuryTeamSchema).max(32),
  holdings: z.array(TreasuryHoldingSchema).max(2000),
  allocations: z.array(TreasuryAllocationSchema).max(128),
  history: z.array(TreasuryHistorySchema).max(128),
  summary: TreasurySummarySchema,
  coverage: TreasuryCoverageSchema,
});
