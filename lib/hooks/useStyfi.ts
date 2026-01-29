// lib/hooks/useStyfi.ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useProtocol } from "@/state/protocol";
import { StyfiStakeMode } from "@/lib/clients/styfi";
import { useTx } from "@/lib/tx/useTx";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";

// --- Query Keys ---
export const styfiKeys = {
  all: ["styfi"] as const,
  account: (address?: string) =>
    [...styfiKeys.all, "account", address] as const,
  epoch: () => [...styfiKeys.all, "epoch"] as const,
  apy: () => [...styfiKeys.all, "apy"] as const,
  stats: () => [...styfiKeys.all, "stats"] as const,
};

// --- Read Hooks ---

export function useStyfiAccount() {
  const { styfi, publicClient, usesMockBackend } = useProtocol();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  return useQuery({
    queryKey: styfiKeys.account(address),
    queryFn: async () => {
      if (!address) return null;
      return styfi.getAccountState(address);
    },
    enabled: !!address && (usesMockBackend || !!publicClient),
    // Poll every 30s to update rewards/balances
    refetchInterval: 30_000,
    // Always refetch when user returns to tab
    refetchOnWindowFocus: true,
    // Data is considered fresh for 20s, allowing immediate re-use but ensuring background updates
    staleTime: 20_000,
  });
}

export function useStyfiEpoch() {
  const { styfi } = useProtocol();

  return useQuery({
    queryKey: styfiKeys.epoch(),
    queryFn: () => styfi.getEpochInfo(),
    // Epochs are very stable (14 days), but we poll gently to catch transitions
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

export function useStyfiApy() {
  const { styfi, globalData, usesMockBackend } = useProtocol();
  const globalVersion = globalData?.meta?.timestamp ?? null;
  const hasApySource = usesMockBackend || !!globalData;

  return useQuery({
    queryKey: [...styfiKeys.apy(), globalVersion] as const,
    queryFn: () => styfi.getApy(),
    // APY changes slowly
    enabled: hasApySource,
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

export function useStyfiStats() {
  const { styfi, globalData, publicClient, usesMockBackend } = useProtocol();
  const globalVersion = globalData?.meta?.timestamp ?? null;
  const connected = usesMockBackend || !!publicClient;
  const chainId = publicClient?.chain?.id ?? null;
  const hasStatsSource = usesMockBackend || !!globalData || !!publicClient;

  return useQuery({
    queryKey: [...styfiKeys.stats(), globalVersion, connected, chainId] as const,
    queryFn: () => styfi.getStats(),
    // Global stats (TVL/Supply)
    enabled: hasStatsSource,
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

// --- Write Hooks ---

export function useStyfiStake() {
  const { styfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (mode: StyfiStakeMode, amount: bigint) => {
    const prepare = await styfi.prepareStake(mode, amount);

    await execute(prepare, {
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: styfiKeys.account(address),
          }),
          queryClient.invalidateQueries({
            queryKey: ["protocol", "identity", address],
          }),
          queryClient.invalidateQueries({ queryKey: styfiKeys.stats() }),
        ]);
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useStyfiStartCooldown() {
  const { styfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (mode: StyfiStakeMode, amount: bigint) => {
    const prepare = await styfi.prepareStartCooldown(mode, amount);

    await execute(prepare, {
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: styfiKeys.account(address),
          }),
          queryClient.invalidateQueries({
            queryKey: ["protocol", "identity", address],
          }),
          queryClient.invalidateQueries({ queryKey: styfiKeys.stats() }),
        ]);
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useStyfiWithdraw() {
  const { styfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (mode: StyfiStakeMode) => {
    const prepare = await styfi.prepareWithdraw(mode);

    await execute(prepare, {
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: styfiKeys.account(address),
          }),
          queryClient.invalidateQueries({
            queryKey: ["protocol", "identity", address],
          }),
        ]);
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useStyfiClaimRewards() {
  const { styfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async () => {
    const prepare = await styfi.prepareClaimRewards();

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: styfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}
