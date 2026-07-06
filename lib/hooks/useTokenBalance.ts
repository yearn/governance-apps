"use client";

import { erc20Abi, type Address } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useProtocol } from "@/state/protocol";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function useTokenBalance(
  token: Address,
  account: Address | null | undefined
) {
  const { publicClient, usesMockBackend } = useProtocol();
  const chainId = publicClient?.chain?.id ?? null;
  const hasBalanceTarget =
    Boolean(account) &&
    isNonZeroAddress(token) &&
    isNonZeroAddress(account ?? ZERO_ADDRESS);

  return useQuery({
    queryKey: ["token-balance", account, token, chainId],
    queryFn: async () => {
      if (!account || !publicClient) return 0n;
      return publicClient.readContract({
        abi: erc20Abi,
        address: token,
        functionName: "balanceOf",
        args: [account],
      });
    },
    enabled: !usesMockBackend && hasBalanceTarget && Boolean(publicClient),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

function isNonZeroAddress(address: Address) {
  return address.toLowerCase() !== ZERO_ADDRESS;
}
