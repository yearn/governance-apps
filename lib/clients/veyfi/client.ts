// lib/clients/veyfi/client.ts
import type { PreparedTransaction } from "@/lib/tx/types";
import type {
  VeyfiAccountState,
  LlyfiTokenId,
  VeyfiGlobalStats,
} from "./types";

export interface VeyfiClient {
  getAccountState(address: `0x${string}`): Promise<VeyfiAccountState>;
  getGlobalStats(): Promise<VeyfiGlobalStats>;

  prepareMigrateVeYfi(): Promise<PreparedTransaction>;

  prepareStakeLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction>;

  prepareStartCooldownLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction>;

  prepareWithdrawLlyfi(symbol: LlyfiTokenId): Promise<PreparedTransaction>;

  prepareClaimLlyfiRewards(): Promise<PreparedTransaction>; // claim-all

  prepareRedeemLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction>;

  /**
   * Mock-only helper to sync allowances without importing mock modules.
   * No-op in on-chain clients.
   */
  debugSetAllowance?: (
    user: `0x${string}`,
    token: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => void;
}
