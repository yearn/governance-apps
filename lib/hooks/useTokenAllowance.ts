// lib/hooks/useTokenAllowance.ts
"use client";

import { erc20Abi, type Address } from "viem";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useProtocol } from "@/state/protocol";
import { readMockStyfiAllowance } from "@/lib/clients/styfi/mock";
import { readMockVeyfiAllowance } from "@/lib/clients/veyfi/mock";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * On-chain allowance reader.
 * In mock mode, reads synchronously from the mock stores to provide instant feedback.
 */
export function useTokenAllowance(token: Address, spender: Address) {
  const { usesMockBackend, publicClient } = useProtocol();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);
  const chainId = publicClient?.chain?.id ?? null;
  const hasAllowanceTarget = isNonZeroAddress(token) && isNonZeroAddress(spender);

  const result = useQuery({
    queryKey: ["allowance", address, token, spender, chainId],
    queryFn: async () => {
      if (!address || !publicClient) return 0n;
      return publicClient.readContract({
        abi: erc20Abi,
        address: token,
        functionName: "allowance",
        args: [address, spender],
      });
    },
    enabled:
      !usesMockBackend && !!address && hasAllowanceTarget && !!publicClient,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (usesMockBackend) {
    let mockVal = 0n;
    if (address && hasAllowanceTarget) {
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

function isNonZeroAddress(address: Address) {
  return address.toLowerCase() !== ZERO_ADDRESS;
}
