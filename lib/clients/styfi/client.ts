// lib/clients/styfi/client.ts
import type { Address } from "viem";
import type { PreparedTransaction } from "@/lib/tx/types";
import type { EpochInfo, StyfiAccountState } from "./types";

export type StyfiStakeMode = "stYFI" | "stYFI+";

export interface StyfiClient {
  getAccountState(address: Address): Promise<StyfiAccountState>;
  getEpochInfo(): Promise<EpochInfo>;

  // Writes are “prepared” – they don’t send until useTx executes them.
  prepareStake(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction>;

  prepareStartCooldown(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction>;

  prepareWithdraw(mode: StyfiStakeMode): Promise<PreparedTransaction>;

  prepareClaimRewards(): Promise<PreparedTransaction>;
}
