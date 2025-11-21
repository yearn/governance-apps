"use client";

import { Address } from "viem";
import { useReadContract, useAccount } from "wagmi";
import { erc20Abi } from "viem";
import { useProtocol } from "@/state/protocol";

export function useTokenAllowance(token: Address, spender: Address) {
  const { isMock } = useProtocol();
  const { address } = useAccount();

  // In Mock mode, we ideally shouldn't use this hook for critical UI flow
  // because the Domain Client manages the "Mock State".
  // This hook is strictly for on-chain reads.

  const result = useReadContract({
    abi: erc20Abi,
    address: token,
    functionName: "allowance",
    args: address && spender ? [address, spender] : undefined,
    query: {
      enabled: !isMock && !!address && !!token && !!spender,
    },
  });

  if (isMock) {
    return {
      data: 0n, // Fallback, UI should prefer domain state
      isLoading: false,
      refetch: async () => ({ data: 0n }),
    };
  }

  return result;
}
