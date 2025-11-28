"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useProtocol } from "@/state/protocol";
import { StyfiStakeMode } from "@/lib/clients/styfi";
import { useTx } from "@/lib/tx/useTx";
import { walletKeys } from "@/lib/hooks/useWalletYfiBalance";

// --- Query Keys ---
export const styfiKeys = {
  all: ["styfi"] as const,
  account: (address?: string) =>
    [...styfiKeys.all, "account", address] as const,
  epoch: () => [...styfiKeys.all, "epoch"] as const,
};

// --- Read Hooks ---

export function useStyfiAccount() {
  const { styfi } = useProtocol();
  const { address } = useAccount();

  return useQuery({
    queryKey: styfiKeys.account(address),
    queryFn: async () => {
      if (!address) return null;
      return styfi.getAccountState(address);
    },
    enabled: !!address,
    // Keep data fresh but don't spam
    staleTime: 10_000,
  });
}

export function useStyfiEpoch() {
  const { styfi } = useProtocol();

  return useQuery({
    queryKey: styfiKeys.epoch(),
    queryFn: () => styfi.getEpochInfo(),
    staleTime: 60_000, // Epochs don't change often
  });
}

// --- Write Hooks ---

export function useStyfiStake() {
  const { styfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const write = async (mode: StyfiStakeMode, amount: bigint) => {
    const prepare = await styfi.prepareStake(mode, amount);

    await execute(prepare, {
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: styfiKeys.account(address),
          }),
          queryClient.invalidateQueries({
            queryKey: walletKeys.yfi(address),
          }),
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
  const { address } = useAccount();

  const write = async (mode: StyfiStakeMode, amount: bigint) => {
    const prepare = await styfi.prepareStartCooldown(mode, amount);

    await execute(prepare, {
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: styfiKeys.account(address),
          }),
          queryClient.invalidateQueries({
            queryKey: walletKeys.yfi(address),
          }),
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
  const { address } = useAccount();

  const write = async (mode: StyfiStakeMode) => {
    const prepare = await styfi.prepareWithdraw(mode);

    await execute(prepare, {
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: styfiKeys.account(address),
          }),
          queryClient.invalidateQueries({
            queryKey: walletKeys.yfi(address),
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
  const { address } = useAccount();

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
