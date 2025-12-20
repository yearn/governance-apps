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
  prepareRedeemLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction>;
  prepareMintLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction>;

  // Debug Helpers (Optional)
  debugSetAllowance?: (
    user: `0x${string}`,
    token: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => void;
  debugSetPendingVeYfi?: (amount: bigint) => void;
  debugSetLlyfiBalance?: (
    user: `0x${string}`,
    symbol: LlyfiTokenId,
    amount: bigint
  ) => void;
}
