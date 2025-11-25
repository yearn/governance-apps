"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useProtocol } from "@/state/protocol";

const walletKeys = {
  yfi: (address?: string | null) => ["wallet", "yfi", address] as const,
};

export function useWalletYfiBalance() {
  const { address, isConnected } = useAccount();
  const { styfi } = useProtocol();

  const query = useQuery({
    queryKey: walletKeys.yfi(address),
    queryFn: async () => {
      if (!address) return null;
      const account = await styfi.getAccountState(address);
      return account.yfiBalance;
    },
    enabled: !!address,
    staleTime: 10_000,
  });

  return {
    balance: query.data ?? 0n,
    isLoading: query.isLoading,
    isConnected,
  };
}
