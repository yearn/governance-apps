import type { Address } from "viem";
import type { TransactionHash } from "@/lib/tx/types";

export type YethClaimStatus = "unclaimed" | "exited" | "staying";

export type YethDebugPreset =
  | "eligible_unclaimed"
  | "claimed_exited"
  | "claimed_staying"
  | "ineligible";

export type YethAccountState = {
  address: Address;
  eligible: boolean;
  snapshotLossEth: bigint;
  claimableNowEth: bigint;
  claimStatus: YethClaimStatus;
  exitedEthReceived: bigint;
  recoveryVaultShares: bigint;
  lastTxHash: TransactionHash | null;
};

export type YethClaimWindow = {
  opensAt: number; // unix seconds
  closesAt: number; // unix seconds
};

export type YethContractAddresses = {
  claimContract: Address;
  recoveryVault: Address;
  yieldVault: Address;
};

export type YethRecoveryVaultState = {
  pps: bigint; // ETH per share, 1e18 scale
  totalAssetsEth: bigint;
  totalShares: bigint;
  hasStrategies: boolean;
};

export type YethYieldVaultState = {
  tvlEth: bigint;
  performanceFeeBps: number;
  feeRecipient: Address;
};

export type YethGlobalState = {
  asOf: number; // unix seconds
  claimWindow: YethClaimWindow;
  approvedYipUrl: string;
  manualLateClaimUrl: string;
  contracts: YethContractAddresses;
  recoveryVault: YethRecoveryVaultState;
  yieldVault: YethYieldVaultState;
  yieldSources: string[];
  risks: string[];
  treasuryRecoveryVaultShares: bigint;
  treasuryYieldShareBps: number;
};
