import { z } from "zod";

const zBaseUnit = z.string().regex(/^(0|[1-9]\d*)$/);

export const YethGlobalDataSchema = z.object({
  version: z.literal(1),
  chainId: z.literal(1),
  generatedAt: z.number().int().nonnegative(),
  blockNumber: z.number().int().nonnegative(),
  claim: z.object({
    closesAt: z.number().int().nonnegative(),
  }),
  yieldVault: z.object({
    tvlEth: zBaseUnit,
    pps: zBaseUnit.optional(),
    totalShares: zBaseUnit.optional(),
  }),
  recoveryVault: z.object({
    pps: zBaseUnit,
    totalAssetsEth: zBaseUnit,
    totalShares: zBaseUnit,
  }),
});

export type YethGlobalData = z.infer<typeof YethGlobalDataSchema>;
