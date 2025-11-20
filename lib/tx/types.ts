// lib/tx/types.ts
export type TransactionHash = `0x${string}`;

// Minimal for Phase 1; fleshed out in Phase 2
export type PreparedTransaction = () => Promise<TransactionHash>;
