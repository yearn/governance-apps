import { z } from "zod";

const zBaseUnit = z.string().regex(/^\d+$/);
const zBps = z.union([z.number().int().nonnegative(), zBaseUnit]);
const zDecimal = z.string().regex(/^\d+(\.\d+)?$/);

const zRewardBlock = z.object({
  totalRewards: zBaseUnit,
  pps: zBaseUnit,
});

const zProjectedBlock = z.object({
  weight: zBaseUnit,
  rewards: zBaseUnit,
  aprBps: zBps,
});

const zCurrentBlock = z.object({
  weight: zBaseUnit,
  rewards: zBaseUnit,
  aprBps: zBps,
});

export const GlobalDataSchema = z.object({
  meta: z.object({
    version: z.number().int().min(1),
    timestamp: z.number().int(),
    epoch: z.number().int(),
    blockNumber: z.number().int(),
  }),
  global: z.object({
    yfiPriceUsd: zDecimal,
    maxBoostBps: zBps,
    styfi: z.object({
      totalSupply: zBaseUnit,
      totalStaked: zBaseUnit,
      aprBps: zBps,
    }),
    veyfi: z.object({
      migratedYfi: zBaseUnit,
      legacyYfiSupply: zBaseUnit,
      totalLlyfiStakedBps: zBps,
      inventory: z.object({
        availableYfi: zBaseUnit,
        feeBps: zBps,
      }),
      tokens: z.array(
        z.object({
          symbol: z.string().min(1),
          redemption: z.object({
            capacity: zBaseUnit,
            used: zBaseUnit,
            inventory: zBaseUnit,
          }),
        })
      ),
    }),
  }),
  rewards: z.object({
    current: zRewardBlock,
    projected: zRewardBlock,
  }),
  weight: z.object({
    current: zBaseUnit,
    projected: zBaseUnit,
  }),
  styfi: z.object({
    staked: zBaseUnit,
    unstaking: zBaseUnit,
    current: zCurrentBlock,
    projected: zProjectedBlock,
  }),
  styfix: z.object({
    staked: zBaseUnit,
    unstaking: zBaseUnit,
    current: z.object({
      rewards: zBaseUnit,
      aprBps: zBps,
    }),
    projected: z.object({
      rewards: zBaseUnit,
      aprBps: zBps,
    }),
  }),
  veyfi: z.object({
    staked: zBaseUnit,
    current: z.object({
      weight: zBaseUnit,
      rewards: zBaseUnit,
    }),
    projected: z.object({
      weight: zBaseUnit,
      rewards: zBaseUnit,
    }),
  }),
  llyfi: z.array(
    z.object({
      symbol: z.string().min(1),
      staked: zBaseUnit,
      unstaking: zBaseUnit,
      current: zCurrentBlock,
      projected: zProjectedBlock,
    })
  ),
});

export type GlobalData = z.infer<typeof GlobalDataSchema>;
