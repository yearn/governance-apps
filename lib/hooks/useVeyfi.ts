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
  stats: () => [...veyfiKeys.all, "stats"] as const,
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
    // Poll every 30s to update caps, inventory, and token status
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });
}

export function useVeyfiStats() {
  const { veyfi } = useProtocol();

  return useQuery({
    queryKey: veyfiKeys.stats(),
    queryFn: () => veyfi.getGlobalStats(),
    // Global stats (Migration %, Boost)
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

/**
 * Selector hook for LLYFI tokens (Balances & Metadata)
 */
export function useLlyfiTokens() {
  const { data } = useVeyfiAccount();
  return data?.llyfiTokens ?? [];
}

/**
 * Selector hook for Protocol Inventory availability
 */
export function useVeyfiInventory() {
  const { data } = useVeyfiAccount();
  return data?.inventory ?? null;
}

// --- Write Hooks ---

export function useVeyfiMigration() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async () => {
    const prepare = await veyfi.prepareMigrateVeYfi();

    await execute(prepare, {
      invalidate: async () => {
        // Invalidate Account State (to update card to "Migrated" state)
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
        // Invalidate Global Stats (to update "Migrated veYFI" top bar)
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.stats(),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiStake() {
  const { veyfi, usesMockBackend } = useProtocol();
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
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiStartCooldown() {
  const { veyfi, usesMockBackend } = useProtocol();
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
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiWithdraw() {
  const { veyfi, usesMockBackend } = useProtocol();
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
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiRedeem() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareRedeemLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        // Important: Invalidate identity for YFI balance updates
        await queryClient.invalidateQueries({
          queryKey: ["protocol", "identity"],
        });
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiMint() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareMintLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: ["protocol", "identity"],
        });
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}
