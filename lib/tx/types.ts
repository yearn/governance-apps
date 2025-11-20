// lib/tx/types.ts

export type TransactionHash = `0x${string}`;

/**
 * Phase-1/2 definition:
 * A PreparedTransaction is a function that, when called,
 * submits the transaction, waits for confirmation, and returns the tx hash.
 *
 * - On-chain clients will use viem/wagmi to:
 *   - send the tx
 *   - wait for the receipt
 *   - then return the hash
 *
 * - Mock clients will simulate this behaviour in-memory.
 */
export type PreparedTransaction = () => Promise<TransactionHash>;

/**
 * Coarse-grained transaction lifecycle used by the UI.
 */
export type TxStatus =
  | "idle"
  | "simulating"
  | "signing"
  | "submitted"
  | "mining"
  | "success"
  | "error";

export type TxErrorType = "user_rejected" | "revert" | "network" | "unknown";

export type TxState = {
  status: TxStatus;
  hash?: TransactionHash;
  errorType?: TxErrorType;
  errorMessage?: string;
};
