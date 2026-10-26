import type { NormalizedActionSource } from "../../types";

export interface DaoAlertConfiguration {
  readonly voteStart: number;
  readonly executeDelay: number;
  readonly executeGuard: boolean;
  readonly voter: string;
  readonly executor: string;
  readonly operator: string;
  // Unknown implementations do not inherit the pinned Voter's decay rules.
  readonly decayLength: number | null;
}

export interface DaoAlertProposal {
  readonly id: string;
  readonly proposer: string;
  readonly epoch: number;
  readonly digest: string;
  readonly scriptHash: string;
  readonly threshold: number;
  readonly votes: string;
  readonly yea: string;
  readonly retracted: boolean;
  readonly executed: boolean;
  readonly flagged: boolean;
  readonly vetoed: boolean;
}

export interface DaoTrackedProposal {
  readonly proposal: DaoAlertProposal;
  readonly notified: readonly string[];
}

export interface DaoAlertState {
  readonly version: 1;
  readonly configuration: DaoAlertConfiguration | null;
  readonly proposals: Readonly<Record<string, DaoTrackedProposal>>;
}

export type DaoLifecycleKind =
  | "discussion_ending" | "voting_open" | "voting_ending" | "vote_decay"
  | "approved" | "rejected" | "vetoed_result"
  | "execution_ready" | "execution_ending" | "expired";

interface DaoActionBase {
  readonly domainId: "dao";
  readonly eventId: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly logIndex: number;
  readonly txHash: string;
  readonly source: NormalizedActionSource;
  readonly timestamp: number;
}

export type DaoAlertAction = DaoActionBase & (
  | {
      readonly kind: "dao_proposal";
      readonly event: "proposed" | "vote" | "retracted" | "flagged" | "vetoed" | "executed" | DaoLifecycleKind;
      readonly proposal: DaoAlertProposal;
      readonly configuration: DaoAlertConfiguration;
      readonly actor?: string;
      readonly reason?: string;
      readonly weight?: string;
      readonly supportBps?: number;
      readonly deadline?: number;
    }
  | {
      readonly kind: "dao_configuration";
      readonly contract: string;
      readonly event: string;
      readonly values: Readonly<Record<string, string | boolean>>;
    }
);

export function isDaoAlertAction(action: unknown): action is DaoAlertAction {
  return typeof action === "object" && action !== null &&
    "domainId" in action && action.domainId === "dao";
}
