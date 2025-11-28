// lib/clients/shared/types.ts

export type CooldownState = {
  amount: bigint;
  endsAt: number; // unix seconds from contract
  claimedProgress?: number; // 0-10000, used by mock for linear withdrawals
  totalAmount?: bigint; // amount that started the cooldown
} | null;
