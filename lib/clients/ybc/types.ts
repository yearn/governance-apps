// lib/clients/ybc/types.ts
import type { Address } from "viem";

export type UnixSeconds = number;
export type YbcAmount = string;

export type YbcScenarioId =
  | "observer"
  | "member-matured"
  | "member-ramping"
  | "operator-admin";

export type YbcMemberStatus =
  | "active"
  | "ramping"
  | "pending-removal"
  | "removed";

export type YbcProposalType = "addition" | "expulsion";

export type YbcProposalPhase =
  | "discussion"
  | "voting"
  | "awaiting-execution"
  | "executed"
  | "expired"
  | "failed"
  | "retracted";

export type YbcProposalOutcome =
  | "pending"
  | "passing"
  | "failing"
  | "passed"
  | "failed";

export type YbcProposalNextAction =
  | "none"
  | "retract"
  | "vote"
  | "execute";

export type YbcAdminOperationId = "add-member" | "remove-member";

export type YbcRewardClaimMode = "shared-claim-surface";

export type YbcWeightRecord = {
  rawStaked: YbcAmount;
  effectiveWeight: YbcAmount;
  targetWeight: YbcAmount;
  maturityBps: number;
  maturesAt: UnixSeconds | null;
};

export type YbcMockExampleScenariosV1 = {
  version: 1;
  generatedAt: UnixSeconds;
  scenarios: YbcMockScenario[];
};

export type YbcMockScenario = {
  id: YbcScenarioId;
  label: string;
  data: YbcMockDataV1;
};

export type YbcMockDataV1 = {
  version: 1;
  generatedAt: UnixSeconds;
  asOf: UnixSeconds;
  epoch: YbcEpochRecord;
  hero: YbcHeroRecord;
  me: YbcAccountPerspective;
  roster: YbcRosterRecord;
  proposals: YbcProposalBoardRecord;
  rewards: YbcRewardsRecord;
  admin?: YbcAdminRecord;
};

export type YbcEpochRecord = {
  current: number;
  startsAt: UnixSeconds;
  endsAt: UnixSeconds;
};

export type YbcHeroRecord = {
  collectiveAddress: Address;
  memberCount: number;
  internalWeight: YbcAmount;
  delegatedWeight: YbcAmount;
  totalInfluence: YbcAmount;
  currentEpoch: number;
  activeProposalCount: number;
  awaitingExecutionCount: number;
};

export type YbcAccountPerspective = {
  address: Address | null;
  isMember: boolean;
  isOperator: boolean;
  canPropose: boolean;
  canVote: boolean;
  weight: YbcWeightRecord;
  pendingRewards: YbcAmount;
};

export type YbcRosterRecord = {
  totals: {
    rawStaked: YbcAmount;
    effectiveWeight: YbcAmount;
    targetWeight: YbcAmount;
    rampingMemberCount: number;
  };
  members: YbcMemberRecord[];
};

export type YbcMemberRecord = {
  address: Address;
  ens: string | null;
  status: YbcMemberStatus;
  joinedAt: UnixSeconds;
  weight: YbcWeightRecord;
  sources: {
    stYFI: YbcAmount;
    stYFIx: YbcAmount;
    migratedVeYfi: YbcAmount;
  };
};

export type YbcProposalBoardRecord = {
  summary: {
    activeCount: number;
    awaitingExecutionCount: number;
    terminalCount: number;
  };
  items: YbcProposalRecord[];
};

export type YbcProposalRecord = {
  id: string;
  type: YbcProposalType;
  targetAccount: Address;
  proposer: Address;
  epoch: number;
  phase: YbcProposalPhase;
  outcome: YbcProposalOutcome;
  thresholdBps: number;
  votes: {
    total: YbcAmount;
    yea: YbcAmount;
    nay: YbcAmount;
  };
  timing: YbcProposalTiming;
  actions: {
    canRetract: boolean;
    canVote: boolean;
    canExecute: boolean;
    nextAction: YbcProposalNextAction;
    disabledReason: string | null;
  };
};

export type YbcProposalTiming = {
  createdAt: UnixSeconds;
  discussionStartsAt: UnixSeconds;
  votingStartsAt: UnixSeconds;
  votingEndsAt: UnixSeconds;
  executionOpensAt: UnixSeconds;
  expiresAt: UnixSeconds;
  executedAt?: UnixSeconds;
};

export type YbcRewardsRecord = {
  token: {
    symbol: "YFI";
    address: Address;
    decimals: 18;
  };
  claimable: YbcAmount;
  accruing: YbcAmount;
  lastUpdatedAt: UnixSeconds;
  claim: {
    mode: YbcRewardClaimMode;
    href: string;
    ctaLabel: string;
    disabledReason: string | null;
  };
  periods: YbcRewardPeriod[];
};

export type YbcRewardPeriod = {
  epoch: number;
  source: "member-weight" | "operator-bonus";
  earned: YbcAmount;
  claimable: YbcAmount;
  finalized: boolean;
};

export type YbcAdminRecord = {
  isOperator: boolean;
  operators: YbcOperatorRecord[];
  thresholds: {
    additionBps: number;
    expulsionBps: number;
  };
  hooks: {
    membershipHook: Address;
    rewardsDistributor: Address;
    bonusRecipient: Address;
  };
  scopedOperations: YbcAdminOperation[];
  rewardStatus: {
    distributorFunded: boolean;
    lastSyncedAt: UnixSeconds;
  };
};

export type YbcOperatorRecord = {
  address: Address;
  ens: string | null;
  role: "operator" | "management";
};

export type YbcAdminOperation = {
  id: YbcAdminOperationId;
  label: string;
  enabled: boolean;
};
