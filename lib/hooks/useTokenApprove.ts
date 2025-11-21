"use client";

import { Address } from "viem";
import { useAccount } from "wagmi";
import { useProtocol } from "@/state/protocol";
import { useTx } from "@/lib/tx/useTx";
import {
  SPENDER_STYFI,
  SPENDER_STYFI_MAX,
  MOCK_LLYFI_MAP,
} from "@/lib/constants";
import { setMockStyfiAllowance } from "@/lib/clients/styfi/mock";
import { setMockLlyfiAllowance } from "@/lib/clients/veyfi/mock";
import { TransactionHash } from "@/lib/tx/types";

export function useTokenApprove() {
  const { isMock } = useProtocol();
  const { address: userAddress } = useAccount();
  const { execute, state } = useTx();

  const write = async (
    token: Address,
    spender: Address,
    amount: bigint,
    options?: { onSuccess?: () => void }
  ) => {
    const prepare = async (): Promise<TransactionHash> => {
      if (isMock) {
        // Simulate delay
        await new Promise((r) => setTimeout(r, 800));

        if (userAddress) {
          // 1. Handle StYFI Approvals (YFI -> StYFI/StYfiMax)
          if (spender === SPENDER_STYFI || spender === SPENDER_STYFI_MAX) {
            setMockStyfiAllowance(userAddress, spender, amount);
          }

          // 2. Handle LLYFI Approvals (sdYFI/upYFI -> Staker)
          // Check if the token being approved is a known Mock LLYFI token
          if (MOCK_LLYFI_MAP[token.toLowerCase()]) {
            setMockLlyfiAllowance(userAddress, token, amount);
          }
        }

        return "0xMOCK_APPROVAL_HASH" as TransactionHash;
      } else {
        // Phase 8: Implement On-Chain Wagmi writeContract
        throw new Error("On-chain approval not implemented yet");
      }
    };

    await execute(prepare, {
      onSuccess: options?.onSuccess,
      invalidate: async () => {
        // Generic invalidation usually handled by parent
      },
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
