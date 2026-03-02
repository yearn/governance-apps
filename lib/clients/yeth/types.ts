import type { Address } from "viem";

export type YethDebugPreset =
  | "claimable"
  | "recovery_position"
  | "empty";

export type YethAccountState = {
  address: Address;
  snapshotLossEth: bigint;
  claimableNowEth: bigint;
  recoveryVaultShares: bigint;
};

export type YethClaimWindow = {
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
  tvlEth: bigint; // alias of totalAssetsEth for compatibility
  pps: bigint; // ETH per share, 1e18 scale
  totalShares: bigint;
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
};
