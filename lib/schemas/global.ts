import { z } from "zod";

const zBaseUnit = z.string().regex(/^\d+$/);
const zBps = z.union([z.number().int().nonnegative(), zBaseUnit]);

const zWeightBlock = z.object({
  current: zBaseUnit,
  projected: zBaseUnit,
});

const zRewardsBlock = z.object({
  current: zBaseUnit,
  projected: zBaseUnit,
  pps: zBaseUnit,
});

const zAprBlock = z.object({
  weight: zBaseUnit,
  rewards: zBaseUnit,
  apr_bps: zBps,
});

const zAprOnlyBlock = z.object({
  rewards: zBaseUnit,
  apr_bps: zBps,
});

export const GlobalDataSchema = z.object({
  meta: z.object({
    version: z.number().int().min(1),
    timestamp: z.number().int(),
    epoch: z.number().int(),
    blockNumber: z.number().int(),
  }),
  global: z.object({
    maxBoostBps: zBps,
    yfi: z.object({
      totalSupply: zBaseUnit,
      priceCts: zBaseUnit,
    }),
    veyfi: z.object({
      lockedYfi: zBaseUnit,
      migratedYfi: zBaseUnit,
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
    weight: zWeightBlock,
    rewards: zRewardsBlock,
  }),
  styfi: z.object({
    staked: zBaseUnit,
    unstaking: zBaseUnit,
    current: zAprBlock,
    projected: zAprBlock,
  }),
  styfix: z.object({
    staked: zBaseUnit,
    unstaking: zBaseUnit,
    current: zAprOnlyBlock,
    projected: zAprOnlyBlock,
  }),
  veyfi: z.object({
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
      current: zAprBlock,
      projected: zAprBlock,
    })
  ),
});

export type GlobalData = z.infer<typeof GlobalDataSchema>;
