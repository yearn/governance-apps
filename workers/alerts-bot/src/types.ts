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
  | "penalty";

export interface ActionAmounts {
  assets?: bigint;
  shares?: bigint;
  amount?: bigint;
  fee?: bigint;
  penalty?: bigint;
  unlockEpoch?: bigint;
  locktime?: bigint;
  previousAmount?: bigint;
  previousLocktime?: bigint;
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
}
