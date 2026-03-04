export type ActionKind =
  | "staked"
  | "initiated_cooldown"
  | "withdrew_from_cooldown"
  | "redeem"
  | "exchange"
  | "migrate"
  | "lock"
  | "extension"
  | "update"
  | "legacy_withdraw"
  | "penalty"
  | "yeth_claimed_stayed"
  | "yeth_claimed_exited"
  | "yeth_recovery_vault_withdraw"
  | "yeth_debt_paid_down"
  | "yeth_recovery_progress"
  | "yeth_recovery_setback"
  | "yeth_yield_capacity_up"
  | "yeth_yield_capacity_down";

export type YethWithdrawalType = "full" | "partial";

export interface ActionAmounts {
  assets?: bigint;
  shares?: bigint;
  amount?: bigint;
  // For liquid locker redemption events, this is a 1e18-scaled fee rate.
  fee?: bigint;
  penalty?: bigint;
  unlockEpoch?: bigint;
  locktime?: bigint;
  previousAmount?: bigint;
  previousLocktime?: bigint;
  yethSnapshotAmount?: bigint;
  yethSnapshotMoved?: bigint;
  yethTotalSnapshotDebtEth?: bigint;
  yethSnapshotExitedEth?: bigint;
  yethSnapshotStayedEth?: bigint;
  yethSnapshotUnclaimedEth?: bigint;
  yethOutstandingDebtEth?: bigint;
  yethYieldVaultAssetsEth?: bigint;
  yethSharesBurned?: bigint;
  yethOwnerSharesBefore?: bigint;
  yethOwnerSharesAfter?: bigint;
  yethPreviousOutstandingDebtEth?: bigint;
  yethCurrentOutstandingDebtEth?: bigint;
  yethPreviousRepaidPercentHundredths?: bigint;
  yethCurrentRepaidPercentHundredths?: bigint;
  yethPreviousRecoveryShortfallEth?: bigint;
  yethCurrentRecoveryShortfallEth?: bigint;
  yethPreviousRecoveryCoverageHundredths?: bigint;
  yethCurrentRecoveryCoverageHundredths?: bigint;
  yethPreviousRecoveryVaultAssetsEth?: bigint;
  yethCurrentRecoveryVaultAssetsEth?: bigint;
  yethRecoveryNetFlowEth?: bigint;
  yethRecoveryOrganicDeltaEth?: bigint;
  yethPreviousYieldVaultAssetsEth?: bigint;
  yethCurrentYieldVaultAssetsEth?: bigint;
  yethPreviousYieldCoverageHundredths?: bigint;
  yethCurrentYieldCoverageHundredths?: bigint;
  yethYieldNetFlowEth?: bigint;
  yethYieldOrganicDeltaEth?: bigint;
}

export interface NormalizedAction {
  kind: ActionKind;
  tokenSymbol: string;
  user: string;
  owner?: string;
  receiver?: string;
  caller?: string;
  amounts: ActionAmounts;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  yethWithdrawalType?: YethWithdrawalType;
}
