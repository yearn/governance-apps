"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useProtocol } from "@/state/protocol";
import { useTx } from "@/lib/tx/useTx";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { getRefetchOnWindowFocus } from "@/lib/query/focus-refetch-policy";

export const yethKeys = {
  all: ["yeth"] as const,
  global: () => [...yethKeys.all, "global"] as const,
  account: (address?: string) => [...yethKeys.all, "account", address] as const,
};

export function useYethGlobalState() {
  const { yeth } = useProtocol();

  return useQuery({
    queryKey: yethKeys.global(),
    queryFn: () => yeth.getGlobalState(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useYethAccountState() {
  const { yeth } = useProtocol();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address = wagmiAddress ?? (isE2E ? E2E_MOCK_ADDRESS : undefined);

  return useQuery({
    queryKey: yethKeys.account(address),
    queryFn: async () => {
      if (!address) return null;
      return yeth.getAccountState(address);
    },
    enabled: !!address,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: getRefetchOnWindowFocus("yeth.account"),
  });
}

export function useYethClaimAndExit() {
  const { yeth, yethUsesMockBackend } = useProtocol();
  const queryClient = useQueryClient();
  const { execute, state } = useTx();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address = wagmiAddress ?? (isE2E ? E2E_MOCK_ADDRESS : undefined);

  const write = async () => {
    const prepare = await yeth.prepareClaimAndExit();
    await execute(prepare, {
      skipWaitForReceipt: yethUsesMockBackend,
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: yethKeys.global() }),
          queryClient.invalidateQueries({ queryKey: yethKeys.account(address) }),
        ]);
      },
    });
  };

  return { write, state };
}

export function useYethClaimAndStay() {
  const { yeth, yethUsesMockBackend } = useProtocol();
  const queryClient = useQueryClient();
  const { execute, state } = useTx();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address = wagmiAddress ?? (isE2E ? E2E_MOCK_ADDRESS : undefined);

  const write = async () => {
    const prepare = await yeth.prepareClaimAndStay();
    await execute(prepare, {
      skipWaitForReceipt: yethUsesMockBackend,
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: yethKeys.global() }),
          queryClient.invalidateQueries({ queryKey: yethKeys.account(address) }),
        ]);
      },
    });
  };

  return { write, state };
}

export function useYethRedeemToEth() {
  const { yeth, yethUsesMockBackend } = useProtocol();
  const queryClient = useQueryClient();
  const { execute, state } = useTx();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address = wagmiAddress ?? (isE2E ? E2E_MOCK_ADDRESS : undefined);

  const write = async () => {
    const prepare = await yeth.prepareRedeemToEth();
    await execute(prepare, {
      skipWaitForReceipt: yethUsesMockBackend,
      invalidate: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: yethKeys.global() }),
          queryClient.invalidateQueries({ queryKey: yethKeys.account(address) }),
        ]);
      },
    });
  };

  return { write, state };
}
