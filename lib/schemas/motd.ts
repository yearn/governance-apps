import { z } from "zod";

export const MotdSchema = z.object({
  version: z.number().int().min(1),
  styfi: z
    .object({
      label: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
  veyfi: z
    .object({
      label: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
});

export type Motd = z.infer<typeof MotdSchema>;
