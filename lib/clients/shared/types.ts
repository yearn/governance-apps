// lib/clients/shared/types.ts

export type CooldownState = {
  amount: bigint;
  endsAt: number; // unix seconds from contract
} | null;
