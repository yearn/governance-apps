"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AddressLink } from "@/components/ui/ExplorerLink";
import { IconChevron } from "@/components/icons/IconChevron";
import { TimelineStepper, type TimelineStep } from "@/components/ui/TimelineStepper";
import { UtcTime } from "@/components/ui/UtcTime";
import type { YbcProposalRecord, YbcVoteChoice } from "@/lib/clients/ybc";
import { formatUtcDateTime } from "@/lib/date";
import { cn } from "@/lib/cn";
import { getYbcIdentity, type YbcIdentityMap } from "../identity";
import { ybcCopy } from "../messages";
import { ProposalVoteResults } from "./ProposalVoteResults";
import { ProposalVoters } from "./ProposalVoters";

type ProposalCardProps = {
  proposal: YbcProposalRecord;
  identities: YbcIdentityMap;
  onRetract?: () => void;
  onVote?: (choice: YbcVoteChoice) => void;
  onExecute?: () => void;
  transactionPending?: boolean;
  actionPending?: boolean;
  actionError?: string | null;
  focused?: boolean;
};

const badgeVariantByPhase = {
  discussion: "neutral", voting: "brand", "awaiting-execution": "warning",
  executed: "success", expired: "neutral", failed: "error", retracted: "neutral",
} as const;

export function ProposalCard({ proposal, identities, onRetract, onVote, onExecute, transactionPending = false, actionPending = false, actionError, focused = false }: ProposalCardProps) {
  const copy = ybcCopy.proposal;
  const [isOpen, setIsOpen] = useState(focused);
  const [wasFocused, setWasFocused] = useState(focused);
  if (wasFocused !== focused) {
    setWasFocused(focused);
    if (focused) setIsOpen(true);
  }
  const headingId = `${proposal.id}-heading`;
  const target = getYbcIdentity(identities, proposal.targetAccount);
  const proposer = getYbcIdentity(identities, proposal.proposer);
  const timing = getKeyTiming(proposal);
  const canAct = (proposal.actions.canRetract && onRetract) || (proposal.actions.canVote && onVote) || (proposal.actions.canExecute && onExecute);
  const vote = proposal.viewerVote;
  const participation = vote?.hasVoted
    ? vote.choice ? copy.yourVoteChoice(vote.choice) : copy.voteRecorded
    : proposal.actions.canVote ? copy.voteNeeded : null;

  return (
    <div id={`ybc-proposal-${proposal.id}`} data-focused={focused || undefined}
      className={cn("min-w-0 scroll-mt-24 first:rounded-t-box last:rounded-b-box", focused && "bg-yearn-blue/[0.03] ring-2 ring-inset ring-yearn-blue/30")}>
      <details open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)} role="article" aria-labelledby={headingId} className="group">
        <summary aria-label={copy.toggle(proposal.id, isOpen)}
          className="grid min-w-0 cursor-pointer list-none gap-5 p-4 transition-[background-color] hover:bg-surface-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-text-primary motion-reduce:transition-none md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)_1.25rem] lg:items-center [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-number text-xs text-text-secondary">{proposal.id}</span>
              <Badge variant={badgeVariantByPhase[proposal.phase]}>{copy.phases[proposal.phase]}</Badge>
              {participation ? <span className={cn("text-xs font-bold", vote?.hasVoted ? "text-green-800 dark:text-green-300" : "text-yearn-blue dark:text-blue-300")}>{participation}</span> : null}
            </div>
            <h3 id={headingId} className="break-words text-lg font-bold [overflow-wrap:anywhere] md:text-xl">
              <span className="sr-only">{proposal.id} · </span>{copy.title(proposal.type, target.label)}
            </h3>
            <p className="break-words text-xs leading-5 text-text-secondary [overflow-wrap:anywhere]">{copy.proposedBy(proposer.label, proposal.epoch)}</p>
          </div>
          <div className="min-w-0 space-y-3 border-t border-border pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <p className="flex flex-wrap gap-x-1 text-xs text-text-secondary"><span className="font-bold text-text-primary">{timing.label}</span>{timing.timestamp !== null ? <UtcTime timestamp={timing.timestamp} /> : null}</p>
            <ProposalVoteResults proposal={proposal} compact />
          </div>
          <span className="flex min-h-10 items-center gap-2 text-xs font-bold text-text-secondary lg:min-h-0">
            <span className="lg:sr-only">{copy.details}</span>
            <IconChevron className="size-4 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </summary>
        <div className="space-y-6 border-t border-border p-4 md:p-6">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-5">
              <div className="space-y-4">
                <h4 className="text-base font-bold">{copy.results}</h4>
                <ProposalVoteResults proposal={proposal} />
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-bold">{copy.yourAction}</h4>
                <p className="text-sm leading-6 text-text-secondary" role="status">{getActionDescription(proposal)}</p>
                {actionError ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{actionError}</p> : null}
                {actionPending ? <p role="status" className="text-sm font-bold">{copy.pending}</p> : null}
                <div className="flex flex-wrap gap-3">
                  {proposal.actions.canVote && onVote ? <>
                    <Button disabled={transactionPending} onClick={() => onVote("yea")}>{copy.voteYea}</Button>
                    <Button variant="secondary" disabled={transactionPending} onClick={() => onVote("nay")}>{copy.voteNay}</Button>
                  </> : null}
                  {proposal.actions.canRetract && onRetract ? <Button variant="secondary" disabled={transactionPending} onClick={onRetract}>{copy.retract}</Button> : null}
                  {proposal.actions.canExecute && onExecute ? <Button disabled={transactionPending} onClick={onExecute}>{copy.execute}</Button> : null}
                  {!canAct && proposal.actions.nextAction !== "none" ? <p className="text-sm text-text-secondary">{copy.actionsUnavailable}</p> : null}
                </div>
              </div>
              <dl className="grid min-w-0 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <div className="min-w-0"><dt className="mb-1 text-xs text-text-secondary">{copy.target}</dt><dd className="min-w-0 space-y-1"><p className="break-words text-sm font-bold [overflow-wrap:anywhere]">{target.label}</p><AddressLink address={target.address} variant="compact" /></dd></div>
                <div className="min-w-0"><dt className="mb-1 text-xs text-text-secondary">{copy.proposer}</dt><dd className="min-w-0 space-y-1"><p className="break-words text-sm font-bold [overflow-wrap:anywhere]">{proposer.label}</p><AddressLink address={proposer.address} variant="compact" /></dd></div>
              </dl>
            </div>
            <div className="min-w-0 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <h4 className="text-base font-bold">{copy.timeline}</h4>
              <TimelineStepper aria-label={copy.timelineLabel(proposal.id)} steps={getTimelineRows(proposal)} className="mt-4" />
            </div>
          </div>
          <ProposalVoters proposal={proposal} identities={identities} />
        </div>
      </details>
    </div>
  );
}

function getActionDescription(proposal: YbcProposalRecord) {
  const copy = ybcCopy.proposal;
  if (proposal.phase === "expired") return copy.expiredBody;
  if (proposal.phase === "executed") return copy.executedBody;
  if (proposal.phase === "failed") return copy.failedBody;
  if (proposal.phase === "retracted") return copy.retractedBody;
  if (proposal.viewerVote?.hasVoted) return proposal.viewerVote.choice ? copy.recordedBody(proposal.viewerVote.choice) : copy.recordedUnknown;
  if (proposal.actions.disabledReason) return proposal.actions.disabledReason;
  if (proposal.actions.canVote) return copy.voteBody;
  if (proposal.actions.canExecute) return copy.executeBody;
  if (proposal.actions.canRetract) return copy.retractBody;
  return copy.actionsUnavailable;
}

function getKeyTiming(proposal: YbcProposalRecord) {
  const copy = ybcCopy.proposal;
  switch (proposal.phase) {
    case "discussion": return { label: copy.votingOpens, timestamp: proposal.timing.votingStartsAt };
    case "voting": return { label: copy.votingCloses, timestamp: proposal.timing.votingEndsAt };
    case "awaiting-execution": return { label: copy.executeBefore, timestamp: proposal.timing.expiresAt };
    case "expired": return { label: copy.expiredAt, timestamp: proposal.timing.expiresAt };
    case "executed": return { label: copy.phases.executed, timestamp: proposal.timing.executedAt ?? null };
    case "failed": return { label: copy.votingClosed, timestamp: proposal.timing.votingEndsAt };
    case "retracted": return { label: copy.phases.retracted, timestamp: null };
  }
}

function getTimelineRows(proposal: YbcProposalRecord): TimelineStep[] {
  const copy = ybcCopy.proposal;
  const phase = proposal.phase;
  const stopped = phase === "retracted";
  const beforeVote = phase === "discussion";
  const voting = phase === "voting";
  const awaiting = phase === "awaiting-execution";
  const failed = phase === "failed";
  const row = (id: string, label: string, timestamp: number, status: TimelineStep["status"]): TimelineStep => ({
    id, label, description: formatUtcDateTime(timestamp), status,
  });
  return [
    row("discussion", copy.discussionOpens, proposal.timing.discussionStartsAt, beforeVote ? "current" : "complete"),
    row("voting-opens", copy.votingOpens, proposal.timing.votingStartsAt, stopped ? "blocked" : beforeVote ? "upcoming" : "complete"),
    row("voting-closes", copy.votingCloses, proposal.timing.votingEndsAt, stopped ? "blocked" : beforeVote ? "upcoming" : voting ? "current" : "complete"),
    row("execution-opens", copy.executionOpens, proposal.timing.executionOpensAt, stopped || failed ? "blocked" : awaiting ? "current" : beforeVote || voting ? "upcoming" : "complete"),
    row("expires", copy.executionExpires, proposal.timing.expiresAt, ["expired", "executed", "failed", "retracted"].includes(phase) ? "blocked" : "upcoming"),
    ...(proposal.timing.executedAt ? [row("executed", copy.phases.executed, proposal.timing.executedAt, "complete")] : []),
  ];
}
