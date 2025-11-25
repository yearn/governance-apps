"use client";

import { Address } from "viem";
import { useReadContract, useAccount } from "wagmi";
import { erc20Abi } from "viem";
import { useProtocol } from "@/state/protocol";

/**
 * On-chain allowance reader. Do NOT use for mock-backed stYFI/LLYFI flows;
 * prefer allowances returned from domain account state to avoid stale/stubbed data.
 */
export function useTokenAllowance(token: Address, spender: Address) {
  const { usesMockBackend } = useProtocol();
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
      enabled: !usesMockBackend && !!address && !!token && !!spender,
    },
  });

  if (usesMockBackend) {
    return {
      data: 0n, // Fallback, UI should prefer domain state
      isLoading: false,
      refetch: async () => ({ data: 0n }),
    };
  }

  return result;
}
