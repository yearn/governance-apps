// lib/hooks/useTokenAllowance.ts
"use client";

import { Address } from "viem";
import { useReadContract, useAccount } from "wagmi";
import { erc20Abi } from "viem";
import { useProtocol } from "@/state/protocol";
import { readMockStyfiAllowance } from "@/lib/clients/styfi/mock";
import { readMockVeyfiAllowance } from "@/lib/clients/veyfi/mock";

/**
 * On-chain allowance reader.
 * In mock mode, reads synchronously from the mock stores to provide instant feedback.
 */
export function useTokenAllowance(token: Address, spender: Address) {
  const { usesMockBackend } = useProtocol();
  const { address } = useAccount();

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
    let mockVal = 0n;
    if (address) {
      // Try Styfi Store first (YFI -> stYFI)
      const styfiVal = readMockStyfiAllowance(address, token, spender);
      if (styfiVal > 0n) {
        mockVal = styfiVal;
      } else {
        // Try Veyfi Store (LLYFI -> Spender OR YFI -> Redemption)
        mockVal = readMockVeyfiAllowance(address, token, spender);
      }
    }

    return {
      data: mockVal,
      isLoading: false,
      refetch: async () => ({ data: mockVal }),
    };
  }

  return result;
}
