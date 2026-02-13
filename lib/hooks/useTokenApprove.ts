"use client";

import { Address, erc20Abi } from "viem";
import { useAccount } from "wagmi";
import { getAccount, simulateContract, writeContract } from "wagmi/actions";
import { wagmiConfig } from "@/web3/wagmi";
import { useProtocol } from "@/state/protocol";
import { useTx } from "@/lib/tx/useTx";
import { TransactionHash } from "@/lib/tx/types";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { assertMainnetAccount, MAINNET_CHAIN_ID } from "@/lib/tx/network";

export function useTokenApprove() {
  const { styfi, veyfi, usesMockBackend } = useProtocol();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const userAddress =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);
  const { execute, state } = useTx();

  /**
   * Approve a spender for a given token.
   */
  const write = async (
    token: Address,
    spender: Address,
    amount: bigint,
    options?: {
      onSuccess?: () => void;
      invalidate?: () => void | Promise<void>;
    }
  ) => {
    const prepare = async (): Promise<TransactionHash> => {
      if (usesMockBackend) {
        // Simulate delay
        await new Promise((r) => setTimeout(r, 800));

        if (userAddress) {
          styfi.debugSetAllowance?.(userAddress, token, spender, amount);
          veyfi.debugSetAllowance?.(userAddress, token, spender, amount);
        }

        return "0xMOCK_APPROVAL_HASH" as TransactionHash;
      } else {
        const account = getAccount(wagmiConfig);
        const address = assertMainnetAccount(account);
        const simulation = await simulateContract(wagmiConfig, {
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender, amount],
          account: address,
          chainId: MAINNET_CHAIN_ID,
        });
        return writeContract(wagmiConfig, simulation.request);
      }
    };

    await execute(prepare, {
      onSuccess: options?.onSuccess,
      invalidate: options?.invalidate,
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return {
    write,
    state,
    isLoading:
      state.status === "signing" ||
      state.status === "mining" ||
      state.status === "submitted",
  };
}
