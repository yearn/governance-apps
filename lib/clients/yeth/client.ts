import type { Address } from "viem";
import type { PreparedTransaction } from "@/lib/tx/types";
import type {
  YethAccountState,
  YethDebugPreset,
  YethGlobalState,
} from "./types";

export interface YethClient {
  getGlobalState(): Promise<YethGlobalState>;
  getAccountState(address: Address): Promise<YethAccountState>;
  prepareClaimAndExit(): Promise<PreparedTransaction>;
  prepareClaimAndStay(): Promise<PreparedTransaction>;
  prepareRedeemToEth(): Promise<PreparedTransaction>;

  // Mock-only helper to quickly set test states in UI debug controls.
  debugSetAccountPreset?: (address: Address, preset: YethDebugPreset) => void;
}
