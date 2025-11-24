// lib/tx/useTx.ts
"use client";

import { useCallback, useState } from "react";
import type {
  PreparedTransaction,
  TransactionHash,
  TxErrorType,
  TxState,
} from "./types";
import { waitForTransactionReceipt } from "wagmi/actions";
import { wagmiConfig } from "@/web3/wagmi";
import { toast } from "@/components/ui/Toast";
import { normalizeTxError } from "./errors";

type TxExecuteOptions = {
  onSuccess?: (hash: TransactionHash) => void | Promise<void>;
  onError?: (error: unknown, hash?: TransactionHash) => void | Promise<void>;
  invalidate?: () => void | Promise<void>;
  skipWaitForReceipt?: boolean;
};

const initialState: TxState = {
  status: "idle",
};

function classifyError(error: unknown): TxErrorType {
  if (!error) return "unknown";

  // Safely cast to a generic error shape
  const maybeObj =
    typeof error === "object" && error !== null
      ? (error as { name?: string; message?: string; shortMessage?: string })
      : null;

  const name = maybeObj?.name || "";
  const message = maybeObj?.shortMessage || maybeObj?.message || "";

  if (
    name === "UserRejectedRequestError" ||
    /user rejected/i.test(message) ||
    /rejected by user/i.test(message)
  ) {
    return "user_rejected";
  }

  if (
    /revert/i.test(message) ||
    /execution reverted/i.test(message) ||
    /cooldown/i.test(message) ||
    /not ready/i.test(message)
  ) {
    return "revert";
  }

  if (/network/i.test(message) || /rpc/i.test(message)) {
    return "network";
  }

  return "unknown";
}

export function useTx() {
  const [state, setState] = useState<TxState>(initialState);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const execute = useCallback(
    async (prepared: PreparedTransaction, options?: TxExecuteOptions) => {
      if (!prepared) return;

      let hash: TransactionHash | undefined;
      const toastId = toast.loading("Check your wallet...");

      try {
        setState({
          status: "signing",
        });

        hash = await prepared();

        setState({
          status: "submitted",
          hash,
        });

        if (options?.skipWaitForReceipt) {
          toast.success("Transaction submitted (Mock)", { id: toastId });
        } else {
          toast.loading("Transaction submitted. Waiting...", { id: toastId });
          setState({
            status: "mining",
            hash,
          });

          await waitForTransactionReceipt(wagmiConfig, { hash });
          toast.success("Transaction confirmed!", { id: toastId });
        }

        if (options?.invalidate) {
          await options.invalidate();
        }

        setState({
          status: "success",
          hash,
        });

        if (options?.onSuccess) {
          await options.onSuccess(hash);
        }
      } catch (error: unknown) {
        const errorType = classifyError(error);
        const normalized = normalizeTxError(error);

        let errorMessage = normalized.message || "Transaction failed";

        if (errorType === "user_rejected") {
          toast.dismiss(toastId);
        } else {
          toast.error(errorMessage, { id: toastId });
        }

        setState({
          status: "error",
          hash,
          errorType,
          errorMessage,
        });

        if (options?.onError) {
          await options.onError(error, hash);
        }
      }
    },
    []
  );

  return {
    state,
    status: state.status,
    execute,
    reset,
  };
}
