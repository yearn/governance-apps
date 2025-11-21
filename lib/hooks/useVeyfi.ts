"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useProtocol } from "@/state/protocol";
import { LlyfiTokenId } from "@/lib/clients/veyfi";
import { useTx } from "@/lib/tx/useTx";

// --- Query Keys ---
export const veyfiKeys = {
  all: ["veyfi"] as const,
  account: (address?: string) =>
    [...veyfiKeys.all, "account", address] as const,
};

// --- Read Hooks ---

export function useVeyfiAccount() {
  const { veyfi } = useProtocol();
  const { address } = useAccount();

  return useQuery({
    queryKey: veyfiKeys.account(address),
    queryFn: async () => {
      if (!address) return null;
      return veyfi.getAccountState(address);
    },
    enabled: !!address,
    staleTime: 10_000,
  });
}

/**
 * Selector hook for just LLYFI tokens
 */
export function useLlyfiTokens() {
  const { data } = useVeyfiAccount();
  return data?.llyfiTokens ?? [];
}

/**
 * Selector hook for Redemption Caps
 */
export function useRedemptionCaps() {
  const { data } = useVeyfiAccount();
  return data?.redemptionCaps ?? null;
}

// --- Write Hooks ---

export function useVeyfiMigration() {
  const { veyfi } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async () => {
    const prepare = await veyfi.prepareMigrateVeYfi();

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  return { write, state };
}

export function useLlyfiStake() {
  const { veyfi } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareStakeLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  return { write, state };
}

export function useLlyfiStartCooldown() {
  const { veyfi } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareStartCooldownLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  return { write, state };
}

export function useLlyfiWithdraw() {
  const { veyfi } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async (symbol: LlyfiTokenId) => {
    const prepare = await veyfi.prepareWithdrawLlyfi(symbol);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  return { write, state };
}

export function useVeyfiClaimRewards() {
  const { veyfi } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async () => {
    const prepare = await veyfi.prepareClaimLlyfiRewards();

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  return { write, state };
}

export function useLlyfiRedeem() {
  const { veyfi } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareRedeemLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  return { write, state };
}
