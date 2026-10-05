import { DAO_EMPTY_SCRIPT_HASH, daoProposalPasses } from "../../../../../lib/clients/dao/domain";
import { DAO_EPOCH, DAO_GENESIS, DAO_REMINDERS } from "./contracts";
import type { DaoAlertConfiguration, DaoAlertProposal, DaoLifecycleKind, DaoTrackedProposal } from "./types";

export function daoTiming(p: DaoAlertProposal, config: DaoAlertConfiguration) {
  const voteEnd = DAO_GENESIS + (p.epoch + 1) * DAO_EPOCH;
  return {
    voteStart: voteEnd - DAO_EPOCH + config.voteStart,
    voteEnd,
    executeStart: voteEnd + config.executeDelay,
    executeEnd: voteEnd + DAO_EPOCH,
    decayStart: config.decayLength === null || config.decayLength === 0
      ? null : voteEnd - config.decayLength + 1,
  };
}

export function daoIsSignal(p: DaoAlertProposal): boolean {
  return p.scriptHash === DAO_EMPTY_SCRIPT_HASH;
}

export function daoPasses(p: DaoAlertProposal): boolean {
  return daoProposalPasses(BigInt(p.votes), BigInt(p.yea), p.threshold);
}

export interface DaoMilestone {
  readonly kind: DaoLifecycleKind;
  readonly at: number;
  readonly until: number;
  readonly deadline?: number;
  readonly key: string;
}

/** Each milestone has a finite validity window; cancelled and stale reminders disappear. */
export function daoMilestones(p: DaoAlertProposal, config: DaoAlertConfiguration): readonly DaoMilestone[] {
  if (p.retracted || p.flagged || p.executed) return [];
  const t = daoTiming(p, config);
  const milestones: DaoMilestone[] = [];
  const add = (kind: DaoLifecycleKind, at: number, until: number, deadline?: number) => {
    const keyKind = ["approved", "rejected", "vetoed_result"].includes(kind) ? "result" : kind;
    milestones.push({ kind, at, until, deadline, key: `${keyKind}:${at}` });
  };
  for (const lead of DAO_REMINDERS) {
    const nextLead = DAO_REMINDERS.find(value => value < lead) ?? 0;
    add("discussion_ending", t.voteStart - lead, t.voteStart - nextLead, t.voteStart);
    add("voting_ending", Math.max(t.voteStart, t.voteEnd - lead), t.voteEnd - nextLead, t.voteEnd);
  }
  add("voting_open", t.voteStart, t.voteEnd, t.voteEnd);
  if (t.decayStart !== null) add("vote_decay", Math.max(t.voteStart, t.decayStart), t.voteEnd, t.voteEnd);
  add(p.vetoed ? "vetoed_result" : daoPasses(p) ? "approved" : "rejected", t.voteEnd, t.executeEnd);
  if (!p.vetoed && !daoIsSignal(p) && daoPasses(p)) {
    add("execution_ready", t.executeStart, t.executeEnd, t.executeEnd);
    for (const lead of DAO_REMINDERS) {
      const nextLead = DAO_REMINDERS.find(value => value < lead) ?? 0;
      add("execution_ending", Math.max(t.executeStart, t.executeEnd - lead), t.executeEnd - nextLead, t.executeEnd);
    }
    add("expired", t.executeEnd, Number.MAX_SAFE_INTEGER, t.executeEnd);
  }
  // Short windows can share a boundary. Send one reminder for that boundary.
  const priority = (kind: DaoLifecycleKind) => {
    if (["voting_open", "approved", "rejected", "vetoed_result"].includes(kind)) return 0;
    if (kind === "execution_ready") return 1;
    return 2;
  };
  return [...new Map(milestones.map(m => [m.key, m])).values()]
    .sort((a, b) => a.at - b.at || priority(a.kind) - priority(b.kind));
}

export function pendingDaoMilestones(tracked: DaoTrackedProposal, config: DaoAlertConfiguration, now: number) {
  return daoMilestones(tracked.proposal, config).filter(m => !tracked.notified.includes(m.key) && now < m.until);
}
