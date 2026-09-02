import type { NormalizedAction, NormalizedActionSource } from "./types";

export type TeamsAlertKind =
  | "team_added"
  | "team_retirement_scheduled"
  | "teams_registry_deprecated"
  | "team_migrated"
  | "team_owner_pending"
  | "team_owner_set"
  | "team_revenue_deposited"
  | "team_funding_approved"
  | "team_funding_claimed"
  | "team_funding_returned"
  | "team_bonus_claimed"
  | "team_revenue_adjusted"
  | "team_cost_adjusted"
  | "team_revenue_to_rewards"
  | "team_revenue_to_treasury"
  | "team_revenue_to_recovery";

export type YbcAlertKind =
  | "ybc_proposal_opened"
  | "ybc_proposal_retracted"
  | "ybc_vote_cast"
  | "ybc_proposal_executed"
  | "ybc_member_added"
  | "ybc_member_removed"
  | "ybc_rewards_claimed"
  | "ybc_team_bonus_received"
  | "ybc_thresholds_changed"
  | "ybc_operator_changed"
  | "ybc_hooks_changed"
  | "ybc_rewards_stopped"
  | "ybc_unrecognized_call"
  | "ybc_collective_power_changed";

export type ProductAlertKind = TeamsAlertKind | YbcAlertKind;
export type ProposalType = "addition" | "expulsion";

export interface AlertTokenAmount {
  readonly token: string;
  readonly symbol: string | null;
  readonly decimals: number | null;
  readonly value: bigint;
}

export interface TeamPeriodFinancials {
  readonly revenue: bigint;
  readonly cost: bigint;
}

interface ProductActionDetails {
  readonly team_added: {
    readonly team: string;
    readonly teamName: string;
    readonly teamIndex: bigint;
    readonly owner: string;
    readonly currentPeriod: bigint;
  };
  readonly team_retirement_scheduled: {
    readonly team: string;
    readonly teamName: string;
    readonly currentPeriod: bigint;
    readonly retirementPeriod: bigint;
    readonly retirementTime: bigint;
  };
  readonly teams_registry_deprecated: {
    readonly registry: string;
    readonly successor: string;
    readonly teamCount: bigint;
  };
  readonly team_migrated: {
    readonly team: string;
    readonly teamName: string;
    readonly previousRegistry: string;
    readonly currentRegistry: string;
  };
  readonly team_owner_pending: {
    readonly team: string;
    readonly teamName: string;
    readonly currentOwner: string;
    readonly pendingOwner: string;
  };
  readonly team_owner_set: {
    readonly team: string;
    readonly teamName: string;
    readonly previousOwner: string;
    readonly currentOwner: string;
  };
  readonly team_revenue_deposited: {
    readonly team: string;
    readonly teamName: string;
    readonly deposited: AlertTokenAmount;
    readonly revenueUsd: bigint;
    readonly depositor: string;
    readonly period: bigint;
    readonly financialsAfter: TeamPeriodFinancials;
  };
  readonly team_funding_approved: {
    readonly approvalId: bigint;
    readonly team: string;
    readonly teamName: string;
    readonly funding: AlertTokenAmount;
    readonly period: bigint;
    readonly vestingDurationSeconds: bigint;
    readonly claimStartsAt: bigint;
    readonly claimEndsAt: bigint;
  };
  readonly team_funding_claimed: {
    readonly approvalId: bigint;
    readonly team: string;
    readonly teamName: string;
    readonly claimed: AlertTokenAmount;
    readonly costUsd: bigint;
    readonly recipient: string;
    readonly vest: string;
    readonly remaining: AlertTokenAmount;
  };
  readonly team_funding_returned: {
    readonly approvalId: bigint;
    readonly team: string;
    readonly teamName: string;
    readonly returned: AlertTokenAmount;
    readonly refundUsd: bigint;
    readonly sender: string;
    readonly usedAfter: AlertTokenAmount;
  };
  readonly team_bonus_claimed: {
    readonly team: string;
    readonly teamName: string;
    readonly periods: readonly bigint[];
    readonly gross: bigint;
    readonly teamAmount: bigint;
    readonly ybcAmount: bigint;
    readonly recipient: string;
  };
  readonly team_revenue_adjusted: {
    readonly team: string;
    readonly teamName: string;
    readonly operator: string;
    readonly period: bigint;
    readonly amountUsd: bigint;
    readonly increment: boolean;
    readonly financialsAfter: TeamPeriodFinancials;
  };
  readonly team_cost_adjusted: {
    readonly team: string;
    readonly teamName: string;
    readonly operator: string;
    readonly period: bigint;
    readonly amountUsd: bigint;
    readonly increment: boolean;
    readonly financialsAfter: TeamPeriodFinancials;
  };
  readonly team_revenue_to_rewards: {
    readonly amount: AlertTokenAmount;
    readonly rewardEpoch: bigint;
    readonly usedAfter: AlertTokenAmount;
  };
  readonly team_revenue_to_treasury: {
    readonly amount: AlertTokenAmount;
    readonly treasury: string;
    readonly usedAfter: AlertTokenAmount;
  };
  readonly team_revenue_to_recovery: {
    readonly amount: AlertTokenAmount;
    readonly recoveryAuction: string;
    readonly usedAfter: AlertTokenAmount;
  };
  readonly ybc_proposal_opened: {
    readonly proposalId: bigint;
    readonly proposalType: ProposalType;
    readonly target: string;
    readonly proposer: string;
    readonly votingStartsAt: bigint;
    readonly votingEndsAt: bigint;
    readonly thresholdBps: bigint;
  };
  readonly ybc_proposal_retracted: {
    readonly proposalId: bigint;
    readonly proposalType: ProposalType;
    readonly target: string;
    readonly retractor: string;
  };
  readonly ybc_vote_cast: {
    readonly proposalId: bigint;
    readonly proposalType: ProposalType;
    readonly yea: boolean;
    readonly voter: string;
    readonly countedWeight: bigint;
    readonly finalDayDecaySecondsRemaining: bigint | null;
    readonly yeaWeight: bigint;
    readonly totalWeight: bigint;
    readonly thresholdBps: bigint;
    readonly uniqueVoters: number;
    readonly eligibleMembers: number;
  };
  readonly ybc_proposal_executed: {
    readonly proposalId: bigint;
    readonly proposalType: ProposalType;
    readonly member: string;
    readonly executor: string;
    readonly yeaWeight: bigint;
    readonly totalWeight: bigint;
    readonly collectivePowerAfter: bigint;
    readonly activeMembers: number;
  };
  readonly ybc_member_added: {
    readonly member: string;
    readonly operator: string;
    readonly collectivePowerBefore: bigint;
    readonly collectivePowerAfter: bigint;
    readonly activeMembers: number;
  };
  readonly ybc_member_removed: {
    readonly member: string;
    readonly operator: string;
    readonly collectivePowerBefore: bigint;
    readonly collectivePowerAfter: bigint;
    readonly activeMembers: number;
  };
  readonly ybc_rewards_claimed: {
    readonly account: string;
    readonly rewards: AlertTokenAmount;
    readonly claimRoute: string;
  };
  readonly ybc_team_bonus_received: {
    readonly amount: bigint;
    readonly sourceTeam: string;
    readonly sourceTeamName: string;
    readonly periods: readonly bigint[];
  };
  readonly ybc_thresholds_changed: {
    readonly previousAdditionBps: bigint;
    readonly currentAdditionBps: bigint;
    readonly previousExpulsionBps: bigint;
    readonly currentExpulsionBps: bigint;
    readonly actor: string;
  };
  readonly ybc_operator_changed: {
    readonly operator: string;
    readonly enabled: boolean;
    readonly actor: string;
  };
  readonly ybc_hooks_changed: {
    readonly previousHooks: string;
    readonly currentHooks: string;
    readonly actor: string;
  };
  readonly ybc_rewards_stopped: {
    readonly actor: string;
    readonly accruedClaimsRemainClaimable: boolean;
  };
  readonly ybc_unrecognized_call: {
    readonly operator: string;
    readonly target: string;
    readonly selector: string;
  };
  readonly ybc_collective_power_changed: {
    readonly previousPower: bigint;
    readonly currentPower: bigint;
    readonly cause: "member stake changed" | "epoch weight ramp" | "weight configuration changed";
  };
}

interface ProductAlertActionBase {
  readonly domainId: "teams" | "ybc";
  readonly eventId: string;
  readonly txHash: string;
  readonly blockNumber: number;
  readonly logIndex: number;
  readonly source: NormalizedActionSource;
}

export type ProductAlertAction = {
  readonly [K in keyof ProductActionDetails]: ProductAlertActionBase & {
    readonly kind: K;
    readonly details: ProductActionDetails[K];
  };
}[keyof ProductActionDetails];

export type AlertAction = NormalizedAction | ProductAlertAction;

export type ProductAlertDetailsFor<K extends ProductAlertKind> =
  ProductActionDetails[K];

export function isProductAlertAction(value: unknown): value is ProductAlertAction {
  return (
    typeof value === "object" &&
    value !== null &&
    "domainId" in value &&
    ((value as { domainId?: unknown }).domainId === "teams" ||
      (value as { domainId?: unknown }).domainId === "ybc")
  );
}
