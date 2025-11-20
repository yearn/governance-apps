// lib/clients/veyfi/client.ts
import type { PreparedTransaction } from "@/lib/tx/types";
import type { VeyfiAccountState, LlyfiTokenId } from "./types";

export interface VeyfiClient {
  getAccountState(address: `0x${string}`): Promise<VeyfiAccountState>;

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
}
