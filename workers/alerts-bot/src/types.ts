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
  | "yeth_recovery_vault_withdraw";

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
