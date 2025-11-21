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

/**
 * Options passed to execute() to allow callers to hook into lifecycle.
 *
 * - onSuccess: called after tx is confirmed
 * - onError:   called when tx fails (user rejection / revert / network)
 * - invalidate: caller-provided invalidation logic (e.g. React Query invalidations)
 */
type TxExecuteOptions = {
  onSuccess?: (hash: TransactionHash) => void | Promise<void>;
  onError?: (error: unknown, hash?: TransactionHash) => void | Promise<void>;
  invalidate?: () => void | Promise<void>;
  /**
   * In mock mode we skip waiting for an on-chain receipt.
   */
  skipWaitForReceipt?: boolean;
};

/**
 * Default initial TxState.
 */
const initialState: TxState = {
  status: "idle",
};

/**
 * Naive error classifier. We can refine this once we wire real on-chain clients
 * and see the concrete error types from viem/wagmi.
 */
function classifyError(error: unknown): TxErrorType {
  if (!error) return "unknown";

  // Narrow to an object with optional name/message fields
  const maybeObj =
    typeof error === "object" && error !== null
      ? (error as { name?: string; message?: string })
      : null;

  const name = maybeObj?.name ?? "";
  const message = maybeObj?.message ?? "";

  // viem / wagmi UserRejectedRequestError (or similar flavours)
  if (
    name === "UserRejectedRequestError" ||
    /user rejected/i.test(message) ||
    /rejected by user/i.test(message)
  ) {
    return "user_rejected";
  }

  // Simple heuristics for revert vs network
  if (/revert/i.test(message) || /execution reverted/i.test(message)) {
    return "revert";
  }

  if (/network/i.test(message) || /rpc/i.test(message)) {
    return "network";
  }

  return "unknown";
}

/**
 * useTx
 *
 * Centralised transaction lifecycle hook.
 *
 * Responsibilities:
 * - drive TxStatus transitions
 * - call PreparedTransaction to submit the tx
 * - wait for the receipt via wagmi.actions.waitForTransactionReceipt
 * - surface hash + error information
 * - call invalidation and callbacks on success/failure
 *
 * This hook is agnostic to domain (stYFI, stYFIMax, veYFI, LLYFI).
 */
export function useTx() {
  const [state, setState] = useState<TxState>(initialState);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const execute = useCallback(
    async (prepared: PreparedTransaction, options?: TxExecuteOptions) => {
      if (!prepared) return;

      let hash: TransactionHash | undefined;

      try {
        setState({
          status: "signing",
        });

        // PreparedTransaction is responsible for actually submitting the tx
        // and returning the hash once sent.
        hash = await prepared();

        setState({
          status: "submitted",
          hash,
        });

        if (!options?.skipWaitForReceipt) {
          // Wait for confirmation using wagmi actions.
          // In mock clients, the prepared function may already represent
          // a "confirmed" transaction, but this call will still be fast.
          setState({
            status: "mining",
            hash,
          });

          await waitForTransactionReceipt(wagmiConfig, { hash });
        }

        // Invalidate caches / queries first, then report success.
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

        let errorMessage = "Transaction failed";
        if (typeof error === "object" && error !== null) {
          const maybeErr = error as { shortMessage?: string; message?: string };
          errorMessage =
            maybeErr.shortMessage ?? maybeErr.message ?? errorMessage;
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
