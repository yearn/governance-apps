"use client";

import { Address } from "viem";
import { useAccount } from "wagmi";
import { useProtocol } from "@/state/protocol";
import { useTx } from "@/lib/tx/useTx";
import { TransactionHash } from "@/lib/tx/types";

export function useTokenApprove() {
  const { styfi, veyfi, usesMockBackend } = useProtocol();
  const { address: userAddress } = useAccount();
  const { execute, state } = useTx();

  /**
   * Approve a spender for a given token.
   * Note: For stYFI/LLYFI flows, prefer allowances exposed via domain account state;
   * this hook is mainly for on-chain mode or auxiliary use.
   */
  const write = async (
    token: Address,
    spender: Address,
    amount: bigint,
    options?: { onSuccess?: () => void; invalidate?: () => void | Promise<void> }
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
        // Phase 8: Implement On-Chain Wagmi writeContract
        throw new Error("On-chain approval not implemented yet");
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
